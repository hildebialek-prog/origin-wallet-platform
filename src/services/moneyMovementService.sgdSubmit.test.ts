import { beforeEach, describe, expect, it, vi } from "vitest";
import { lockSgdLocal, prepareSgdLocal, requestSgdLocalFxLock, submitSgdLocal } from "./moneyMovementService";
const request = vi.hoisted(() => vi.fn());
vi.mock("./apiClient", () => ({ requestApi: request }));
beforeEach(() => request.mockReset());

describe("SGD customer instruction API", () => {
  it("records authenticated acceptance through customer Submit only", async () => {
    request.mockResolvedValue({ status: "approval_required" });
    const result = await submitSgdLocal({ userId: "12", token: "customer-token", transferId: 3,
      submissionToken: "current-review", acceptUncappedCharges: true });
    expect(result.status).toBe("approval_required");
    expect(request).toHaveBeenCalledExactlyOnceWith("/user/users/12/transfers/3/sgd-local-submit", {
      method: "POST", token: "customer-token", body: { submission_token: "current-review",
        accept_payment_terms: true, purpose_confirmed: true, accept_uncapped_charges: true },
    });
  });
  it("retains preparation and FX lock contracts under both caller names", async () => {
    expect(lockSgdLocal).toBe(requestSgdLocalFxLock);
    await prepareSgdLocal({ userId: "12", token: "customer-token", payload: {
      provider_id: 10, beneficiary_id: 9, source_amount: "5.00000001", purpose_code: "TRUTHFUL", client_reference: "synthetic-ref",
    } });
    expect(request).toHaveBeenCalledExactlyOnceWith("/user/users/12/sgd-local-payouts", {
      method: "POST", token: "customer-token", body: { provider_id: 10, beneficiary_id: 9,
        source_amount: "5.00000001", purpose_code: "TRUTHFUL", client_reference: "synthetic-ref", source_currency: "USD",
        target_currency: "SGD", purpose_confirmed: true, expected_fee_amount: "0", expected_fee_currency: "USD" },
    });
  });
  it.each([null, "SAVED-REFERENCE"])("preserves the supplied payment reference %s during explicit preparation", async (reference) => {
    await prepareSgdLocal({ userId: "12", token: "customer-token", payload: {
      provider_id: 10, beneficiary_id: 9, source_amount: "5", purpose_code: "IR008", client_reference: "synthetic-ref",
      reference_text: reference,
    } });
    expect(request).toHaveBeenCalledExactlyOnceWith("/user/users/12/sgd-local-payouts", expect.objectContaining({
      method: "POST", token: "customer-token", body: expect.objectContaining({
        beneficiary_id: 9, source_amount: "5", purpose_code: "IR008", reference_text: reference,
      }),
    }));
  });
});
