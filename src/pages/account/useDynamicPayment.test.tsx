import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Balance, Beneficiary } from "@/services/moneyMovementService";
import type { DynamicCustomerPricing, DynamicMode, DynamicOptions, DynamicQuote, DynamicReview, DynamicTransfer } from "@/services/niumDynamicService";
import { useDynamicPayment } from "./useDynamicPayment";
import { DynamicReviewStep } from "./DynamicPaymentSteps";
import { ApiRequestError } from "@/services/apiClient";

const api = vi.hoisted(() => ({ getNiumPurposeCodes: vi.fn(), dynamicOptions: vi.fn(), dynamicQuote: vi.fn(), dynamicReview: vi.fn(), dynamicSubmit: vi.fn(), dynamicStatus: vi.fn(), dynamicTransfers: vi.fn() }));
const session = vi.hoisted(() => ({ user: { id: "12" }, token: "customer-token" }));
vi.mock("@/services/niumDynamicService", () => api);
vi.mock("@/services/fxOrderService", () => api);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => session }));
const beneficiary: Beneficiary = { id: 4, provider_id: 10, beneficiary_type: "individual", full_name: "Payee", country_code: "GB", currency: "GBP", payout_method: "LOCAL", status: "active" };
const wallet: Balance = { id: 3, user_id: 12, provider_id: 10, currency: "USD", available_balance: "1000.00000000" };
const instruction = { purpose_code: "IR005", source_of_funds: "Salary", comment: "Invoice" };
const feeClassification = {
  fee_owner: "NIUM", fee_type: "TRANSACTION_FEE", fee_basis: "CONTRACT_SCHEDULE", fx_margin_owner: "NIUM",
  fee_collection: "UNVERIFIED", origin_revenue: "NOT_RECOGNIZED",
};
const pricing: DynamicCustomerPricing = { version: "nium-contracted-local-usd-inclusive-v4", funding: "USD", country: "GB", destination: "GBP", method: "LOCAL",
  ...feeClassification,
  margin_percent: "0.13", fee: "20", fee_currency: "USD", contracted_nium_transaction_fee_usd: "20", fee_payer: "SENDER",
  fee_treatment: "INCLUDED_IN_TOTAL_USD_DEBIT", rate_treatment: "PRESERVE_NIUM_QUOTED_RATE_NO_ADDITIONAL_MARGIN",
  provider_settlement: "INDEPENDENT_AUTHENTICATED_RECONCILIATION" };
const optionAuthority = {
  dynamic_available: true, source_currency: "USD", eligible_payout_rails: ["LOCAL"],
  provider_listing: { status: "LISTED", reason_codes: ["dynamic_customer_corridor_authorization_unverified"] }, customer_entitlement: "VERIFIED",
  financial_authorization: "CUSTOMER_PRICING_AUTHORIZED", executable_amount_modes: [], requires_instruction_validation: true,
  supported_amount_modes: ["SOURCE_AMOUNT", "DESTINATION_AMOUNT"] as DynamicMode[],
};
const options = (currencies = ["GBP"]): DynamicOptions => ({ ...optionAuthority, currency_scales: { USD: 2, ...Object.fromEntries(currencies.map((code) => [code, 2])) }, beneficiary: { id: 4, name: "Payee", currency: "GBP", country_code: "GB" },
  status: "QUOTE_REFERENCE_ONLY", reason_codes: [], quote_availability: { supported_amount_modes: ["SOURCE_AMOUNT", "DESTINATION_AMOUNT"], payout_rail: "LOCAL", status: "QUOTE_REFERENCE_ONLY", destination_currencies: currencies, reason_codes: [] } });
const quote = (mode: DynamicMode = "SOURCE_AMOUNT", id = "quote-1"): DynamicQuote => ({ status: "QUOTE_REFERENCE_ONLY", dynamic_quote_id: id, provider_quote_id: `provider-${id}`,
  customer_pricing: pricing, contracted_nium_transaction_fee: { currency: "USD", amount: "20" }, pricing_status: "CONTRACTUAL_CUSTOMER_TERMS",
  financial_verification: "CUSTOMER_PRICING_AUTHORIZED_PROVIDER_SETTLEMENT_UNVERIFIED",
  beneficiary_id: 4, payout_rail: "LOCAL", source_currency: "USD", destination_currency: "GBP", amount_mode: mode, entered_amount: mode === "SOURCE_AMOUNT" ? "1000" : "784",
  quoted_principal: { currency: "USD", amount: "980" }, planned_included_fee: { currency: "USD", amount: "20" }, planned_total_usd_debit: "1000",
  quoted_destination_amount: { currency: "GBP", amount: "784" }, nium_quoted_fx_rate: "0.8", quote_expires_at: new Date(Date.now() + 300000).toISOString() });
const review = (q: DynamicQuote): DynamicReview => ({ status: "READY", review_id: "a".repeat(64), accepted_fingerprint: "a".repeat(64),
  provider_quote_id: q.provider_quote_id, nium_quoted_fx_rate: q.nium_quoted_fx_rate, customer_pricing: q.customer_pricing, contracted_nium_transaction_fee: q.contracted_nium_transaction_fee,
  beneficiary_id: 4, provider_account_id: 2, balance_id: 3, dynamic_quote_id: q.dynamic_quote_id, amount_mode: q.amount_mode, entered_amount: q.entered_amount,
  principal: q.quoted_principal, included_fee: q.planned_included_fee, total_usd_debit: q.planned_total_usd_debit,
  payout_rail: q.payout_rail, destination_amount: q.quoted_destination_amount, review_expires_at: q.quote_expires_at, quote_expires_at: q.quote_expires_at, instruction, reason_codes: [] });
const transfer = (status: DynamicTransfer["status"] = "pending_provider_confirmation"): DynamicTransfer => ({
  id: "22222222-2222-4222-8222-222222222222", beneficiary: { id: 4, country_code: "GB" }, source_currency: "USD", destination_currency: "GBP",
  amount_mode: "SOURCE_AMOUNT", total_usd_debit: "1000.00000000", principal: { currency: "USD", amount: "980" },
  fee_classification: feeClassification, included_fee: { currency: "USD", amount: "20" }, destination_amount: { currency: "GBP", amount: "784" },
  status, financial_reconciled: ["paid", "reconciled"].includes(status), message: "Provider outcome pending. Do not submit again.",
  quote_expires_at: "2020-01-01T00:00:00Z" });
const page = (data: DynamicTransfer[] = [], number = 1, next: number | null = null) => ({ data, page: number, per_page: 20, has_more: next !== null, next_page: next });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount() {
  return renderHook(({ selected, balances }) => useDynamicPayment(selected, true, balances),
    { initialProps: { selected: beneficiary as Beneficiary | null, balances: [wallet] } });
}
async function ready(result: ReturnType<typeof mount>["result"]) {
  await waitFor(() => expect(result.current.currency).toBe("GBP"));
  await waitFor(() => expect(result.current.busy).toBe(false));
}
async function enterAndQuote(result: ReturnType<typeof mount>["result"], mode: DynamicMode = "SOURCE_AMOUNT") {
  act(() => mode === "SOURCE_AMOUNT" ? result.current.changeSendAmount("1000") : result.current.changeReceiveAmount("784"));
  await act(async () => { await result.current.getQuote(); });
}
async function prepareReview(result: ReturnType<typeof mount>["result"]) {
  act(() => { result.current.changeInstruction("purpose_code", "IR005"); });
  act(() => { result.current.changeInstruction("source_of_funds", "Salary"); });
  act(() => { result.current.changeInstruction("comment", "Invoice"); });
  await act(async () => { await result.current.getReview(); });
}

beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  session.user = { id: "12" }; session.token = "customer-token";
  api.dynamicTransfers.mockResolvedValue({ data: [], page: 1, per_page: 20, has_more: false, next_page: null });
  api.dynamicOptions.mockResolvedValue(options());
  api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: instruction.purpose_code, label: "Purpose returned by backend" }] });
  api.dynamicQuote.mockImplementation(async (_auth, body) => quote(body.amount_mode));
  api.dynamicReview.mockImplementation(async () => {
    const results = api.dynamicQuote.mock.results;
    return review(await results[results.length - 1]!.value);
  });
});
afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Dynamic instruction catalogue and binding", () => {
  it.each(["", "NOT-IN-CATALOGUE"])("refuses a missing or unlisted purpose %j before Review", async (code) => {
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    act(() => {
      result.current.changeInstruction("purpose_code", code);
      result.current.changeInstruction("source_of_funds", instruction.source_of_funds);
      result.current.changeInstruction("comment", instruction.comment);
    });
    await act(async () => { await result.current.getReview(); });
    expect(result.current.error).toContain("Select a payment purpose");
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("preserves the exact valid instruction and existing Review request shape", async () => {
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    expect(api.getNiumPurposeCodes).toHaveBeenCalledWith({ userId: "12", token: "customer-token" });
    expect(api.dynamicReview).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, {
      beneficiary_id: beneficiary.id, dynamic_quote_id: result.current.quote!.dynamic_quote_id, instruction,
    });
    expect(result.current.review?.status).toBe("READY");
  });

  it("cannot request Review with complete instructions before a quote exists", async () => {
    const { result } = mount(); await ready(result); await prepareReview(result);
    expect(result.current.instruction).toEqual(instruction);
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each(["", "salary", "UNLISTED", " Salary", "Salary "])("rejects source of funds %j before Review", async (source) => {
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    act(() => {
      result.current.changeInstruction("purpose_code", instruction.purpose_code);
      result.current.changeInstruction("source_of_funds", source);
      result.current.changeInstruction("comment", instruction.comment);
    });
    await act(async () => { await result.current.getReview(); });
    expect(result.current.error).toContain("Select a source of funds");
    expect(result.current.review).toBeNull();
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each(["Salary", "Personal Savings", "Personal Wealth", "Retirement Funds", "Business Owner/Shareholder",
    "Loan Facility", "Personal Account", "Corporate Account"])("preserves the selected source of funds %j through Review", async (source) => {
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    const q = result.current.quote!;
    const selectedInstruction = { ...instruction, source_of_funds: source };
    api.dynamicReview.mockResolvedValueOnce({ ...review(q), instruction: selectedInstruction });
    act(() => {
      result.current.changeInstruction("purpose_code", instruction.purpose_code);
      result.current.changeInstruction("source_of_funds", source);
      result.current.changeInstruction("comment", instruction.comment);
    });
    await act(async () => { await result.current.getReview(); });
    expect(api.dynamicReview).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, {
      beneficiary_id: beneficiary.id, dynamic_quote_id: q.dynamic_quote_id, instruction: selectedInstruction,
    });
    expect(result.current.review?.instruction).toEqual(selectedInstruction);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("clears Review and accepted consent when source of funds changes while retaining the quote", async () => {
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    const q = result.current.quote!;
    act(() => result.current.setAccepted(true));
    expect(result.current.accepted).toBe(true);
    act(() => result.current.changeInstruction("source_of_funds", "Personal Savings"));
    expect(result.current.quote).toBe(q); expect(result.current.quoteState).toBe("valid");
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(result.current.executableAmountModes).toEqual([]);
    render(<DynamicReviewStep payment={result.current} onBack={() => {}} />);
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    await act(async () => { await result.current.submit(); });
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("rejects a raw newline in the reference before sending Review", async () => {
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    act(() => {
      result.current.changeInstruction("purpose_code", instruction.purpose_code);
      result.current.changeInstruction("source_of_funds", instruction.source_of_funds);
      result.current.changeInstruction("comment", "Invoice\n");
    });
    await act(async () => { await result.current.getReview(); });
    expect(result.current.instruction.comment).toBe("Invoice\n");
    expect(result.current.error).toContain("control characters");
    expect(result.current.quoteState).toBe("valid");
    expect(result.current.review).toBeNull();
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("ignores an old beneficiary's catalogue and clears instructions on a rail change", async () => {
    const old = deferred<{ data: { code: string; label: string }[] }>();
    api.getNiumPurposeCodes.mockReturnValueOnce(old.promise);
    const { result, rerender } = mount(); await ready(result);
    act(() => {
      result.current.changeInstruction("purpose_code", "OLD");
      result.current.changeInstruction("source_of_funds", instruction.source_of_funds);
      result.current.changeInstruction("comment", instruction.comment);
    });
    rerender({ selected: { ...beneficiary, payout_method: "SWIFT" }, balances: [wallet] });
    await waitFor(() => expect(result.current.purposeStatus).toBe("ready"));
    await act(async () => { old.resolve({ data: [{ code: "OLD", label: "Old catalogue" }] }); await old.promise; });
    expect(result.current.purposeOptions.map((option) => option.code)).toEqual([instruction.purpose_code]);
    expect(result.current.instruction).toEqual({ purpose_code: "", source_of_funds: "", comment: "" });
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
  });

  it("clears instructions on a user currency change", async () => {
    const { result } = mount(); await ready(result); await prepareReview(result);
    act(() => result.current.changeCurrency(""));
    expect(result.current.instruction).toEqual({ purpose_code: "", source_of_funds: "", comment: "" });
    expect(result.current.quote).toBeNull(); expect(result.current.review).toBeNull();
  });

  it.each([undefined, { data: [{ code: "", label: "Missing code" }] },
    { data: [{ code: "A", label: "One" }, { code: "A", label: "Duplicate" }] }])(
    "fails closed for an invalid catalogue response %j", async (response) => {
      api.getNiumPurposeCodes.mockResolvedValueOnce(response);
      const { result } = mount(); await ready(result);
      await waitFor(() => expect(result.current.purposeStatus).toBe("error"));
      expect(result.current.purposeOptions).toEqual([]); expect(result.current.invalidPurpose).not.toBe("");
    });

  it("keeps the amount debounce while a pre-quote instruction is edited", async () => {
    const { result } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000"));
    await advanceQuoteClock(250);
    act(() => result.current.changeInstruction("comment", "Before quote"));
    await advanceQuoteClock(250);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
    expect(result.current.quoteState).toBe("valid"); expect(result.current.instruction.comment).toBe("Before quote");
  });

  it.each([["comment", "Changed during Review"], ["source_of_funds", "Personal Savings"], ["purpose_code", "CORRIDOR-SPECIFIC"]] as const)(
    "keeps an in-flight quote while editing instructions and rejects a late Review after changing %s", async (field, value) => {
    const response = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(response.promise);
    const { result } = mount(); await ready(result);
    act(() => result.current.changeSendAmount("1000"));
    let request!: ReturnType<typeof result.current.getQuote>;
    act(() => { request = result.current.getQuote(); });
    const signal = api.dynamicQuote.mock.calls[0][2] as AbortSignal;
    act(() => result.current.changeInstruction("comment", "During quote"));
    expect(signal.aborted).toBe(false); expect(result.current.busy).toBe(true);
    await act(async () => { response.resolve(quote()); await request; });
    expect(result.current.quoteState).toBe("valid"); expect(result.current.instruction.comment).toBe("During quote");
    const q = result.current.quote!;
    const late = deferred<DynamicReview>(); api.dynamicReview.mockReturnValueOnce(late.promise);
    act(() => {
      result.current.changeInstruction("purpose_code", instruction.purpose_code);
      result.current.changeInstruction("source_of_funds", instruction.source_of_funds);
    });
    let reviewRequest!: ReturnType<typeof result.current.getReview>;
    act(() => { reviewRequest = result.current.getReview(); });
    expect(result.current.busy).toBe(true);
    expect(api.dynamicReview).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, {
      beneficiary_id: beneficiary.id, dynamic_quote_id: q.dynamic_quote_id,
      instruction: { ...instruction, comment: "During quote" },
    });
    act(() => result.current.changeInstruction(field, value));
    expect(result.current.busy).toBe(false);
    let reviewed: boolean | undefined;
    await act(async () => {
      late.resolve({ ...review(q), instruction: { ...instruction, comment: "During quote" } });
      reviewed = await reviewRequest;
    });
    expect(reviewed).toBeUndefined();
    expect(result.current.quote).toBe(q); expect(result.current.quoteState).toBe("valid");
    expect(result.current.instruction[field]).toBe(value);
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(result.current.executableAmountModes).toEqual([]); expect(result.current.busy).toBe(false);
    render(<DynamicReviewStep payment={result.current} onBack={() => {}} />);
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    act(() => result.current.setAccepted(true));
    expect(result.current.accepted).toBe(false);
    await act(async () => { await result.current.submit(); });
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1); expect(api.dynamicReview).toHaveBeenCalledTimes(1);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });
});

describe("bidirectional Dynamic quote state", () => {
  it.each([undefined, {}, { USD: 2 }, { USD: 2, GBP: "2" }, { USD: 2, GBP: 3 }, { USD: 2, GBP: -1 }])("refuses missing or unsupported authoritative scales: %j", async (scales) => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), currency_scales: scales });
    const { result } = mount();
    await waitFor(() => expect(api.dynamicOptions).toHaveBeenCalled());
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.available).toBe(false); expect(result.current.amountModes).toEqual([]);
    expect(api.dynamicQuote).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("does not treat Options modes as executable and defaults to the sole supported quote direction", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), supported_amount_modes: ["DESTINATION_AMOUNT"],
      quote_availability: { ...options().quote_availability, supported_amount_modes: ["DESTINATION_AMOUNT"] } });
    const { result } = mount(); await ready(result);
    expect(result.current.mode).toBe("DESTINATION_AMOUNT"); expect(result.current.amountModes).toEqual(["DESTINATION_AMOUNT"]);
    expect(result.current.executableAmountModes).toEqual([]);
    await enterAndQuote(result, "DESTINATION_AMOUNT"); await prepareReview(result);
    expect(result.current.executableAmountModes).toEqual(["DESTINATION_AMOUNT"]);
  });

  it("validates zero-decimal recipient amounts from the backend schema before quoting", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), currency_scales: { USD: 2, GBP: 0 } });
    const { result } = mount(); await ready(result);
    act(() => result.current.changeReceiveAmount("784.01"));
    await act(async () => { await result.current.getQuote(); });
    expect(result.current.error).toContain("0 decimal places"); expect(api.dynamicQuote).not.toHaveBeenCalled();
    await enterAndQuote(result, "DESTINATION_AMOUNT");
    expect(result.current.quote?.quoted_destination_amount.amount).toBe("784");
  });

  it("honors a narrower authoritative USD scale without blocking whole-amount quotes", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), currency_scales: { USD: 0, GBP: 2 } });
    const { result } = mount(); await ready(result);
    act(() => result.current.changeSendAmount("1000.01"));
    await act(async () => { await result.current.getQuote(); });
    expect(result.current.error).toContain("0 decimal places"); expect(api.dynamicQuote).not.toHaveBeenCalled();
    await enterAndQuote(result); expect(result.current.quote?.planned_total_usd_debit).toBe("1000");
    await prepareReview(result); expect(result.current.executableAmountModes).toEqual(["SOURCE_AMOUNT"]);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("invalidates consent when the same beneficiary's rail or country binding changes", async () => {
    const { result, rerender } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    act(() => result.current.setAccepted(true)); expect(result.current.accepted).toBe(true);
    rerender({ selected: { ...beneficiary, payout_method: "SWIFT", country_code: "FR" }, balances: [wallet] });
    expect(result.current.quote).toBeNull(); expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(result.current.executableAmountModes).toEqual([]); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("expires consent against the current Review even before the quote expires", async () => {
    api.dynamicReview.mockImplementationOnce(async () => ({ ...review(await api.dynamicQuote.mock.results[0].value),
      review_expires_at: new Date(Date.now() + 30000).toISOString() }));
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    act(() => result.current.setAccepted(true));
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(result.current.review!.review_expires_at));
    await act(async () => { await result.current.submit(); });
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
    expect(result.current.accepted).toBe(false);
  });

  it.each([
    { dynamic_available: undefined }, { source_currency: undefined }, { provider_listing: null },
    { customer_entitlement: undefined }, { customer_entitlement: "UNAVAILABLE" },
    { financial_authorization: undefined }, { financial_authorization: "UNAVAILABLE" },
    { eligible_payout_rails: [] }, { eligible_payout_rails: ["LOCAL", "SWIFT"] },
    { quote_availability: undefined },
  ])("does not infer authority from an incomplete options response: %j", async (change) => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), ...change });
    const { result } = mount();
    await waitFor(() => expect(api.dynamicOptions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.available).toBe(false); expect(result.current.currencies).toEqual([]);
    expect(result.current.availabilityReason).toContain("authority is unavailable");
    act(() => result.current.changeSendAmount("1000"));
    await act(async () => { await result.current.getQuote(); });
    expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it.each([{ modes: undefined }, { modes: [] }, { modes: ["UNKNOWN_MODE"] }])("requires explicit supported amount modes: %j", async ({ modes }) => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), quote_availability: { ...options().quote_availability, supported_amount_modes: modes } });
    const { result } = mount();
    await waitFor(() => expect(api.dynamicOptions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.available).toBe(false); expect(result.current.currency).toBe("");
  });

  it("ignores late options for a previously selected beneficiary", async () => {
    const old = deferred<DynamicOptions>();
    api.dynamicOptions.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ ...options(["EUR"]),
      beneficiary: { ...options().beneficiary, id: 5, currency: "EUR" } });
    const { result, rerender } = mount();
    await waitFor(() => expect(api.dynamicOptions).toHaveBeenCalledTimes(1));
    rerender({ selected: { ...beneficiary, id: 5, currency: "EUR" }, balances: [wallet] });
    await waitFor(() => expect(result.current.currency).toBe("EUR"));
    await act(async () => { old.resolve(options()); await old.promise; });
    expect(result.current.options?.beneficiary.id).toBe(5); expect(result.current.currencies).toEqual(["EUR"]);
  });

  it("releases busy state and discards a stale Review when instructions change", async () => {
    const response = deferred<DynamicReview>();
    api.dynamicReview.mockReturnValueOnce(response.promise);
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    act(() => {
      result.current.changeInstruction("purpose_code", instruction.purpose_code);
      result.current.changeInstruction("source_of_funds", instruction.source_of_funds);
      result.current.changeInstruction("comment", instruction.comment);
    });
    const q = result.current.quote!;
    let request: ReturnType<typeof result.current.getReview>;
    act(() => { request = result.current.getReview(); });
    expect(result.current.busy).toBe(true);
    act(() => result.current.changeInstruction("comment", "New instruction"));
    expect(result.current.busy).toBe(false);
    await act(async () => { response.resolve(review(q)); await request; });
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(result.current.instruction.comment).toBe("New instruction");
  });

  it("preserves exact decimal input bytes in the quote request", async () => {
    const { result } = mount(); await ready(result);
    act(() => result.current.changeReceiveAmount("784.00"));
    await act(async () => { await result.current.getQuote(); });
    expect(api.dynamicQuote).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      amount_mode: "DESTINATION_AMOUNT", entered_amount: "784.00",
    }), expect.any(AbortSignal));
    expect(result.current.amount).toBe("784.00");
  });

  it("retains all backend refusal codes without inventing financial authority", async () => {
    api.dynamicReview.mockRejectedValueOnce(new ApiRequestError("Unavailable", 503, undefined,
      { reason_codes: ["dynamic_payout_instruction_rejected", "new_backend_evidence_refusal"] }));
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    expect(result.current.refusalCodes).toEqual(["dynamic_payout_instruction_rejected", "new_backend_evidence_refusal"]);
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("refuses a quote for a payout method different from the selected backend option", async () => {
    api.dynamicQuote.mockResolvedValueOnce({ ...quote(), payout_rail: "SWIFT" });
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    expect(result.current.quote).toBeNull(); expect(result.current.error).toContain("payout method");
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });
  it.each(["SOURCE_AMOUNT", "DESTINATION_AMOUNT"] as const)("keeps one authoritative input and imports the other amount for %s", async (mode) => {
    const { result } = mount(); await ready(result);
    act(() => mode === "SOURCE_AMOUNT" ? result.current.changeSendAmount("1000") : result.current.changeReceiveAmount("784"));
    expect(api.dynamicQuote).not.toHaveBeenCalled();
    expect(mode === "SOURCE_AMOUNT" ? result.current.receiveAmount : result.current.sendAmount).toBe("");
    await act(async () => { await result.current.getQuote(); });
    expect(result.current.sendAmount).toBe(mode === "SOURCE_AMOUNT" ? "1000" : "1000.00"); expect(result.current.receiveAmount).toBe(mode === "DESTINATION_AMOUNT" ? "784" : "784.00");
    expect(result.current.mode).toBe(mode);
    expect(api.dynamicQuote).toHaveBeenCalledWith(expect.anything(), { beneficiary_id: 4, destination_currency: "GBP", amount_mode: mode, entered_amount: mode === "SOURCE_AMOUNT" ? "1000" : "784" }, expect.any(AbortSignal));
  });

  it("discards an old quote when a newer request in the other direction finishes first", async () => {
    const first = deferred<DynamicQuote>(), second = deferred<DynamicQuote>();
    api.dynamicQuote.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = mount(); await ready(result);
    act(() => result.current.changeSendAmount("1000"));
    let oldRequest: Promise<void>;
    act(() => { oldRequest = result.current.getQuote(); });
    expect(result.current.busy).toBe(true);
    expect(result.current.locked).toBe(false); // Editing can supersede an in-flight quote.
    act(() => result.current.changeReceiveAmount("784"));
    let newRequest: Promise<void>;
    act(() => { newRequest = result.current.getQuote(); });
    await act(async () => { second.resolve(quote("DESTINATION_AMOUNT", "new")); await newRequest; });
    await act(async () => { first.resolve(quote("SOURCE_AMOUNT", "old")); await oldRequest; });
    expect(result.current.quote?.dynamic_quote_id).toBe("new");
    expect(result.current.mode).toBe("DESTINATION_AMOUNT");
    expect(result.current.receiveAmount).toBe("784");
    expect(result.current.busy).toBe(false);
  });

  it("an old failed request cannot replace the latest amount or unlock a newer pending request", async () => {
    const first = deferred<DynamicQuote>(), second = deferred<DynamicQuote>();
    api.dynamicQuote.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = mount(); await ready(result);
    act(() => result.current.changeSendAmount("1000"));
    let oldRequest: Promise<void>, newRequest: Promise<void>;
    act(() => { oldRequest = result.current.getQuote(); });
    act(() => result.current.changeReceiveAmount("784"));
    act(() => { newRequest = result.current.getQuote(); });
    await act(async () => { first.reject(new Error("old timeout")); await oldRequest; });
    expect(result.current.busy).toBe(true); expect(result.current.error).toBe("");
    expect(result.current.receiveAmount).toBe("784"); expect(result.current.sendAmount).toBe("");
    await act(async () => { second.resolve(quote("DESTINATION_AMOUNT", "new")); await newRequest; });
    expect(result.current.quote?.dynamic_quote_id).toBe("new");
  });

  it("only defaults the beneficiary currency when backend eligibility includes it", async () => {
    api.dynamicOptions.mockResolvedValueOnce(options(["EUR"]));
    const { result } = mount();
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.available).toBe(false);
    expect(result.current.currency).toBe(""); expect(result.current.currencies).toEqual([]);
    act(() => result.current.changeCurrency("JPY")); expect(result.current.currency).toBe("");
    act(() => result.current.changeCurrency("EUR")); expect(result.current.currency).toBe("");
    expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it("never enables a reference-only currency when the backend explicitly blocks Dynamic", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), dynamic_available: false, status: "UNAVAILABLE",
      reason_codes: ["dynamic_financial_authorization_unavailable"] });
    const { result } = mount();
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.available).toBe(false); expect(result.current.currency).toBe("");
    expect(result.current.currencies).toEqual([]);
    act(() => result.current.changeSendAmount("1000"));
    await act(async () => { await result.current.getQuote(); }); expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it.each(["send", "receive", "currency", "beneficiary"] as const)("invalidates quote, Review and consent on %s edits", async (field) => {
    api.dynamicOptions.mockResolvedValue(options(["GBP", "EUR"]));
    const { result, rerender } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    expect(result.current.review?.status).toBe("READY");
    act(() => result.current.setAccepted(true));
    if (field === "beneficiary") rerender({ selected: { ...beneficiary, id: 5 }, balances: [wallet] });
    else act(() => {
      if (field === "send") result.current.changeSendAmount("1001");
      if (field === "receive") result.current.changeReceiveAmount("785");
      if (field === "currency") result.current.changeCurrency("");
    });
    expect(result.current.quote).toBeNull(); expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(api.dynamicSubmit).not.toHaveBeenCalled(); expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
  });

  it("does not reuse a late quote after changing beneficiary", async () => {
    const response = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(response.promise);
    const { result, rerender } = mount(); await ready(result);
    act(() => result.current.changeSendAmount("1000")); let request: Promise<void>;
    act(() => { request = result.current.getQuote(); });
    rerender({ selected: null, balances: [wallet] });
    await act(async () => { response.resolve(quote()); await request; });
    expect(result.current.quote).toBeNull(); expect(result.current.sendAmount).toBe(""); expect(result.current.receiveAmount).toBe("");
  });

  it("discards a pending destination quote when the currency changes", async () => {
    api.dynamicOptions.mockResolvedValueOnce(options(["GBP", "EUR"]));
    const response = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(response.promise);
    const { result } = mount(); await ready(result);
    act(() => result.current.changeReceiveAmount("784")); let request: Promise<void>;
    act(() => { request = result.current.getQuote(); });
    act(() => result.current.changeCurrency(""));
    await act(async () => { response.resolve(quote("DESTINATION_AMOUNT")); await request; });
    expect(result.current.currency).toBe(""); expect(result.current.quote).toBeNull();
    expect(result.current.sendAmount).toBe(""); expect(result.current.receiveAmount).toBe("");
    expect(result.current.busy).toBe(false);
  });

  it("does not restore Review or consent after a newer amount edit", async () => {
    const response = deferred<DynamicReview>(); api.dynamicReview.mockReturnValueOnce(response.promise);
    const { result } = mount(); await ready(result); await enterAndQuote(result);
    const previousQuote = result.current.quote!;
    act(() => { result.current.changeInstruction("purpose_code", "IR005"); });
    act(() => { result.current.changeInstruction("source_of_funds", "Salary"); });
    act(() => { result.current.changeInstruction("comment", "Invoice"); });
    let request: ReturnType<typeof result.current.getReview>;
    act(() => { request = result.current.getReview(); });
    act(() => result.current.changeReceiveAmount("785"));
    await act(async () => { response.resolve(review(previousQuote)); await request; });
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(result.current.quote).toBeNull(); expect(result.current.receiveAmount).toBe("785");
  });

  it("honors an explicit provider amount-mode restriction", async () => {
    const eligibility = options();
    eligibility.supported_amount_modes = ["SOURCE_AMOUNT"];
    eligibility.quote_availability.supported_amount_modes = ["SOURCE_AMOUNT"];
    api.dynamicOptions.mockResolvedValueOnce(eligibility);
    const { result } = mount(); await ready(result);
    await enterAndQuote(result, "DESTINATION_AMOUNT");
    expect(api.dynamicQuote).not.toHaveBeenCalled(); expect(result.current.error).toContain("does not support");
    await enterAndQuote(result, "SOURCE_AMOUNT");
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1); expect(result.current.quote).not.toBeNull();
  });

  it.each(["ambiguous", "numeric"] as const)("refuses %s USD balance evidence", async (kind) => {
    const { result, rerender } = mount(); await ready(result);
    const balances = kind === "ambiguous" ? [wallet, { ...wallet, id: 99 }]
      : [{ ...wallet, available_balance: 1000 }];
    rerender({ selected: beneficiary, balances });
    await enterAndQuote(result, "DESTINATION_AMOUNT");
    if (kind === "ambiguous") {
      expect(api.dynamicQuote).not.toHaveBeenCalled(); expect(result.current.quoteState).toBe("unavailable");
    } else expect(result.current.balanceError).toContain("exact available funding wallet balance");
    await prepareReview(result); expect(api.dynamicReview).not.toHaveBeenCalled();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("checks the destination quote's total debit including fees before Review", async () => {
    const { result, rerender } = mount(); await ready(result);
    rerender({ selected: beneficiary, balances: [{ ...wallet, available_balance: "999.99999999" }] });
    await enterAndQuote(result, "DESTINATION_AMOUNT");
    expect(result.current.sendAmount).toBe("1000.00"); expect(result.current.balanceError).toContain("cannot cover");
    await prepareReview(result); expect(api.dynamicReview).not.toHaveBeenCalled();
  });

  it("rechecks the exact confirmed debit if balances decrease after consent", async () => {
    const { result, rerender } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    act(() => result.current.setAccepted(true));
    rerender({ selected: beneficiary, balances: [{ ...wallet, available_balance: "999.99" }] });
    await act(async () => { await result.current.submit(); });
    expect(api.dynamicSubmit).not.toHaveBeenCalled(); expect(result.current.accepted).toBe(false);
    expect(result.current.balanceError).toContain("cannot cover");
  });

  it("refuses a Review bound to a different wallet despite otherwise identical amounts", async () => {
    api.dynamicReview.mockImplementationOnce(async () => {
      const results = api.dynamicQuote.mock.results;
      return { ...review(await results[results.length - 1]!.value), balance_id: 99 };
    });
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    expect(result.current.review).toBeNull(); expect(result.current.error).toContain("funding wallet");
  });

  it("requires a fresh quote when the provider quote expires before Review or after consent", async () => {
    const { result } = mount(); await ready(result); await enterAndQuote(result); await prepareReview(result);
    act(() => result.current.setAccepted(true));
    const expiration = Date.parse(result.current.quote!.quote_expires_at);
    vi.spyOn(Date, "now").mockReturnValue(expiration);
    await act(async () => { await result.current.submit(); await result.current.getReview(); });
    expect(api.dynamicSubmit).not.toHaveBeenCalled(); expect(api.dynamicReview).toHaveBeenCalledTimes(1);
  });
});

describe("read-only Dynamic recovery", () => {
  const savedRequest = { provider_account_id: 2, beneficiary_id: 4, balance_id: 3,
    accepted_fingerprint: "a".repeat(64), client_reference: `DYN-${"a".repeat(64)}` };

  it("recovers a lost UUID by exact reference even after expiry without another POST", async () => {
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ request: savedRequest }));
    api.dynamicTransfers.mockResolvedValueOnce(page([transfer()])); api.dynamicStatus.mockResolvedValue(transfer());
    const { result } = mount(); await waitFor(() => expect(result.current.saved?.request).toEqual(savedRequest));
    await act(async () => { await result.current.submit(); });
    expect(api.dynamicTransfers).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, { client_reference: savedRequest.client_reference });
    await waitFor(() => expect(result.current.transfer?.status).toBe("pending_provider_confirmation"));
    expect(result.current.saved?.id).toBe(transfer().id); expect(result.current.locked).toBe(true);
    expect(api.dynamicSubmit).not.toHaveBeenCalled(); expect(api.dynamicQuote).not.toHaveBeenCalled();
    expect(result.current.startAnother()).toBeUndefined();
  });

  it.each(["empty", "failure", "malformed", "ambiguous", "foreign beneficiary"])("retains the saved identity on %s lookup and never initiates", async (kind) => {
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ request: savedRequest }));
    if (kind === "failure") api.dynamicTransfers.mockRejectedValueOnce(new ApiRequestError("Lookup failed", 503));
    else api.dynamicTransfers.mockResolvedValueOnce(kind === "empty" ? page() : kind === "malformed"
      ? { ...page([transfer()]), next_page: 2 } : kind === "ambiguous" ? page([transfer()], 1, 2)
      : page([{ ...transfer(), beneficiary: { id: 99, country_code: "GB" } }]));
    const { result } = mount(); await waitFor(() => expect(result.current.saved).not.toBeNull());
    await act(async () => { await result.current.submit(); });
    expect(result.current.recoveryError).not.toBe(""); expect(result.current.saved).toEqual({ request: savedRequest });
    expect(result.current.transfer).toBeNull(); expect(result.current.locked).toBe(true);
    expect(JSON.parse(sessionStorage.getItem("origin-dynamic-payment:12")!)).toEqual({ request: savedRequest });
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("lists and pages owned payments after complete browser identity loss, and opens only an explicitly selected ID", async () => {
    api.dynamicTransfers.mockResolvedValueOnce(page([transfer()], 1, 2)).mockResolvedValueOnce(page([], 2));
    api.dynamicStatus.mockResolvedValue(transfer());
    const { result } = mount(); await ready(result);
    await act(async () => { await result.current.lookupRecent(); });
    expect(result.current.recoveryPage?.next_page).toBe(2); expect(result.current.saved).toBeNull();
    expect(api.dynamicStatus).not.toHaveBeenCalled();
    await act(async () => { await result.current.lookupRecent(2); });
    expect(api.dynamicTransfers).toHaveBeenLastCalledWith({ userId: "12", token: "customer-token" }, { page: 2 });
    await act(async () => { await result.current.lookupId(transfer().id); });
    expect(result.current.saved).toEqual({ id: transfer().id, beneficiaryId: 4 });
    expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("uses a manually retained exact reference after complete browser storage loss", async () => {
    api.dynamicTransfers.mockResolvedValueOnce(page([transfer()])); api.dynamicStatus.mockResolvedValue(transfer());
    const { result } = mount(); await ready(result);
    await act(async () => { await result.current.lookupReference("Case.Exact:reference"); });
    expect(api.dynamicTransfers).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, { client_reference: "Case.Exact:reference" });
    expect(result.current.saved).toEqual({ id: transfer().id, beneficiaryId: 4 });
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("allows read-only recovery when creation is unavailable", async () => {
    api.dynamicTransfers.mockResolvedValueOnce(page([transfer()])); api.dynamicStatus.mockResolvedValue(transfer());
    const { result } = renderHook(() => useDynamicPayment(null, false, []));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => { await result.current.lookupReference("Existing.reference"); });
    expect(result.current.transfer?.id).toBe(transfer().id);
    expect(result.current.locked).toBe(true); expect(result.current.accepted).toBe(false);
    expect(api.dynamicQuote).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each(["not found", "changed ID"])("keeps direct ID recovery read-only on %s", async (failure) => {
    if (failure === "not found") api.dynamicStatus.mockRejectedValueOnce(new ApiRequestError("Not found", 404));
    else api.dynamicStatus.mockResolvedValueOnce({ ...transfer(), id: "33333333-3333-4333-8333-333333333333" });
    const { result } = mount(); await ready(result);
    await act(async () => { await result.current.lookupId(transfer().id); });
    expect(result.current.recoveryError).not.toBe(""); expect(result.current.saved).toBeNull(); expect(result.current.transfer).toBeNull();
    expect(api.dynamicSubmit).not.toHaveBeenCalled(); expect(api.dynamicTransfers).not.toHaveBeenCalled();
  });

  it("rejects altered exact lookup input without silently trimming it", async () => {
    const { result } = mount(); await ready(result);
    await act(async () => { await result.current.lookupReference("Exact.reference\n"); await result.current.lookupId(`${transfer().id}\n`); });
    expect(result.current.recoveryError).not.toBe("");
    expect(api.dynamicTransfers).not.toHaveBeenCalled(); expect(api.dynamicStatus).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("allows only one pending recovery lookup and never initiates from duplicate clicks", async () => {
    const response = deferred<ReturnType<typeof page>>(); api.dynamicTransfers.mockReturnValueOnce(response.promise);
    const { result } = mount(); await ready(result);
    let first: Promise<void>;
    act(() => { first = result.current.lookupRecent(); void result.current.lookupRecent(); });
    expect(api.dynamicTransfers).toHaveBeenCalledTimes(1);
    await act(async () => { response.resolve(page([transfer()])); await first; });
    expect(result.current.recoveryPage?.data).toEqual([transfer()]); expect(result.current.saved).toBeNull();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("restores an ID-only recovery record and polls GET status without requiring consent or an unexpired quote", async () => {
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ id: transfer().id, beneficiaryId: 4 }));
    api.dynamicStatus.mockResolvedValue(transfer());
    const { result } = mount(); await waitFor(() => expect(result.current.transfer?.id).toBe(transfer().id));
    expect(api.dynamicStatus).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, transfer().id);
    expect(api.dynamicTransfers).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("discards a late lookup response and clears displayed records when the authenticated customer changes", async () => {
    const old = deferred<ReturnType<typeof page>>(); api.dynamicTransfers.mockReturnValueOnce(old.promise);
    const { result, rerender } = mount(); await ready(result);
    let lookup: Promise<void>; act(() => { lookup = result.current.lookupRecent(); });
    session.user = { id: "13" }; session.token = "other-customer-token";
    rerender({ selected: null, balances: [] });
    await act(async () => { old.resolve(page([transfer()])); await lookup; });
    expect(result.current.recoveryPage).toBeNull(); expect(result.current.transfer).toBeNull(); expect(result.current.activity).toEqual([]);
    await act(async () => { await result.current.lookupRecent(); });
    expect(api.dynamicTransfers).toHaveBeenLastCalledWith({ userId: "13", token: "other-customer-token" }, { page: 1 });
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });
});

// Synthetic customer-authorized contracts exercise UI behavior only; they do not assert live corridor availability.
const advanceQuoteClock = async (milliseconds: number) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
};
describe("500 ms Dynamic Auto-Quote", () => {
  it.each([
    ["GB", "GBP", 2, "784.12"], ["DE", "EUR", 1, "784.1"], ["JP", "JPY", 0, "784"], ["SG", "SGD", 2, "784.12"],
  ] as const)("uses backend %s/%s precision %s in both directions without a projection loop", async (country, currency, scale, credit) => {
    const payee = { ...beneficiary, country_code: country, currency };
    api.dynamicOptions.mockResolvedValueOnce({ ...options([currency]), currency_scales: { USD: 2, [currency]: scale },
      beneficiary: { ...options().beneficiary, country_code: country, currency } });
    api.dynamicQuote.mockImplementation(async (_auth, body) => ({ ...quote(body.amount_mode), entered_amount: body.entered_amount,
      customer_pricing: { ...pricing, country, destination: currency }, destination_currency: currency,
      quoted_destination_amount: { currency, amount: credit } }));
    const { result, rerender } = renderHook(() => useDynamicPayment(payee, true, [wallet]));
    await waitFor(() => expect(result.current.currency).toBe(currency));
    await waitFor(() => expect(result.current.busy).toBe(false));
    vi.useFakeTimers();
    expect(result.current.sourceCurrency).toBe(wallet.currency);
    await advanceQuoteClock(1000);
    expect(api.dynamicQuote).not.toHaveBeenCalled(); // Opening details / expiry clock cannot quote.
    act(() => result.current.changeSendAmount("1000.00"));
    await advanceQuoteClock(499); expect(api.dynamicQuote).not.toHaveBeenCalled();
    await advanceQuoteClock(1);
    expect(result.current.quoteState).toBe("valid");
    expect(result.current.sendAmount).toBe("1000.00"); expect(result.current.receiveAmount).toBe(credit);
    expect(api.dynamicQuote).toHaveBeenLastCalledWith(expect.anything(), {
      beneficiary_id: 4, destination_currency: currency, amount_mode: "SOURCE_AMOUNT", entered_amount: "1000.00",
    }, expect.any(AbortSignal));
    rerender(); await advanceQuoteClock(1000);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
    act(() => result.current.changeReceiveAmount(credit));
    expect(result.current.sendAmount).toBe("");
    await advanceQuoteClock(500);
    expect(result.current.mode).toBe("DESTINATION_AMOUNT"); expect(result.current.receiveAmount).toBe(credit);
    expect(result.current.sendAmount).toBe("1000.00");
    expect(api.dynamicQuote).toHaveBeenLastCalledWith(expect.anything(), {
      beneficiary_id: 4, destination_currency: currency, amount_mode: "DESTINATION_AMOUNT", entered_amount: credit,
    }, expect.any(AbortSignal));
    await advanceQuoteClock(10000);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(2);
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("restarts the full debounce for each edit and preserves the final input bytes", async () => {
    const { result } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeReceiveAmount("7")); await advanceQuoteClock(300);
    act(() => result.current.changeReceiveAmount("78")); await advanceQuoteClock(300);
    act(() => result.current.changeReceiveAmount("784.00")); await advanceQuoteClock(499);
    expect(api.dynamicQuote).not.toHaveBeenCalled();
    await advanceQuoteClock(1);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
    expect(result.current.receiveAmount).toBe("784.00"); expect(result.current.sendAmount).toBe("1000.00");
  });

  it.each(["", "0", "0.00", "-1", "1e3", " 10", "1.", "1.001", "1000000000000"])("does not request an invalid amount %j", async (value) => {
    const { result } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeReceiveAmount(value)); await advanceQuoteClock(2000);
    expect(result.current.receiveAmount).toBe(value); expect(result.current.sendAmount).toBe("");
    expect(api.dynamicQuote).not.toHaveBeenCalled(); expect(api.dynamicReview).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiRequestError("Unavailable", 503), "unavailable"],
    [new ApiRequestError("Connection failed", 0), "connection_error"],
    [new ApiRequestError("Funds", 409, undefined, { reason_codes: ["dynamic_insufficient_available_funds"] }), "insufficient_funds"],
  ] as const)("clears stale terms on failure and never retries: %s", async (failure, state) => {
    const { result, rerender } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(500);
    expect(result.current.receiveAmount).toBe("784.00");
    api.dynamicQuote.mockRejectedValueOnce(failure);
    act(() => result.current.changeReceiveAmount("784.00")); await advanceQuoteClock(500);
    expect(result.current.quoteState).toBe(state); expect(result.current.quote).toBeNull();
    expect(result.current.receiveAmount).toBe("784.00"); expect(result.current.sendAmount).toBe("");
    rerender({ selected: { ...beneficiary }, balances: [{ ...wallet }] }); await advanceQuoteClock(60000);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(2); expect(api.dynamicOptions).toHaveBeenCalledTimes(1);
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("aborts an obsolete request and ignores it even if transport still resolves", async () => {
    const old = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(old.promise);
    const { result } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(500);
    const signal = api.dynamicQuote.mock.calls[0][2] as AbortSignal;
    expect(result.current.quoteState).toBe("loading");
    act(() => result.current.changeReceiveAmount("784.00")); expect(signal.aborted).toBe(true);
    await advanceQuoteClock(500);
    await act(async () => { old.resolve(quote("SOURCE_AMOUNT", "obsolete")); await old.promise; });
    expect(result.current.quote?.dynamic_quote_id).toBe("quote-1"); expect(result.current.mode).toBe("DESTINATION_AMOUNT");
    expect(result.current.receiveAmount).toBe("784.00"); expect(api.dynamicQuote).toHaveBeenCalledTimes(2);
  });

  it.each(["id", "external_account_id", "currency"] as const)("invalidates a pending quote when the existing source wallet %s changes", async (field) => {
    const old = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(old.promise);
    const { result, rerender } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(500);
    const signal = api.dynamicQuote.mock.calls[0][2] as AbortSignal;
    const changed = field === "id" ? { ...wallet, id: 99 } : field === "currency" ? { ...wallet, currency: "EUR" }
      : { ...wallet, external_account_id: "changed-account" };
    rerender({ selected: { ...beneficiary }, balances: [changed] });
    expect(signal.aborted).toBe(true);
    await act(async () => { old.resolve(quote()); await old.promise; });
    expect(result.current.quote).toBeNull(); expect(result.current.review).toBeNull(); expect(result.current.accepted).toBe(false);
    await advanceQuoteClock(5000); expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
  });

  it("cancels a debounce on beneficiary/rail switch and requires a fresh user edit", async () => {
    const { result, rerender } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(499);
    api.dynamicOptions.mockResolvedValueOnce({ ...options(["EUR"]), beneficiary: { id: 5, name: "Other", country_code: "DE", currency: "EUR" } });
    await act(async () => { rerender({ selected: { ...beneficiary, id: 5, country_code: "DE", currency: "EUR" }, balances: [wallet] }); });
    await advanceQuoteClock(5000);
    expect(result.current.currency).toBe("EUR"); expect(result.current.quote).toBeNull(); expect(api.dynamicQuote).not.toHaveBeenCalled();
    api.dynamicOptions.mockResolvedValueOnce({ ...options(["EUR"]), beneficiary: { id: 5, name: "Other", country_code: "DE", currency: "EUR" } });
    await act(async () => { rerender({ selected: { ...beneficiary, id: 5, country_code: "DE", currency: "EUR", payout_method: "SWIFT" }, balances: [wallet] }); });
    await advanceQuoteClock(1000); expect(result.current.available).toBe(false); expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it("expires without polling, rejects an expired response, and never advances automatically", async () => {
    // Install before mounting so the hook's expiry interval uses the same clock as Date.now().
    vi.useFakeTimers();
    const { result } = mount();
    await advanceQuoteClock(0);
    expect(result.current.currency).toBe("GBP"); expect(result.current.busy).toBe(false);
    expect(result.current.ready).toBe(true);
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(500);
    expect(result.current.quoteState).toBe("valid"); expect(result.current.expired).toBe(false);
    await advanceQuoteClock(301000);
    expect(result.current.expired).toBe(true);
    expect(result.current.quoteState).toBe("expired"); expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
    api.dynamicQuote.mockResolvedValueOnce({ ...quote(), quote_expires_at: new Date(Date.now() - 1).toISOString() });
    act(() => result.current.changeSendAmount("1000.00")); await advanceQuoteClock(500);
    expect(result.current.quoteState).toBe("expired"); expect(result.current.quote).toBeNull();
    expect(result.current.sendAmount).toBe("1000.00"); expect(result.current.receiveAmount).toBe("");
    await advanceQuoteClock(5000);
    expect(api.dynamicQuote).toHaveBeenCalledTimes(2); expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each(["debounce", "request"] as const)("cancels %s work on unmount", async (phase) => {
    const old = deferred<DynamicQuote>(); api.dynamicQuote.mockReturnValueOnce(old.promise);
    const { result, unmount } = mount(); await ready(result); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000"));
    if (phase === "request") await advanceQuoteClock(500);
    const signal = api.dynamicQuote.mock.calls[0]?.[2] as AbortSignal | undefined;
    unmount(); await advanceQuoteClock(5000);
    if (phase === "request") expect(signal?.aborted).toBe(true);
    else expect(api.dynamicQuote).not.toHaveBeenCalled();
    await act(async () => { old.resolve(quote()); await old.promise; });
    expect(api.dynamicReview).not.toHaveBeenCalled(); expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("keeps an unverified source financial contract unavailable", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ ...options(), source_currency: "EUR", currency_scales: { EUR: 2, GBP: 2 } });
    const { result, rerender } = mount();
    rerender({ selected: beneficiary, balances: [{ ...wallet, currency: "EUR" }] });
    await waitFor(() => expect(result.current.busy).toBe(false)); vi.useFakeTimers();
    act(() => result.current.changeSendAmount("1000")); await advanceQuoteClock(5000);
    expect(result.current.available).toBe(false); expect(result.current.quoteState).toBe("unavailable");
    expect(api.dynamicQuote).not.toHaveBeenCalled();
  });
});
