import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestApi } from "./apiClient";
import { dynamicOptions, dynamicQuote, dynamicReview, dynamicSubmit, dynamicStatus } from "./niumDynamicService";

vi.mock("./apiClient", () => ({ requestApi: vi.fn() }));
const call = vi.mocked(requestApi);
const auth = { userId: "12", token: "customer-token" };
const base = "/user/users/12/nium/dynamic-payouts";

beforeEach(() => { call.mockReset(); call.mockResolvedValue({}); });
describe("authenticated Dynamic API contract", () => {
  it("uses the existing owned options and status endpoints", async () => {
    await dynamicOptions(auth, 4);
    expect(call).toHaveBeenLastCalledWith(`${base}/options?beneficiary_id=4`, { token: auth.token });
    await dynamicStatus(auth, "intent/id");
    expect(call).toHaveBeenLastCalledWith(`${base}/intent%2Fid`, { token: auth.token });
  });
  it.each(["SOURCE_AMOUNT", "DESTINATION_AMOUNT"] as const)("passes exact input for %s without browser pricing", async (mode) => {
    const body = { beneficiary_id: 4, destination_currency: "GBP", amount_mode: mode, entered_amount: "1000.01" };
    await dynamicQuote(auth, body);
    expect(call).toHaveBeenLastCalledWith(`${base}/quotes`, { method: "POST", token: auth.token, body });
  });
  it("binds review and submit without any Admin endpoint or added fee", async () => {
    const review = { beneficiary_id: 4, dynamic_quote_id: "quote-id",
      instruction: { purpose_code: "IR005", source_of_funds: "Salary", comment: "Invoice" } };
    await dynamicReview(auth, review);
    expect(call).toHaveBeenLastCalledWith(`${base}/reviews`, { method: "POST", token: auth.token, body: review });
    const request = { provider_account_id: 2, beneficiary_id: 4, balance_id: 3,
      accepted_fingerprint: "a".repeat(64), client_reference: `DYN-${"a".repeat(64)}` };
    await dynamicSubmit(auth, request);
    expect(call).toHaveBeenLastCalledWith(base, { method: "POST", token: auth.token, body: request });
    expect(call).toHaveBeenCalledTimes(2);
  });
});
