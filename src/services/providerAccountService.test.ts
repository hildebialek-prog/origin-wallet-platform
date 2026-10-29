import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));

vi.mock("@/services/apiClient", () => ({ requestApi }));

import { getProviderAccountOperations, getVirtualAccounts, requestVirtualAccount } from "@/services/providerAccountService";
import { operationPage, serverOperation, virtualAccount } from "@/test/virtualAccountFixtures";

import { multiCurrencyVirtualAccounts } from "@/test/multiCurrencyVirtualAccountFixtures";

describe("requestVirtualAccount", () => {
  beforeEach(() => {
    requestApi.mockReset();
    requestApi.mockResolvedValue({ operation_id: "operation-one", virtual_account: {} });
  });

  it("sends the logical operation ID as the Idempotency-Key header", async () => {
    await requestVirtualAccount({
      userId: 42,
      token: "token",
      providerCode: "nium",
      currency: "USD",
      accountCategory: "COLLECTION_ACCOUNT",
      accountType: "LOCAL",
      operationId: "operation-one",
    });

    expect(requestApi).toHaveBeenCalledWith(
      "/user/users/42/provider-accounts/nium/virtual-account",
      expect.objectContaining({
        method: "POST",
        headers: { "Idempotency-Key": "operation-one" },
      }),
    );
  });

  it("sends the account precondition alongside the original parameters", async () => {
    await requestVirtualAccount({ userId: 42, token: "token", providerCode: "nium", currency: "USD",
      accountCategory: "COLLECTION_ACCOUNT", accountType: "LOCAL", operationId: "operation-one", expectedProviderAccountId: 7 });
    expect(requestApi).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      body: { currency: "USD", account_category: "COLLECTION_ACCOUNT", account_type: "LOCAL", expected_provider_account_id: 7 },
    }));
    expect(requestApi).toHaveBeenCalledTimes(1);
  });

  it.each([
    { operation_id: "operation-one", operation: serverOperation(), virtual_account: null },
    { operation_id: "operation-one", operation: serverOperation({ virtual_account_id: 87 }), virtual_account: virtualAccount({ status: "pending", provider_payment_id: null }) },
  ])("preserves nullable 202 and legacy pending 201 payloads without inferring assignment", async (response) => {
    requestApi.mockResolvedValue(response);
    const result = await requestVirtualAccount({ userId: 42, token: "token", providerCode: "nium", currency: "USD",
      accountCategory: "COLLECTION_ACCOUNT", accountType: "LOCAL", operationId: "operation-one" });
    expect(result).toBe(response);
    expect(result.operation.status).toBe("pending");
    expect(requestApi).toHaveBeenCalledTimes(1);
  });

  it("encodes exact account/key identity and discovery pagination as GET parameters", async () => {
    requestApi.mockResolvedValue(operationPage());
    await getProviderAccountOperations({ userId: 42, token: "token", providerCode: "nium", providerAccountId: 7,
      operationId: "same:key/with spaces", beforeId: 120, unresolvedOnly: true });
    const [path, options] = requestApi.mock.calls[0];
    const url = new URL(path, "https://api.test");
    expect(url.pathname).toBe("/user/users/42/provider-accounts/nium");
    expect(Object.fromEntries(url.searchParams)).toEqual({ provider_account_id: "7", operation_id: "same:key/with spaces",
      operations_before_id: "120", operations_unresolved_only: "1" });
    expect(options).toEqual({ token: "token" });
  });

  it("reads existing VAs and enrichment with an account filter and no assignment POST", async () => {
    const account = virtualAccount({ enrichment: { status: "exhausted", next_attempt_at: null, updated_at: null },
      detail: { routing_code_type: "SWIFT", routing_code_value: "BANKUSXX", routing_code_type_2: "ACH", routing_code_value_2: "123456789" } });
    requestApi.mockResolvedValue({ data: [account] });
    expect(await getVirtualAccounts({ userId: 42, token: "token", providerCode: "nium", providerAccountId: 7 })).toEqual([account]);
    expect(requestApi).toHaveBeenCalledWith("/user/users/42/provider-accounts/nium/virtual-accounts?provider_account_id=7", { token: "token" });
    expect(requestApi).toHaveBeenCalledTimes(1);
  });
});


it("reads mixed-currency VAs verbatim from the API without USD defaults or a creation request", async () => {
  requestApi.mockReset();
  requestApi.mockResolvedValue({ data: multiCurrencyVirtualAccounts });
  const accounts = await getVirtualAccounts({ userId: 42, token: "test-token", providerCode: "nium" });
  expect(accounts).toBe(multiCurrencyVirtualAccounts);
  expect(accounts.map((account) => account.currency)).toEqual(["USD", "EUR", "CNY", "HKD", "SGD", "GBP"]);
  expect(requestApi).toHaveBeenCalledExactlyOnceWith("/user/users/42/provider-accounts/nium/virtual-accounts", { token: "test-token" });
});
