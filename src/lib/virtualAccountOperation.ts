import type { VirtualAccountOperationProjection } from "@/services/providerAccountService";

export interface VirtualAccountRequestSnapshot {
  providerCode: string;
  currency: string;
  accountCategory: string;
  accountType: string;
}

export interface OperationContext {
  environment: string;
  userId: string;
  providerCode: string;
}

export interface VirtualAccountOperation {
  providerAccountId: number;
  operationId: string;
  request: VirtualAccountRequestSnapshot | null;
  submission: "dispatching" | "acknowledged" | "uncertain" | "account_mismatch" | "rejected" | "auth_blocked" | "discovered";
  server: Omit<VirtualAccountOperationProjection, "provider_payment_id"> | null;
  virtualAccountId: number | null;
}

export interface LegacyOperation {
  sourceKey: string;
  operationId: string | null;
  request: VirtualAccountRequestSnapshot | null;
}

export interface OperationScope extends OperationContext {
  version: 2;
  generation: number;
  operations: VirtualAccountOperation[];
  legacy: LegacyOperation[];
}

export const operationIdentity = (accountId: number, key: string) => JSON.stringify([accountId, key]);
export const scopeStorageKey = (context: OperationContext) =>
  `origin-wallet:va-lifecycle:v2:${JSON.stringify([context.environment, context.userId, context.providerCode])}`;

export const blocksAssignment = (operation: VirtualAccountOperation) =>
  operation.submission === "account_mismatch" || operation.server?.status !== "assigned";

export function validateVirtualAccountRequest(request: VirtualAccountRequestSnapshot): void {
  if (request.providerCode !== "nium" || !/^[A-Z]{3}$/.test(request.currency)
    || !["SELF_FUNDING_ACCOUNT", "COLLECTION_ACCOUNT", "SELF_FUNDING_AND_COLLECTION_ACCOUNT"].includes(request.accountCategory)
    || !["LOCAL", "WIRES", "LOCAL_AND_WIRES"].includes(request.accountType)) {
    throw new Error("Choose valid virtual account request parameters.");
  }
}

export const safeRequest = (value: unknown): VirtualAccountRequestSnapshot | null => {
  if (!value || typeof value !== "object") return null;
  const input = value as VirtualAccountRequestSnapshot;
  try { validateVirtualAccountRequest(input); } catch { return null; }
  return { providerCode: input.providerCode, currency: input.currency, accountCategory: input.accountCategory, accountType: input.accountType };
};

// Whitelist persistence fields; never persist a response/VA object, token or bank details.
export function safeProjection(value: VirtualAccountOperationProjection): Omit<VirtualAccountOperationProjection, "provider_payment_id"> {
  if (!value || !Number.isSafeInteger(value.provider_account_id) || value.provider_account_id < 1
    || typeof value.operation_id !== "string" || !value.operation_id || value.operation_id.length > 255
    || !["claimed", "submitting", "preflight_failed", "pending", "unknown", "manual_review", "failed", "assigned"].includes(value.status)
    || typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency)
    || !(value.provider_payment_id === null || typeof value.provider_payment_id === "string")
    || !(value.virtual_account_id === null || (Number.isSafeInteger(value.virtual_account_id) && value.virtual_account_id > 0))
    || !(value.updated_at === null || typeof value.updated_at === "string")) {
    throw new Error("Operation status could not be verified. Assignment is blocked.");
  }
  return {
    operation_id: value.operation_id, provider_account_id: value.provider_account_id,
    status: value.status, currency: value.currency,
    virtual_account_id: value.virtual_account_id, updated_at: value.updated_at,
  };
}

const emptyScope = (context: OperationContext): OperationScope => ({ ...context, version: 2, generation: 0, operations: [], legacy: [] });
// Records contain JSON data only, matching the durable representation exactly.
const copyRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export class VirtualAccountOperationStore {
  constructor(
    private readonly getStorage: () => Storage = () => window.localStorage,
    private readonly getLocks: () => Pick<LockManager, "request"> = () => navigator.locks,
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async update<T>(context: OperationContext, change: (scope: OperationScope) => T): Promise<T> {
    if (!context.environment || !context.userId || context.providerCode !== "nium") {
      throw new Error("The API environment and account identity must be available before assignment.");
    }
    try {
      const locks = this.getLocks();
      if (!locks?.request) throw new Error("Web Locks unavailable");
      const key = scopeStorageKey(context);
      return await locks.request(key, { mode: "exclusive" }, () => {
        const storage = this.getStorage();
        const original = storage.getItem(key);
        const scope: OperationScope = original === null ? emptyScope(context) : JSON.parse(original);
        // Corruption/unknown versions block assignment; never replace them with an empty record.
        if (scope.version !== 2 || scope.environment !== context.environment || scope.userId !== context.userId
          || scope.providerCode !== context.providerCode || !Number.isSafeInteger(scope.generation) || scope.generation < 0
          || !Array.isArray(scope.operations) || !Array.isArray(scope.legacy)) {
          throw new Error("Saved operation data is unreadable");
        }
        for (const operation of scope.operations) {
          if (!Number.isSafeInteger(operation.providerAccountId) || operation.providerAccountId < 1
            || typeof operation.operationId !== "string" || !operation.operationId
            || !["dispatching", "acknowledged", "uncertain", "account_mismatch", "rejected", "auth_blocked", "discovered"].includes(operation.submission)
            || (operation.request !== null && !safeRequest(operation.request))) throw new Error("Invalid saved operation");
          if (operation.server) {
            const server = safeProjection({ ...operation.server, provider_payment_id: null });
            if (server.provider_account_id !== operation.providerAccountId || server.operation_id !== operation.operationId) {
              throw new Error("Saved operation identity mismatch");
            }
          }
        }
        for (const legacy of scope.legacy) {
          if (!legacy || typeof legacy.sourceKey !== "string"
            || !(legacy.operationId === null || typeof legacy.operationId === "string")
            || (legacy.request !== null && !safeRequest(legacy.request))) throw new Error("Invalid legacy marker");
        }
        const result = change(scope);
        const serialized = JSON.stringify(scope);
        if (serialized !== original) storage.setItem(key, serialized);
        // A failed/no-op persistence implementation cannot authorize HTTP.
        if (storage.getItem(key) !== serialized) throw new Error("Persistence was not confirmed");
        return result;
      });
    } catch {
      throw new Error("Reliable shared request storage is unavailable. No new assignment can be sent. Keep saved requests and contact support if this continues.");
    }
  }

  read(context: OperationContext) { return this.update(context, (scope) => copyRecord(scope)); }

  reserve(context: OperationContext, accountId: number, request: VirtualAccountRequestSnapshot, expectedGeneration: number) {
    validateVirtualAccountRequest(request);
    if (!Number.isSafeInteger(accountId) || accountId < 1) return Promise.reject(new Error("Provider account identity is required."));
    return this.update(context, (scope) => {
      const existing = scope.operations.find(blocksAssignment);
      if (scope.legacy.length) throw new Error("An earlier request needs investigation before another assignment.");
      if (existing) return { created: false, operation: copyRecord(existing) };
      // A concurrently completed assignment also wins over a stale tab's click.
      if (scope.generation !== expectedGeneration) {
        const latest = scope.operations[scope.operations.length - 1];
        if (!latest) throw new Error("Reservation changed");
        return { created: false, operation: copyRecord(latest) };
      }
      const operationId = this.createId();
      if (!/^[A-Za-z0-9._:-]{1,100}$/.test(operationId)) throw new Error("Invalid operation key");
      if (scope.operations.some((item) => item.providerAccountId === accountId && item.operationId === operationId)) {
        throw new Error("Operation key already reserved");
      }
      const operation: VirtualAccountOperation = {
        providerAccountId: accountId, operationId, request: safeRequest(request),
        submission: "dispatching", server: null, virtualAccountId: null,
      };
      scope.operations.push(operation);
      scope.generation++;
      // Only the caller receiving created=true may POST, after this durable write.
      // A closed tab releases the Web Lock, but the record NEVER expires/re-authorizes POST.
      return { created: true, operation: copyRecord(operation) };
    });
  }

  async migrateLegacy(context: OperationContext, session: Storage): Promise<void> {
    const legacy: LegacyOperation[] = [];
    for (const sourceKey of [`origin-wallet:virtual-account-operation:${context.userId}`, "origin-wallet:virtual-account-operation"]) {
      const raw = session.getItem(sourceKey);
      if (!raw) continue;
      let operationId: string | null = /^[A-Za-z0-9._:-]{1,255}$/.test(raw) ? raw : null;
      let request: VirtualAccountRequestSnapshot | null = null;
      try {
        const value = JSON.parse(raw);
        if (value.version === 1) {
          operationId = typeof value.operationId === "string" && /^[A-Za-z0-9._:-]{1,255}$/.test(value.operationId) ? value.operationId : null;
          request = safeRequest(value.request);
        }
      } catch { /* ID-only/unknown data is retained as an investigation marker. */ }
      legacy.push({ sourceKey, operationId, request });
    }
    if (legacy.length) await this.update(context, (scope) => {
      for (const item of legacy) if (!scope.legacy.some((old) => old.sourceKey === item.sourceKey)) scope.legacy.push(item);
    });
    // V1 has no API/account identity. Never bind it to today's account or delete it.
  }
}

export const operationDescription = (operation: VirtualAccountOperation) => {
  if (operation.submission === "account_mismatch") return "Account identity changed. Further assignment is blocked; review this request with support.";
  if (operation.server?.status === "assigned") return "Assigned. Banking details may still be updating.";
  if (operation.server?.status === "failed") return "Recorded as failed. Provider rejection is not established; investigation is required before another assignment.";
  if (operation.server?.status === "manual_review") return "Manual review required. This request remains unresolved.";
  if (operation.server?.status === "unknown") return "Assignment outcome unknown. Keep this request while its status is checked.";
  if (operation.server?.status === "preflight_failed") return "Preflight could not be completed. This saved request needs investigation.";
  if (operation.server?.status === "pending") return "Assignment pending. Check status without submitting another request.";
  if (operation.server?.status === "claimed") return "Request prepared. Assignment is not confirmed.";
  if (operation.server?.status === "submitting") return "Request submission recorded. Assignment is not confirmed.";
  if (operation.submission === "rejected") return "The request returned an error. Its assignment outcome still needs verification.";
  if (operation.submission === "auth_blocked") return "Sign in with the authorized account to check this saved request.";
  return "Saved request awaiting status verification. A missing server record does not prove that submission failed.";
};
