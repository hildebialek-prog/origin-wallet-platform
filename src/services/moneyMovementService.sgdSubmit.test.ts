import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTransfer, getBeneficiary, getTransfer, recoverSgdCapturedOutcome, requestSgdRecoveryReview, reviewTransfer } from "./moneyMovementService";
const request = vi.hoisted(() => vi.fn());
vi.mock("./apiClient", () => ({ requestApi: request }));
beforeEach(() => request.mockReset());

describe("standard SGD customer instruction API", () => {
  it("prepares review without recording payment acceptance", async () => {
    const payload = { provider_id: 10, beneficiary_id: 9, source_amount: "5.00000001",
      purpose_code: "TRUTHFUL", reference_text: "INV-NEW", client_reference: "new-payment",
      transfer_id: 50, preparation_id: "11111111-1111-4111-8111-111111111111" };
    await reviewTransfer({ userId: "12", token: "customer-token", payload });
    expect(request).toHaveBeenCalledExactlyOnceWith("/user/users/12/transfers/review", {
      method: "POST", token: "customer-token", body: payload,
    });
  });
  it("uses standard Submit with the accepted review and no invented destination amount", async () => {
    const payload = { provider_id: 10, beneficiary_id: 9, transfer_type: "payout",
      source_currency: "USD", target_currency: "SGD", source_amount: "5.00000001",
      purpose_code: "TRUTHFUL", reference_text: "INV-NEW", client_reference: "new-payment",
      transfer_id: 50, preparation_id: "11111111-1111-4111-8111-111111111111",
      review_token: "bound-review", accept_payment_terms: true as const, purpose_confirmed: true as const };
    request.mockResolvedValue({ status: "approval_required" });
    expect((await createTransfer({ userId: "12", token: "customer-token", payload })).status).toBe("approval_required");
    expect(request).toHaveBeenCalledExactlyOnceWith("/user/users/12/transfers", {
      method: "POST", token: "customer-token", body: payload,
    });
    expect(payload).not.toHaveProperty("destinationAmount");
    for (const field of ["raw_data", "fx_quote_id", "fx_rate", "fee_amount", "fee_currency", "total_wallet_debit", "provider_verified", "accept_uncapped_charges"]) {
      expect(payload).not.toHaveProperty(field);
    }
  });
  it("uses the existing owned retrieval and recovery endpoints without a payout execution request", async () => {
    const auth = { userId: "12", token: "customer-token" };
    await getBeneficiary({ ...auth, beneficiaryId: 9 });
    await getTransfer({ ...auth, transferId: 50 });
    await requestSgdRecoveryReview({ ...auth, transferId: 50 });
    await recoverSgdCapturedOutcome({ ...auth, transferId: 50 });
    expect(request.mock.calls).toEqual([
      ["/user/users/12/beneficiaries/9", { token: auth.token }],
      ["/user/users/12/transfers/50", { token: auth.token }],
      ["/user/users/12/transfers/50/sgd-local-recovery-review", { method: "POST", token: auth.token }],
      ["/user/users/12/transfers/50/sgd-local-recover-captured", { method: "POST", token: auth.token }],
    ]);
  });
});
