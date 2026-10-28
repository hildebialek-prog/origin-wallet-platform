import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/services/apiClient";
import type { VirtualAccountOperationProjection, VirtualAccount } from "@/services/providerAccountService";
import { VirtualAccountLifecycle } from "./virtualAccountLifecycle";
import { blocksAssignment, operationDescription, VirtualAccountOperationStore } from "./virtualAccountOperation";
import { eligibleIntegration, operationContext, operationPage, serverOperation, sharedTestLocks, vaRequest, virtualAccount } from "@/test/virtualAccountFixtures";

const api = vi.hoisted(() => ({ getProviderAccountOperations: vi.fn(), getProviderIntegrations: vi.fn(), getVirtualAccounts: vi.fn(), requestVirtualAccount: vi.fn() }));
vi.mock("@/services/providerAccountService", async (original) => ({ ...await original<typeof import("@/services/providerAccountService")>(), ...api }));

describe("VA create, discovery and recovery", () => {
  let operations: VirtualAccountOperationProjection[];
  let accounts: VirtualAccount[];
  const makeStore = (id = "operation-one", locks = sharedTestLocks()) => new VirtualAccountOperationStore(() => localStorage, () => locks, () => id);
  const lifecycle = (store = makeStore(), timeout = 30000) => new VirtualAccountLifecycle(operationContext, "not-persisted-token", store, () => sessionStorage, timeout);
  const respond = (status: VirtualAccountOperationProjection["status"], legacy = false) => {
    api.requestVirtualAccount.mockImplementation(async () => {
      const operation = serverOperation({ status, ...(status === "assigned" ? { virtual_account_id: 87, provider_payment_id: "VA-ONE" } : legacy ? { virtual_account_id: 87 } : {}) });
      operations = [operation];
      accounts = status === "assigned" ? [virtualAccount({ enrichment: { status: "pending", next_attempt_at: "2026-10-28T00:01:00Z", updated_at: null } })]
        : legacy ? [virtualAccount({ status: "pending", provider_payment_id: null })] : [];
      return { operation_id: operation.operation_id, operation, virtual_account: accounts[0] ?? null };
    });
  };

  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); vi.clearAllMocks();
    operations = []; accounts = [];
    api.getProviderAccountOperations.mockImplementation(async (params) => operationPage(operations.filter((operation) =>
      (!params.unresolvedOnly || operation.status !== "assigned")
      && (!params.operationId || operation.operation_id === params.operationId)
      && (!params.providerAccountId || operation.provider_account_id === params.providerAccountId))));
    api.getProviderIntegrations.mockResolvedValue([eligibleIntegration()]);
    api.getVirtualAccounts.mockImplementation(async () => accounts);
    respond("pending");
  });

  it("retains the saved operation for a 202 shape with nullable VA", async () => {
    const engine = lifecycle();
    const result = await engine.submit(vaRequest, 7);
    expect(result).toMatchObject({ operationId: "operation-one", providerAccountId: 7, server: { status: "pending" }, virtualAccountId: null });
    expect(engine.blocked).toBe(true);
    expect(api.requestVirtualAccount).toHaveBeenCalledWith(expect.objectContaining({ operationId: "operation-one", expectedProviderAccountId: 7 }));
    expect((await makeStore().read(operationContext)).operations).toHaveLength(1);
  });

  it.each(["allocation_paused", "allocation_testing_only", "allocation_production_disabled", "allocation_cutover_required", undefined])(
    "blocks new allocation for %s before reserving a key and still permits GET refresh", async (reason) => {
      api.getProviderIntegrations.mockResolvedValue([{ ...eligibleIntegration(), virtual_account_allocation_reason: reason }]);
      const engine = lifecycle();
      await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/New virtual account requests/);
      expect((await makeStore().read(operationContext)).operations).toEqual([]);
      expect(api.requestVirtualAccount).not.toHaveBeenCalled();
      await engine.refresh();
      expect(api.getProviderAccountOperations).toHaveBeenCalled();
      expect(api.getVirtualAccounts).toHaveBeenCalled();
    },
  );

  it("returns retained pending state through GET recovery while allocation is paused", async () => {
    operations = [serverOperation()];
    api.getProviderIntegrations.mockResolvedValue([{ ...eligibleIntegration(), virtual_account_allocation_reason: "allocation_paused" }]);
    const engine = lifecycle();
    const saved = await engine.submit(vaRequest, 7);
    expect(saved.operationId).toBe("operation-one");
    expect(saved.server.status).toBe("pending");
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
    expect(engine.state.scope.operations).toHaveLength(1);
  });

  it("does not treat a legacy 201 pending VA as assigned", async () => {
    respond("pending", true);
    const engine = lifecycle();
    const operation = await engine.submit(vaRequest, 7);
    expect(operation.server.status).toBe("pending");
    expect(engine.state.accounts[0].status).toBe("pending");
    expect(operationDescription(operation)).toMatch(/Assignment pending/);
    expect(engine.blocked).toBe(true);
  });

  it("refreshes assigned VAs and enrichment independently without another POST", async () => {
    respond("assigned");
    const engine = lifecycle();
    await engine.submit(vaRequest, 7);
    expect(engine.state.accounts[0].enrichment.status).toBe("pending");
    accounts = [virtualAccount({ enrichment: { status: "complete", next_attempt_at: null, updated_at: "2026-10-28T00:01:00Z" } })];
    await engine.refresh();
    expect(engine.state.accounts[0].enrichment.status).toBe("complete");
    expect(engine.state.scope.operations[0].server.status).toBe("assigned");
    expect(api.requestVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it("retains a legacy response without an operation projection instead of fabricating assignment", async () => {
    accounts = [virtualAccount({ status: "pending", provider_payment_id: null })];
    api.requestVirtualAccount.mockResolvedValue({ operation_id: "operation-one", virtual_account: accounts[0] });
    const engine = lifecycle();
    const operation = await engine.submit(vaRequest, 7);
    expect(operation).toMatchObject({ server: null, virtualAccountId: 87, submission: "acknowledged" });
    expect(engine.blocked).toBe(true);
  });

  it.each(["unknown", "manual_review", "preflight_failed", "claimed", "submitting"] as const)("keeps %s unresolved through reload and GET recovery", async (status) => {
    operations = [serverOperation({ status })];
    const engine = lifecycle();
    await engine.refresh();
    const reloaded = lifecycle();
    await reloaded.refresh();
    expect(reloaded.state.scope.operations[0].server.status).toBe(status);
    expect(reloaded.blocked).toBe(true);
    await reloaded.submit(vaRequest, 7);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("retains generic failed operations without granting retry or claiming rejection", async () => {
    operations = [serverOperation({ status: "failed" })];
    const engine = lifecycle();
    const operation = await engine.submit(vaRequest, 7);
    expect(operationDescription(operation)).toMatch(/Provider rejection is not established/);
    expect(blocksAssignment(operation)).toBe(true);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("retains network-loss intent even when a later exact GET finds no operation", async () => {
    api.requestVirtualAccount.mockRejectedValue(new ApiRequestError("Connection lost", 0));
    const engine = lifecycle();
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow("Connection lost");
    const reloaded = lifecycle();
    await reloaded.refresh();
    expect(reloaded.state.scope.operations[0]).toMatchObject({ submission: "uncertain", server: null, request: vaRequest });
    expect(api.getProviderAccountOperations).toHaveBeenCalledWith(expect.objectContaining({ providerAccountId: 7, operationId: "operation-one" }));
    await reloaded.submit(vaRequest, 7);
    expect(api.requestVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it("persists before dispatch and handles a deadline with no replacement key", async () => {
    api.requestVirtualAccount.mockImplementation(async () => {
      expect((await makeStore().read(operationContext)).operations[0].submission).toBe("dispatching");
      return new Promise(() => {});
    });
    const engine = lifecycle(makeStore(), 5);
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/timed out/);
    expect(engine.state.scope.operations[0].submission).toBe("uncertain");
    await engine.refresh();
    expect(api.requestVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it.each([
    [409, "account_mismatch", false], [422, "rejected", false], [401, "auth_blocked", true], [403, "auth_blocked", true],
  ] as const)("preserves intent after HTTP %s and blocks further assignment", async (status, submission, paused) => {
    api.requestVirtualAccount.mockRejectedValue(new ApiRequestError("Request requires review", status, undefined,
      status === 409 ? { code: "PROVIDER_ACCOUNT_MISMATCH" } : null));
    const engine = lifecycle();
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow();
    expect(engine.state.scope.operations[0].submission).toBe(submission);
    expect(engine.state.authorizationPaused).toBe(paused);
    const reads = api.getProviderAccountOperations.mock.calls.length;
    await engine.refresh();
    if (paused) expect(api.getProviderAccountOperations).toHaveBeenCalledTimes(reads);
    expect(engine.blocked).toBe(true);
    expect(api.requestVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it("blocks POST when durable persistence cannot be established", async () => {
    const engine = lifecycle(new VirtualAccountOperationStore(() => { throw new Error("Denied"); }, () => sharedTestLocks()));
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/shared request storage/);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("does not POST when storage becomes full at the reservation write after successful discovery", async () => {
    const storage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => {
        if (JSON.parse(value).operations.length) throw new Error("Quota exceeded");
        localStorage.setItem(key, value);
      },
    } as Storage;
    const store = new VirtualAccountOperationStore(() => storage, () => sharedTestLocks(), () => "operation-one");
    const engine = lifecycle(store);
    await engine.refresh();
    expect(engine.state.ready).toBe(true);
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/shared request storage/);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
    expect((await store.read(operationContext)).operations).toEqual([]);
  });

  it("does not dispatch if the page or signed-in session changes during preflight", async () => {
    let finishEligibility: (value: ReturnType<typeof eligibleIntegration>[]) => void;
    api.getProviderIntegrations.mockImplementation(() => new Promise((resolve) => { finishEligibility = resolve; }));
    const engine = lifecycle();
    const submission = engine.submit(vaRequest, 7);
    // Await entry into the deferred preflight without executing timers or making requests.
    await vi.waitFor(() => expect(api.getProviderIntegrations).toHaveBeenCalledTimes(1));
    engine.setActive(false);
    finishEligibility([eligibleIntegration()]);
    await expect(submission).rejects.toThrow(/signed-in page changed/);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
    expect((await makeStore().read(operationContext)).operations).toEqual([]);
  });

  it("permits only one POST across concurrent tabs, including a fast terminal response", async () => {
    respond("assigned");
    const locks = sharedTestLocks();
    const first = lifecycle(makeStore("operation-one", locks));
    const second = lifecycle(makeStore("operation-two", locks));
    await Promise.all([first.refresh(), second.refresh()]);
    const results = await Promise.all([first.submit(vaRequest, 7), second.submit(vaRequest, 7), first.submit(vaRequest, 7)]);
    expect(new Set(results.map((item) => item.operationId)).size).toBe(1);
    expect(api.requestVirtualAccount).toHaveBeenCalledTimes(1);
  });

  it("walks decreasing cursors and rejects foreign-account operation identities", async () => {
    api.getProviderAccountOperations.mockResolvedValueOnce(operationPage([serverOperation()], 100))
      .mockResolvedValueOnce(operationPage([serverOperation({ operation_id: "second-key" })]));
    const engine = lifecycle();
    await engine.refresh();
    expect(engine.state.scope.operations).toHaveLength(2);
    expect(api.getProviderAccountOperations).toHaveBeenNthCalledWith(2, expect.objectContaining({ beforeId: 100 }));
    api.getProviderAccountOperations.mockResolvedValue(operationPage([serverOperation({ provider_account_id: 8 })]));
    await engine.refresh();
    expect(engine.state.ready).toBe(false);
    expect(engine.state.error).toMatch(/ownership/);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("blocks new assignment when bounded discovery cannot reach the final page", async () => {
    let cursor = 1000;
    api.getProviderAccountOperations.mockImplementation(async () => operationPage([], --cursor));
    const engine = lifecycle();
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/safety limit/);
    expect(api.getProviderAccountOperations).toHaveBeenCalledTimes(20);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("suspends polling on GET authorization failures without invoking POST", async () => {
    api.getProviderAccountOperations.mockRejectedValue(new ApiRequestError("Forbidden", 403));
    const engine = lifecycle();
    await engine.refresh();
    await engine.refresh();
    expect(engine.state.authorizationPaused).toBe(true);
    expect(api.getProviderAccountOperations).toHaveBeenCalledTimes(1);
    expect(api.getVirtualAccounts).not.toHaveBeenCalled();
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("can read legacy VAs despite unavailable coordination, while assignment stays blocked", async () => {
    accounts = [virtualAccount({ enrichment: undefined })];
    const engine = lifecycle(new VirtualAccountOperationStore(() => localStorage, () => undefined));
    await engine.refresh();
    expect(engine.state.accounts[0].id).toBe(87);
    expect(engine.blocked).toBe(true);
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });

  it("does not rebind older session tracking or issue POST on recovery", async () => {
    sessionStorage.setItem("origin-wallet:virtual-account-operation:41", JSON.stringify({ version: 1, operationId: "old-key", request: vaRequest }));
    const engine = lifecycle();
    await engine.refresh();
    await expect(engine.submit(vaRequest, 7)).rejects.toThrow(/earlier request/);
    expect(engine.state.scope.legacy[0].operationId).toBe("old-key");
    expect(api.requestVirtualAccount).not.toHaveBeenCalled();
  });
});
