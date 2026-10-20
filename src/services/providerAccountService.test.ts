import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestApi } = vi.hoisted(() => ({ requestApi: vi.fn() }));

vi.mock("@/services/apiClient", () => ({ requestApi }));

import { requestVirtualAccount } from "@/services/providerAccountService";

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
});
