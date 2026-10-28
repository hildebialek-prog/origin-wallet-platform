import { vi } from "vitest";
import type { OperationContext, VirtualAccountRequestSnapshot } from "@/lib/virtualAccountOperation";
import type { ProviderAccountOperationPage, VirtualAccountOperationProjection, VirtualAccount } from "@/services/providerAccountService";

export const operationContext: OperationContext = { environment: "https://api.test/api", userId: "41", providerCode: "nium" };
export const vaRequest: VirtualAccountRequestSnapshot = { providerCode: "nium", currency: "USD", accountCategory: "SELF_FUNDING_ACCOUNT", accountType: "LOCAL" };
export const serverOperation = (overrides: Partial<VirtualAccountOperationProjection> = {}): VirtualAccountOperationProjection => ({
  provider_account_id: 7, operation_id: "operation-one", currency: "USD", status: "pending",
  provider_payment_id: null, virtual_account_id: null, updated_at: "2026-10-28T00:00:00Z", ...overrides,
});
export const operationPage = (operations: VirtualAccountOperationProjection[] = [], next: number | null = null): ProviderAccountOperationPage => ({
  provider: { id: 1, code: "nium", name: "Nium", status: "active" }, provider_account: { id: 7, status: "active" },
  virtual_account_operations: operations,
  virtual_account_operations_pagination: { per_page: 50, has_more: next !== null, next_before_id: next },
});
export const virtualAccount = (overrides: Partial<VirtualAccount> = {}): VirtualAccount => ({
  id: 87, user_provider_account_id: 7, provider_payment_id: "VA-ONE", virtual_account_reference: "reference-one",
  currency: "USD", account_category: "SELF_FUNDING_ACCOUNT", account_type: "LOCAL", status: "assigned", ...overrides,
});
export const eligibleIntegration = (eligible = true) => ({
  provider: { id: 1, code: "nium", name: "Nium", status: "active" }, provider_account: { id: 7, status: eligible ? "active" : "pending" },
  integration_link: null, integration_request: null, link_available: true, can_connect: false,
  can_request_connect: false, request_pending: false, can_request_virtual_account: eligible,
  virtual_account_eligibility_reason: eligible ? null : "kyb_approval_pending",
  virtual_account_allocation_reason: null,
});

// Test double for the browser's exclusive scheduling; production uses native Web Locks.
// Two independent stores sharing this manager model two same-origin browser tabs.
export function sharedTestLocks(): Pick<LockManager, "request"> {
  const pending = new Map<string, Promise<unknown>>();
  const request = vi.fn((name: string, _options: unknown, callback: (lock: Lock) => unknown) => {
    const next = (pending.get(name) ?? Promise.resolve()).catch(() => undefined)
      .then(() => callback({ name, mode: "exclusive" } as Lock));
    pending.set(name, next);
    return next;
  });
  return { request } as unknown as Pick<LockManager, "request">;
}
