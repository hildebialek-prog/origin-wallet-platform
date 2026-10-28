import { ApiRequestError } from "@/services/apiClient";
import {
  getProviderAccountOperations, getProviderIntegrations, getVirtualAccounts, requestVirtualAccount,
  type VirtualAccount, type VirtualAccountCategory, type VirtualAccountType,
  type VirtualAccountOperationProjection,
} from "@/services/providerAccountService";
import {
  blocksAssignment, operationIdentity, safeProjection, validateVirtualAccountRequest,
  VirtualAccountOperationStore, type OperationContext, type OperationScope,
  type VirtualAccountOperation, type VirtualAccountRequestSnapshot,
} from "@/lib/virtualAccountOperation";

export const POLL_DELAYS = [2000, 4000, 8000, 15000, 30000, 60000, 60000, 60000];
export const isAuthorizationError = (error: unknown) => error instanceof ApiRequestError && [401, 403].includes(error.status);

export interface LifecycleState {
  scope: OperationScope | null;
  accounts: VirtualAccount[];
  providerAccountId: number | null;
  ready: boolean;
  checking: boolean;
  submitting: boolean;
  authorizationPaused: boolean;
  error: string;
}

const deadline = async <T>(promise: Promise<T>, milliseconds: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Status or submission timed out. The saved intent remains unresolved.")), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
};

export class VirtualAccountLifecycle {
  state: LifecycleState = {
    scope: null, accounts: [], providerAccountId: null, ready: false,
    checking: false, submitting: false, authorizationPaused: false, error: "",
  };
  private listeners = new Set<() => void>();
  private refreshFlight: Promise<void> | null = null;
  private submitFlight: Promise<VirtualAccountOperation> | null = null;
  private active = true;

  constructor(
    readonly context: OperationContext,
    private readonly token: string,
    readonly store = new VirtualAccountOperationStore(),
    private readonly session: () => Storage = () => window.sessionStorage,
    private readonly timeoutMs = 30000,
  ) {}

  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  setActive(active: boolean) { this.active = active; }
  private emit(patch: Partial<LifecycleState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private get auth() { return { userId: this.context.userId, token: this.token, providerCode: this.context.providerCode }; }

  get blocked() {
    return !this.state.ready || this.state.authorizationPaused || !!this.state.error
      || !!this.state.scope?.legacy.length || this.state.scope?.operations.some(blocksAssignment);
  }
  get needsPolling() {
    return !this.state.authorizationPaused && (!!this.state.error || this.state.scope?.operations.some(blocksAssignment)
      || this.state.accounts.some((va) => va.status === "pending" || ["pending", "running"].includes(va.enrichment?.status)));
  }

  refresh(manual = false): Promise<void> {
    if (this.state.authorizationPaused && !manual) return Promise.resolve();
    if (this.refreshFlight) return this.refreshFlight;
    this.refreshFlight = this.readStatus(manual).finally(() => { this.refreshFlight = null; });
    return this.refreshFlight;
  }

  private async readStatus(manual: boolean): Promise<void> {
    this.emit({ checking: true, ...(manual ? { authorizationPaused: false } : {}) });
    try {
      await this.store.migrateLegacy(this.context, this.session());
      const local = await this.store.read(this.context);
      this.emit({ scope: local });
      const discovered = new Map<string, VirtualAccountOperationProjection>();
      let beforeId: number | undefined;
      let accountId: number | null | undefined;
      let complete = false;
      // At most 20 pages (1,000 unresolved rows). Incomplete discovery blocks POST.
      for (let page = 0; page < 20; page++) {
        const response = await deadline(getProviderAccountOperations({ ...this.auth, unresolvedOnly: true, beforeId }), this.timeoutMs);
        if (!Array.isArray(response.virtual_account_operations) || !response.virtual_account_operations_pagination) {
          throw new Error("Operation discovery is unavailable. Assignment is blocked.");
        }
        const selectedId = response.provider_account?.id ?? null;
        if (selectedId !== null && (!Number.isSafeInteger(selectedId) || selectedId < 1)) throw new Error("Invalid provider account identity.");
        if (accountId !== undefined && accountId !== selectedId) throw new Error("Provider account identity changed during discovery.");
        accountId = selectedId;
        for (const operation of response.virtual_account_operations) {
          safeProjection(operation);
          // No invented historical account rows: reject any response violating this schema.
          if (operation.provider_account_id !== accountId) throw new Error("Operation ownership could not be verified.");
          discovered.set(operationIdentity(operation.provider_account_id, operation.operation_id), operation);
        }
        const pagination = response.virtual_account_operations_pagination;
        if (pagination.has_more === false) { complete = true; break; }
        const next = pagination.next_before_id;
        if (!Number.isSafeInteger(next) || next < 1 || (beforeId !== undefined && next >= beforeId)) {
          throw new Error("Operation pagination could not be verified.");
        }
        beforeId = next;
      }
      // The unresolved listing excludes assigned/enrolled terminal rows. Look up saved
      // unresolved intents explicitly; a missing result NEVER releases their reservation.
      for (const operation of local.operations.filter(blocksAssignment)) {
        const key = operationIdentity(operation.providerAccountId, operation.operationId);
        if (discovered.has(key)) continue;
        const response = await deadline(getProviderAccountOperations({ ...this.auth,
          providerAccountId: operation.providerAccountId, operationId: operation.operationId,
        }), this.timeoutMs);
        if (!Array.isArray(response.virtual_account_operations)) throw new Error("Saved operation status is unavailable.");
        for (const found of response.virtual_account_operations) {
          safeProjection(found);
          if (operationIdentity(found.provider_account_id, found.operation_id) !== key) throw new Error("Saved operation identity changed.");
          discovered.set(key, found);
        }
      }
      await this.store.update(this.context, (current) => {
        for (const found of discovered.values()) {
          const key = operationIdentity(found.provider_account_id, found.operation_id);
          let operation = current.operations.find((item) => operationIdentity(item.providerAccountId, item.operationId) === key);
          if (!operation) {
            operation = { providerAccountId: found.provider_account_id, operationId: found.operation_id,
              request: null, submission: "discovered", server: null, virtualAccountId: null };
            current.operations.push(operation);
          }
          if (operation.request && operation.request.currency !== found.currency) throw new Error("Operation parameters changed");
          // Preserve mismatch blocks and never downgrade a terminal assignment on a stale read.
          if (operation.server?.status !== "assigned" || found.status === "assigned") {
            operation.server = safeProjection(found);
            operation.virtualAccountId = found.virtual_account_id;
          }
        }
      });
      const scope = await this.store.read(this.context);
      this.emit({ scope, providerAccountId: accountId ?? null });
      const accounts = await deadline(getVirtualAccounts({ ...this.auth,
        ...(accountId ? { providerAccountId: accountId } : {}),
      }), this.timeoutMs);
      this.emit({ accounts, ready: complete, error: complete ? "" : "Discovery reached its safety limit. No new assignment can be sent; contact support to review retained operations." });
    } catch (error) {
      this.emit({ ready: false, authorizationPaused: isAuthorizationError(error),
        error: error instanceof Error ? error.message : "Unable to check saved requests." });
      // Coordination/persistence failure blocks assignment, but existing VAs can still
      // be read. This path has no reservation or POST authority and saves no bank data.
      if (!isAuthorizationError(error)) {
        try {
          const accounts = await deadline(getVirtualAccounts(this.auth), this.timeoutMs);
          this.emit({ accounts });
        } catch (readError) {
          if (isAuthorizationError(readError)) this.emit({ authorizationPaused: true,
            error: readError instanceof Error ? readError.message : "Authorization required." });
        }
      }
    } finally { this.emit({ checking: false }); }
  }

  submit(request: VirtualAccountRequestSnapshot, expectedAccountId: number): Promise<VirtualAccountOperation> {
    if (this.submitFlight) return this.submitFlight;
    this.submitFlight = this.create(request, expectedAccountId).finally(() => { this.submitFlight = null; });
    return this.submitFlight;
  }

  private async create(request: VirtualAccountRequestSnapshot, expectedAccountId: number): Promise<VirtualAccountOperation> {
    validateVirtualAccountRequest(request);
    if (this.state.authorizationPaused) throw new Error("Sign in with the authorized account before checking this request.");
    this.emit({ submitting: true });
    let reserved: VirtualAccountOperation | null = null;
    try {
      const generation = this.state.scope?.generation ?? (await this.store.read(this.context)).generation;
      await this.refresh();
      if (!this.state.ready || this.state.error || this.state.authorizationPaused) throw new Error(this.state.error || "Operation discovery must complete before assignment.");
      if (this.state.scope.legacy.length) throw new Error("An earlier request lacks verified API/account identity. Review it with support before another assignment.");
      const existing = this.state.scope.operations.find(blocksAssignment);
      if (existing) return existing; // Resume by GET, even when account eligibility has changed.
      const integrations = await deadline(getProviderIntegrations(this.auth), this.timeoutMs);
      const integration = integrations.find((item) => item.provider.code.toLowerCase() === this.context.providerCode);
      if (this.state.providerAccountId !== expectedAccountId || integration?.provider_account?.id !== expectedAccountId) {
        throw new Error("The selected provider account changed. Refresh and review its saved requests.");
      }
      if (!integration.can_request_virtual_account) throw new Error("This provider account is not eligible for virtual account requests yet.");
      if (!this.active) throw new Error("The signed-in page changed. Check saved requests before continuing.");
      // This exclusive Web Lock transaction commits the intent before the sole POST site.
      const reservation = await this.store.reserve(this.context, expectedAccountId, request, generation);
      this.emit({ scope: await this.store.read(this.context) });
      if (!reservation.created) return reservation.operation;
      reserved = reservation.operation;
      if (!this.active) throw new Error("The signed-in page changed. The saved request needs status verification.");
      const response = await deadline(requestVirtualAccount({ ...this.auth,
        currency: reserved.request.currency, accountCategory: reserved.request.accountCategory as VirtualAccountCategory,
        accountType: reserved.request.accountType as VirtualAccountType,
        operationId: reserved.operationId, expectedProviderAccountId: reserved.providerAccountId,
      }), this.timeoutMs);
      if (response.operation_id !== reserved.operationId) throw new Error("The assignment response identity could not be verified.");
      if (response.operation) {
        safeProjection(response.operation);
        if (response.operation.operation_id !== reserved.operationId || response.operation.provider_account_id !== reserved.providerAccountId
          || response.operation.currency !== reserved.request.currency) throw new Error("The assignment response identity could not be verified.");
      }
      if (response.virtual_account && (response.virtual_account.user_provider_account_id !== reserved.providerAccountId
        || !Number.isSafeInteger(response.virtual_account.id) || response.virtual_account.id < 1)) {
        throw new Error("The returned virtual account identity could not be verified.");
      }
      await this.store.update(this.context, (current) => {
        const operation = current.operations.find((item) => operationIdentity(item.providerAccountId, item.operationId)
          === operationIdentity(reserved.providerAccountId, reserved.operationId));
        if (!operation) throw new Error("Saved intent missing");
        operation.submission = "acknowledged";
        if (response.operation && (operation.server?.status !== "assigned" || response.operation.status === "assigned")) {
          operation.server = safeProjection(response.operation);
          operation.virtualAccountId = response.operation.virtual_account_id;
        }
        if (!response.operation && response.virtual_account) operation.virtualAccountId = response.virtual_account.id;
        // A 201/legacy pending VA does not prove assignment. No VA/bank object is saved.
      });
      const scope = await this.store.read(this.context);
      this.emit({ scope, error: "" });
      await this.refresh(); // GET only; refreshes the VA list and enrichment separately.
      return this.state.scope.operations.find((item) => operationIdentity(item.providerAccountId, item.operationId)
        === operationIdentity(reserved.providerAccountId, reserved.operationId));
    } catch (error) {
      if (reserved) {
        try {
          await this.store.update(this.context, (current) => {
            const operation = current.operations.find((item) => operationIdentity(item.providerAccountId, item.operationId)
              === operationIdentity(reserved.providerAccountId, reserved.operationId));
            if (operation) operation.submission = error instanceof ApiRequestError && error.status === 409 && error.payload?.code === "PROVIDER_ACCOUNT_MISMATCH"
              ? "account_mismatch" : isAuthorizationError(error) ? "auth_blocked"
                : error instanceof ApiRequestError && error.status === 422 ? "rejected" : "uncertain";
          });
          const scope = await this.store.read(this.context);
          this.emit({ scope });
        } catch { /* The pre-dispatch durable reservation remains; never retry POST. */ }
      }
      this.emit({ error: error instanceof Error ? error.message : "Assignment outcome requires verification.",
        authorizationPaused: this.state.authorizationPaused || isAuthorizationError(error) });
      throw error;
    } finally { this.emit({ submitting: false }); }
  }
}
