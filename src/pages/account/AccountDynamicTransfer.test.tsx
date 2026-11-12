import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountDynamicTransfer from "./AccountDynamicTransfer";
import { ApiRequestError } from "@/services/apiClient";
import type { DynamicMode, DynamicQuote, DynamicReview, DynamicTransfer } from "@/services/niumDynamicService";

const api = vi.hoisted(() => ({ getProviders: vi.fn(), getBeneficiaries: vi.fn(), dynamicOptions: vi.fn(),
  dynamicQuote: vi.fn(), dynamicReview: vi.fn(), dynamicSubmit: vi.fn(), dynamicStatus: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => ({ getBeneficiaries: api.getBeneficiaries }));
vi.mock("@/services/fxOrderService", () => ({ getProviders: api.getProviders }));
vi.mock("@/services/niumDynamicService", () => api);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "12", kycStatus: "approved" }, token: "customer-token" }) }));
const fingerprint = "a".repeat(64);
const request = { beneficiary_id: 4, provider_account_id: 2, balance_id: 3, accepted_fingerprint: fingerprint, client_reference: `DYN-${fingerprint}` };
const instruction = { purpose_code: "IR005", source_of_funds: "Salary", comment: "Invoice" };
const makeQuote = (mode: DynamicMode = "SOURCE_AMOUNT"): DynamicQuote => ({ status: "QUOTE_REFERENCE_ONLY",
  dynamic_quote_id: "11111111-1111-4111-8111-111111111111", provider_quote_id: "provider-quote", beneficiary_id: 4,
  amount_mode: mode, entered_amount: mode === "SOURCE_AMOUNT" ? "1000" : "784", source_currency: "USD", destination_currency: "GBP",
  quote_expires_at: new Date(Date.now() + 300000).toISOString(), quoted_principal: { currency: "USD", amount: "980" },
  planned_included_fee: { currency: "USD", amount: "20" }, planned_total_usd_debit: "1000",
  quoted_destination_amount: { currency: "GBP", amount: "784" }, nium_quoted_fx_rate: "0.8" });
const makeReview = (quote = makeQuote()): DynamicReview => ({ status: "READY", review_id: "review-server", accepted_fingerprint: fingerprint,
  provider_account_id: 2, balance_id: 3, beneficiary_id: 4, dynamic_quote_id: quote.dynamic_quote_id,
  amount_mode: quote.amount_mode, entered_amount: quote.entered_amount, quote_expires_at: quote.quote_expires_at,
  principal: quote.quoted_principal, included_fee: quote.planned_included_fee, total_usd_debit: "1000",
  destination_amount: quote.quoted_destination_amount, instruction, reason_codes: [] });
const makeTransfer = (status: DynamicTransfer["status"] = "processing"): DynamicTransfer => ({
  id: "22222222-2222-4222-8222-222222222222", beneficiary: { id: 4, country_code: "GB" }, source_currency: "USD", destination_currency: "GBP",
  amount_mode: "SOURCE_AMOUNT", total_usd_debit: "1000", principal: { currency: "USD", amount: "980" },
  included_fee: { currency: "USD", amount: "20" }, destination_amount: { currency: "GBP", amount: "784" },
  status, financial_reconciled: status === "paid", message: `Provider state: ${status}`, quote_expires_at: makeQuote().quote_expires_at });
const mount = () => render(<MemoryRouter><AccountDynamicTransfer /></MemoryRouter>);
async function quotePayment(mode: DynamicMode = "SOURCE_AMOUNT") {
  await screen.findByRole("option", { name: "GBP Payee (GBP)" });
  fireEvent.change(screen.getByLabelText("Beneficiary"), { target: { value: "4" } });
  await screen.findByRole("option", { name: "GBP" });
  fireEvent.change(screen.getByLabelText("Recipient currency"), { target: { value: "GBP" } });
  fireEvent.change(screen.getByLabelText("Amount mode"), { target: { value: mode } });
  fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: mode === "SOURCE_AMOUNT" ? "1000" : "784" } });
  fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
  await screen.findByRole("region", { name: "Quoted payment" });
}
async function reviewPayment() {
  fireEvent.change(screen.getByLabelText("Payment purpose code"), { target: { value: "IR005" } });
  fireEvent.change(screen.getByLabelText("Source of funds"), { target: { value: "Salary" } });
  fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "Invoice" } });
  fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
}
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear();
  api.getProviders.mockResolvedValue({ data: [{ id: 10, code: "nium", status: "active" }] });
  api.getBeneficiaries.mockResolvedValue([{ id: 4, provider_id: 10, full_name: "GBP Payee", currency: "GBP", payout_method: "LOCAL", status: "active", country_code: "GB" }]);
  api.dynamicOptions.mockResolvedValue({ beneficiary: { id: 4, name: "GBP Payee", currency: "GBP", country_code: "GB" },
    status: "QUOTE_REFERENCE_ONLY", reason_codes: [], quote_availability: { status: "QUOTE_REFERENCE_ONLY", destination_currencies: ["GBP"], reason_codes: [] } });
  api.dynamicQuote.mockImplementation(async (_auth, body) => makeQuote(body.amount_mode));
  // These are synthetic HTTP contract fixtures. Production assembly is covered
  // separately by backend tests using the real source and mocked provider transport.
  api.dynamicReview.mockImplementation(async () => {
    const results = api.dynamicQuote.mock.results;
    return makeReview(await results[results.length - 1]!.value);
  });
  api.dynamicSubmit.mockResolvedValue(makeTransfer()); api.dynamicStatus.mockResolvedValue(makeTransfer());
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Dynamic customer payment", () => {
  it.each(["SOURCE_AMOUNT", "DESTINATION_AMOUNT"] as const)("quotes, reviews and submits %s with one included fee", async (mode) => {
    mount(); await quotePayment(mode);
    expect(within(screen.getByRole("region", { name: "Quoted payment" })).getByText("Principal: USD 980")).toBeVisible();
    await reviewPayment();
    const review = await screen.findByRole("region", { name: "Authoritative payment review" });
    expect(within(review).getByText("Total wallet debit: USD 1000")).toBeVisible();
    expect(within(review).getByText("Included fee: USD 20")).toBeVisible();
    expect(api.dynamicQuote).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, expect.objectContaining({ amount_mode: mode, entered_amount: mode === "SOURCE_AMOUNT" ? "1000" : "784" }));
    fireEvent.click(screen.getByRole("checkbox"));
    const submit = screen.getByRole("button", { name: "Submit payment" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByRole("region", { name: "Payment status" });
    await waitFor(() => expect(api.dynamicSubmit).toHaveBeenCalledTimes(1));
    expect(api.dynamicSubmit).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, request);
    expect(screen.queryByText(/Admin Approve/i)).not.toBeInTheDocument();
  });

  it("recovers a timeout with the exact same request after reload", async () => {
    api.dynamicSubmit.mockRejectedValueOnce(new ApiRequestError("Network timeout", 0));
    const view = mount(); await quotePayment(); await reviewPayment();
    await screen.findByRole("checkbox"); fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Recover same submission" })).toBeEnabled());
    view.unmount(); mount();
    fireEvent.click(await screen.findByRole("button", { name: "Recover same submission" }));
    await waitFor(() => expect(api.dynamicSubmit).toHaveBeenCalledTimes(2));
    expect(api.dynamicSubmit.mock.calls[0][1]).toEqual(api.dynamicSubmit.mock.calls[1][1]);
    expect(screen.queryByRole("button", { name: "Request Nium quote" })).not.toBeInTheDocument();
  });

  it("keeps submission unavailable for a provider evidence refusal", async () => {
    api.dynamicReview.mockRejectedValue(new ApiRequestError("Review unavailable", 503, undefined,
      { reason_codes: ["dynamic_customer_corridor_response_contract_unavailable"] }));
    mount(); await quotePayment(); await reviewPayment();
    expect(await screen.findByRole("alert")).toHaveTextContent("provider cannot currently verify");
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("rejects insufficient balance and expired quote before consent", async () => {
    api.dynamicQuote.mockRejectedValueOnce(new ApiRequestError("Insufficient balance", 409, undefined,
      { reason_codes: ["dynamic_insufficient_available_funds"] }));
    mount();
    await screen.findByRole("option", { name: "GBP Payee (GBP)" });
    fireEvent.change(screen.getByLabelText("Beneficiary"), { target: { value: "4" } });
    await screen.findByRole("option", { name: "GBP" });
    fireEvent.change(screen.getByLabelText("Recipient currency"), { target: { value: "GBP" } });
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot cover the principal");
    api.dynamicQuote.mockResolvedValueOnce({ ...makeQuote(), quote_expires_at: new Date(Date.now() - 1000).toISOString() });
    fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
    await screen.findByText("Quote expired. Request a new quote.");
    expect(screen.getByRole("button", { name: "Review payment" })).toBeDisabled();
    expect(api.dynamicReview).not.toHaveBeenCalled();
  });

  it("invalidates consent when instructions change and refuses changed server terms", async () => {
    mount(); await quotePayment(); await reviewPayment(); await screen.findByRole("checkbox");
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Payment reference"), { target: { value: "Changed invoice" } });
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    api.dynamicReview.mockResolvedValueOnce({ ...makeReview(), total_usd_debit: "1020" });
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot currently authorize");
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("discards Review and consent when the selected beneficiary changes", async () => {
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Beneficiary"), { target: { value: "" } });
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Recipient currency")).toHaveValue("");
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("refuses submission when the quote expires after consent", async () => {
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 600000);
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("does not send if durable browser recovery cannot be saved first", async () => {
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Recovery storage unavailable"); });
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Recovery storage unavailable");
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("returns to Review after a definitive pre-admission balance refusal", async () => {
    api.dynamicSubmit.mockRejectedValueOnce(new ApiRequestError("Insufficient funds", 409, undefined,
      { reason_codes: ["dynamic_insufficient_available_funds"] }));
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot cover");
    expect(screen.queryByRole("region", { name: "Payment status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("origin-dynamic-payment:12")).toBeNull();
    expect(api.dynamicSubmit).toHaveBeenCalledTimes(1);
  });

  it("blocks consent when authenticated Review observations expire before the quote", async () => {
    mount(); await quotePayment();
    const results = api.dynamicQuote.mock.results;
    const quote = await results[results.length - 1].value;
    api.dynamicReview.mockResolvedValueOnce({ ...makeReview(quote), review_expires_at: new Date(Date.now() - 1000).toISOString() });
    await reviewPayment();
    await screen.findByRole("region", { name: "Authoritative payment review" });
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit payment" })).toBeDisabled();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each(["paid", "failed", "returned", "requires_attention"] as const)("loads the backend %s state without resubmission", async (status) => {
    const transfer = makeTransfer(status);
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ request, id: transfer.id }));
    api.dynamicStatus.mockResolvedValue(transfer); mount();
    expect(await screen.findByText(`Provider state: ${status}`)).toBeVisible();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    if (status !== "paid") expect(screen.queryByRole("button", { name: "Start another payment" })).not.toBeInTheDocument();
  });
});
