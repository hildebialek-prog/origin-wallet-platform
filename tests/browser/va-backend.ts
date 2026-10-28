import assert from "node:assert/strict";
import type { BrowserContext, Request, Route } from "@playwright/test";
import { API_BASE, API_PREFIX, TEST_ORIGIN } from "./test-origin.mjs";
import {
  ACCOUNT_ID, ACCOUNT_PATH, CREATE_PATH, FAKE_TOKEN, INTEGRATIONS_PATH, STORE_KEY, VA_ID, VA_LIST_PATH,
  integration, projection, provider, providerAccount, session, virtualAccount,
  type BrowserVA, type OperationStatus, type Projection, type SavedScope,
} from "./va-fixtures";

export type CreateMode = "pending" | "legacy" | "assigned" | "timeout" | "interrupted" | "mismatch" | "auth401" | "auth403";
export interface NetworkRecord {
  method: string;
  path: string;
  query: Record<string, string>;
  key: string | null;
  body: Record<string, unknown> | null;
  responseStatus?: number;
}
const deferred = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
};

export class VABackend {
  readonly requests: NetworkRecord[] = [];
  readonly issues: string[] = [];
  readonly persistedBeforePost: SavedScope[][] = [];
  readonly rows: { rowId: number; operation: Projection }[] = [];
  accounts: BrowserVA[] = [];
  createMode: CreateMode = "pending";
  lifecycleAuthStatus: 401 | 403 | null = null;
  offline = false;
  private sequence = 1;
  private stopped = false;
  private stopGate = deferred();
  private postGate: ReturnType<typeof deferred> | null = null;
  private preflightGate: { expected: number; arrived: number; gate: ReturnType<typeof deferred> } | null = null;
  private records = new Map<Request, NetworkRecord>();

  constructor(readonly context: BrowserContext) {}

  get assignments() { return this.requests.filter((request) => request.path === CREATE_PATH && request.method === "POST"); }
  get operationReads() { return this.requests.filter((request) => request.path === ACCOUNT_PATH && request.method === "GET"); }
  get lifecycleRequests() { return this.requests.filter((request) => [ACCOUNT_PATH, CREATE_PATH, VA_LIST_PATH].includes(request.path)); }

  async install() {
    // Record real browser Request events, independently of mocked response handlers.
    this.context.on("request", (request) => {
      if (request.url().startsWith(`${API_BASE}/`)) this.record(request);
      else if (new URL(request.url()).origin !== TEST_ORIGIN) this.issues.push(`External request blocked: ${request.method()} ${request.url()}`);
    });
    this.context.on("response", (response) => {
      const record = this.records.get(response.request());
      if (record) record.responseStatus = response.status();
    });
    this.context.on("page", (page) => page.on("pageerror", (error) => this.issues.push(`Page error: ${error.message}`)));
    await this.context.exposeBinding("reportVaBrowserCspViolation", (_source, uri: string) => {
      this.issues.push(`CSP blocked an unexpected resource: ${uri}`);
    });
    await this.context.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        const report = (window as unknown as { reportVaBrowserCspViolation: (uri: string) => Promise<void> }).reportVaBrowserCspViolation;
        void report(event.blockedURI);
      });
    });
    await this.context.routeWebSocket(/.*/, (socket) => {
      const url = new URL(socket.url());
      // Vite 5's dev client connects even with server-side HMR disabled. Only
      // that exact loopback socket may connect; application/external sockets fail.
      if (url.origin === TEST_ORIGIN.replace(/^http/, "ws") && url.pathname === "/"
        && [...url.searchParams.keys()].every((key) => key === "token")) {
        socket.connectToServer();
        return;
      }
      this.issues.push(`Unexpected WebSocket blocked: ${socket.url()}`);
      socket.close();
    });
    await this.context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      try {
        if (url.origin !== TEST_ORIGIN) {
          this.issues.push(`External route blocked: ${request.method()} ${request.url()}`);
          await route.abort("blockedbyclient");
        } else if (url.pathname.startsWith(`${API_PREFIX}/`)) {
          await this.api(route, url);
        } else if (request.method() === "GET" && !["fetch", "xhr"].includes(request.resourceType())
          && (request.isNavigationRequest() && ["/", "/account/virtual-accounts", "/account/virtual-accounts/request"].includes(url.pathname)
            || /^\/(?:src\/|node_modules\/|@vite\/|@id\/|@fs\/|@react-refresh(?:$|\/)|logo\/|content\/|favicon\.)/.test(url.pathname))) {
          await route.continue();
        } else {
          this.issues.push(`Unexpected local request blocked: ${request.method()} ${url.pathname}`);
          await route.abort("blockedbyclient");
        }
      } catch (error) {
        if (!this.stopped) this.issues.push(`Mock handler failed: ${error instanceof Error ? error.message : String(error)}`);
        await route.abort("failed").catch(() => undefined);
      }
    });
  }

  private record(request: Request): NetworkRecord {
    const existing = this.records.get(request);
    if (existing) return existing;
    const url = new URL(request.url());
    let body: Record<string, unknown> | null = null;
    try { body = request.postData() ? request.postDataJSON() as Record<string, unknown> : null; }
    catch { this.issues.push(`Invalid JSON request: ${url.pathname}`); }
    const record: NetworkRecord = { method: request.method(), path: url.pathname.slice(API_PREFIX.length),
      query: Object.fromEntries(url.searchParams), key: request.headers()["idempotency-key"] ?? null, body };
    this.records.set(request, record);
    this.requests.push(record);
    return record;
  }

  private async json(route: Route, status: number, body: unknown) {
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  }

  private async api(route: Route, url: URL) {
    const request = route.request();
    const record = this.record(request);
    if (record.path !== "/providers") assert.equal(request.headers().authorization, `Bearer ${FAKE_TOKEN}`);
    if (this.offline) { await route.abort("internetdisconnected"); return; }
    if (record.path === "/auth/me" && record.method === "GET") {
      await this.json(route, 200, session);
    } else if (record.path === "/providers" && record.method === "GET") {
      await this.json(route, 200, { data: [provider] });
    } else if (record.path === INTEGRATIONS_PATH && record.method === "GET") {
      const barrier = this.preflightGate;
      if (barrier) {
        barrier.arrived++;
        if (barrier.arrived === barrier.expected) { this.preflightGate = null; barrier.gate.release(); }
        await Promise.race([barrier.gate.promise, this.stopGate.promise]);
        if (this.stopped) return;
      }
      await this.json(route, 200, { data: [integration] });
    } else if ([ACCOUNT_PATH, VA_LIST_PATH].includes(record.path) && record.method === "GET") {
      if (this.lifecycleAuthStatus) {
        await this.json(route, this.lifecycleAuthStatus, { message: "Fixture authorization required" });
        return;
      }
      if (record.path === VA_LIST_PATH) {
        assert.ok(!url.searchParams.has("provider_account_id") || url.searchParams.get("provider_account_id") === String(ACCOUNT_ID));
        await this.json(route, 200, { data: this.accounts });
      } else {
        const allowed = ["operations_before_id", "operations_unresolved_only", "provider_account_id", "operation_id"];
        for (const key of url.searchParams.keys()) assert.ok(allowed.includes(key), `Unexpected operation filter: ${key}`);
        const rows = this.rows.filter(({ rowId, operation }) =>
          (!url.searchParams.has("operations_before_id") || rowId < Number(url.searchParams.get("operations_before_id")))
          && (url.searchParams.get("operations_unresolved_only") !== "1" || operation.status !== "assigned")
          && (!url.searchParams.has("provider_account_id") || operation.provider_account_id === Number(url.searchParams.get("provider_account_id")))
          && (!url.searchParams.has("operation_id") || operation.operation_id === url.searchParams.get("operation_id")))
          .sort((a, b) => b.rowId - a.rowId);
        const page = rows.slice(0, 50);
        await this.json(route, 200, { provider, provider_account: providerAccount,
          virtual_account_operations: page.map((row) => row.operation),
          virtual_account_operations_pagination: { per_page: 50, has_more: rows.length > 50,
            next_before_id: rows.length > 50 ? page[page.length - 1].rowId : null } });
      }
    } else if (record.path === CREATE_PATH && record.method === "POST") {
      assert.match(record.key ?? "", /^[A-Za-z0-9._:-]{1,100}$/);
      assert.deepEqual(record.body, { currency: "USD", account_category: "SELF_FUNDING_ACCOUNT", account_type: "WIRES", expected_provider_account_id: ACCOUNT_ID });
      const saved = await Promise.all(this.context.pages().filter((page) => page.url().startsWith(TEST_ORIGIN))
        .map((page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as SavedScope | null, STORE_KEY)));
      assert.ok(saved.length);
      for (const scope of saved) {
        assert.ok(scope);
        assert.equal(scope.environment, API_BASE);
        assert.equal(scope.userId, "41");
        assert.equal(scope.providerCode, "nium");
        const operation = scope.operations.find((item) => item.providerAccountId === ACCOUNT_ID && item.operationId === record.key);
        assert.ok(operation, "Intent must exist in native storage before POST");
        assert.equal(operation.submission, "dispatching");
        assert.deepEqual(operation.request, { providerCode: "nium", currency: "USD", accountCategory: "SELF_FUNDING_ACCOUNT", accountType: "WIRES" });
        assert.ok(!JSON.stringify(scope).includes(FAKE_TOKEN));
        assert.ok(!JSON.stringify(scope).includes("provider_payment_id"));
      }
      this.persistedBeforePost.push(saved as SavedScope[]);
      if (this.postGate) await Promise.race([this.postGate.promise, this.stopGate.promise]);
      if (this.stopped) return;
      if (this.createMode === "timeout") { await this.stopGate.promise; return; }
      if (this.createMode === "interrupted") { await route.abort("connectionreset"); return; }
      if (this.createMode === "mismatch") {
        await this.json(route, 409, { code: "PROVIDER_ACCOUNT_MISMATCH", message: "Fixture provider account mismatch" });
        return;
      }
      if (this.createMode === "auth401" || this.createMode === "auth403") {
        await this.json(route, this.createMode === "auth401" ? 401 : 403, { message: "Fixture authorization required" });
        return;
      }
      const operation = this.setOperation(record.key!, this.createMode === "assigned" ? "assigned" : "pending");
      if (this.createMode === "legacy") {
        operation.virtual_account_id = VA_ID;
        this.accounts = [{ ...virtualAccount("pending", null), enrichment: null }];
      } else if (this.createMode === "assigned") this.accounts = [virtualAccount()];
      await this.json(route, this.createMode === "pending" ? 202 : 201,
        { operation_id: record.key, operation, virtual_account: this.accounts[0] ?? null });
    } else {
      this.issues.push(`Unexpected mock API request: ${record.method} ${record.path}`);
      await route.abort("blockedbyclient");
    }
  }

  setOperation(key: string, status: OperationStatus = "pending") {
    const value = projection(key, status);
    const existing = this.rows.find((row) => row.operation.operation_id === key && row.operation.provider_account_id === ACCOUNT_ID);
    if (existing) existing.operation = value;
    else this.rows.push({ rowId: this.sequence++, operation: value });
    return value;
  }

  synchronizeSubmissions(count: number) {
    this.preflightGate = { expected: count, arrived: 0, gate: deferred() };
  }
  holdNextPost() {
    assert.equal(this.postGate, null);
    this.postGate = deferred();
    return () => { this.postGate?.release(); };
  }
  async setOffline(offline: boolean) {
    this.offline = offline;
    await this.context.setOffline(offline);
  }
  dispose() {
    this.stopped = true;
    this.stopGate.release();
    this.postGate?.release();
    this.preflightGate?.gate.release();
  }
}
