import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccountTransfers from "./AccountTransfers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountDynamicTransfer from "./AccountDynamicTransfer";
import { ApiRequestError } from "@/services/apiClient";
import type { DynamicMode, DynamicQuote, DynamicReview, DynamicTransfer } from "@/services/niumDynamicService";

const api = vi.hoisted(() => ({ getProviders: vi.fn(), getBeneficiaries: vi.fn(), getNiumPurposeCodes: vi.fn(),
  getBalances: vi.fn(), getTransfers: vi.fn(), getTransfer: vi.fn(), getBeneficiary: vi.fn(),
  createTransfer: vi.fn(), submitTransfer: vi.fn(), syncTransferStatus: vi.fn(), cancelTransfer: vi.fn(), dynamicOptions: vi.fn(),
  dynamicQuote: vi.fn(), dynamicReview: vi.fn(), dynamicSubmit: vi.fn(), dynamicStatus: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);
vi.mock("@/services/fxOrderService", () => api);
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
const clients: QueryClient[] = [];
const Location = () => <output aria-label="Current route">{useLocation().pathname}</output>;
const mount = (path = "/account/transfers") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Location /><Routes>
    <Route path="/account/transfers" element={<AccountTransfers />} />
    <Route path="/account/transfers/dynamic" element={<AccountDynamicTransfer />} />
  </Routes></MemoryRouter></QueryClientProvider>);
};
async function quotePayment(mode: DynamicMode = "SOURCE_AMOUNT") {
  fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
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
  vi.resetAllMocks(); sessionStorage.clear(); localStorage.clear();
  api.getProviders.mockResolvedValue({ data: [{ id: 10, code: "nium", name: "Nium", status: "active", supports_transfers: true }] });
  api.getBeneficiaries.mockResolvedValue([{ id: 4, provider_id: 10, full_name: "GBP Payee", currency: "GBP", payout_method: "LOCAL", status: "active", country_code: "GB" }]);
  api.getBalances.mockResolvedValue([{ id: 3, provider_id: 10, currency: "USD", available_balance: "5000" }]);
  api.getTransfers.mockResolvedValue([]);
  api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "IR005", label: "Payment purpose" }] });
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
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); sessionStorage.clear(); localStorage.clear(); vi.restoreAllMocks(); });

describe("Move funds Dynamic payment", () => {
  it("uses the existing recipient cards before requesting authoritative currencies", async () => {
    mount();
    const payee = await screen.findByRole("button", { name: /GBP Payee/ });
    expect(screen.getByRole("heading", { name: "Move funds" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /GBP Payee/ })).toHaveLength(1);
    expect(screen.queryByLabelText("Beneficiary")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Recipient currency")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Multi-currency payment" })).not.toBeInTheDocument();
    expect(api.dynamicOptions).not.toHaveBeenCalled();
    fireEvent.click(payee);
    await screen.findByRole("option", { name: "GBP" });
    expect(api.getBeneficiaries).toHaveBeenCalledTimes(1);
    expect(api.dynamicOptions).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, 4);
    expect(within(screen.getByLabelText("Recipient currency")).getAllByRole("option").map((option) => option.textContent))
      .toEqual(["Select recipient currency", "GBP"]);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Payment details");
  });

  it("shows no invented currencies when the backend reports an unavailable corridor", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ beneficiary: { id: 4, name: "GBP Payee", currency: "GBP", country_code: "GB" },
      status: "UNAVAILABLE", reason_codes: ["dynamic_customer_corridor_not_permitted"],
      quote_availability: { status: "UNAVAILABLE", destination_currencies: [], reason_codes: ["dynamic_customer_corridor_not_permitted"] } });
    mount(); fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
    await screen.findByText("This beneficiary currently has no available recipient currency.");
    expect(within(screen.getByLabelText("Recipient currency")).getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Request Nium quote" })).toBeDisabled();
    expect(screen.getByText("This payment corridor is unavailable for your Nium account.")).toBeVisible();
    expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it.each([
    ["HK", "USD", "SWIFT"], ["SG", "SGD", "LOCAL"], ["GB", "GBP", "SWIFT"], ["US", "USD", null],
  ])("checks backend Dynamic eligibility for %s/%s/%s and never falls back on refusal", async (country, currency, method) => {
    const payee = { id: 4, provider_id: 10, full_name: "Checked payee", beneficiary_type: "individual",
      currency, payout_method: method, status: "active", country_code: country,
      payout_admission: country === "SG" ? { allowed: false, reason: "financial_terms_unverified", preparation_allowed: true,
        beneficiary_id: 4, provider_id: 10, source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" } : null };
    api.getBeneficiaries.mockResolvedValueOnce([payee]);
    // Mirrors the current backend refusal; reaching this check does not grant production support.
    api.dynamicOptions.mockResolvedValueOnce({ beneficiary: { id: 4, name: payee.full_name, currency, country_code: country },
      status: "UNAVAILABLE", reason_codes: ["dynamic_corridor_unsupported"],
      quote_availability: { status: "UNAVAILABLE", destination_currencies: [], reason_codes: ["dynamic_corridor_unsupported"] } });
    mount(); fireEvent.click(await screen.findByRole("button", { name: /Checked payee/ }));
    const dynamicMethod = screen.getByRole("radio", { name: "Dynamic Multi-Currency" });
    if (!(dynamicMethod as HTMLInputElement).checked) fireEvent.click(dynamicMethod);
    await screen.findByText("Dynamic is unavailable for this beneficiary's corridor.");
    expect(api.dynamicOptions).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, 4);
    expect(dynamicMethod).toBeChecked();
    expect(screen.getByRole("button", { name: "Request Nium quote" })).toBeDisabled();
    expect(screen.queryByPlaceholderText("Enter an amount")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(api.dynamicQuote).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });

  it("fails closed and shows an unknown backend refusal even if it includes currencies", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ beneficiary: { id: 4, name: "GBP Payee", currency: "GBP", country_code: "GB" },
      status: "UNAVAILABLE", reason_codes: ["dynamic_provider_account_ineligible"],
      quote_availability: { status: "UNAVAILABLE", destination_currencies: ["GBP"], reason_codes: ["dynamic_provider_account_ineligible"] } });
    mount(); fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
    await screen.findByText(/dynamic_provider_account_ineligible/);
    expect(screen.getByLabelText("Recipient currency")).toBeDisabled();
    expect(within(screen.getByLabelText("Recipient currency")).queryByRole("option", { name: "GBP" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Nium quote" })).toBeDisabled();
    expect(api.dynamicQuote).not.toHaveBeenCalled();
  });

  it.each(["approved", "verified"])("lets a backend-eligible %s recipient reach the currency check", async (status) => {
    api.getBeneficiaries.mockResolvedValueOnce([{ id: 4, provider_id: 10, full_name: "GBP Payee", currency: "GBP", payout_method: "LOCAL", status, country_code: "GB" }]);
    mount(); fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
    await screen.findByRole("option", { name: "GBP" });
    expect(api.dynamicOptions).toHaveBeenCalledTimes(1);
  });

  it("redirects old Dynamic links to Move funds and recovers their saved operation", async () => {
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ request }));
    mount("/account/transfers/dynamic");
    expect(await screen.findByRole("button", { name: "Recover same submission" })).toBeEnabled();
    expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/account\/transfers$/);
    expect(screen.getByRole("heading", { name: "Move funds" })).toBeVisible();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ["HK", "USD", "SWIFT"], ["SG", "SGD", "LOCAL"],
  ])("keeps existing %s %s %s selection on its original details step", async (country, currency, method) => {
    api.getBeneficiaries.mockResolvedValueOnce([{ id: 4, provider_id: 10, full_name: "Legacy payee", beneficiary_type: "individual",
      currency, payout_method: method, status: "active", country_code: country,
      payout_admission: currency === "SGD" ? { allowed: false, reason: "financial_terms_unverified", preparation_allowed: true,
        beneficiary_id: 4, provider_id: 10, source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" } : null }]);
    mount(); fireEvent.click(await screen.findByRole("button", { name: /Legacy payee/ }));
    expect(await screen.findByPlaceholderText("Enter an amount")).toBeVisible();
    expect(screen.getByRole("radio", { name: `Existing ${currency} ${method} payment` })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dynamic Multi-Currency" })).not.toBeChecked();
    expect(screen.queryByLabelText("Amount mode")).not.toBeInTheDocument();
    expect(api.dynamicOptions).not.toHaveBeenCalled();
    expect(api.dynamicQuote).not.toHaveBeenCalled();
    expect(api.dynamicReview).not.toHaveBeenCalled();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ["HK", "USD", "SWIFT", "980", "1"], ["SG", "SGD", "LOCAL", "1274", "1.3"],
  ])("explicitly switches %s/%s/%s between legacy and Dynamic and discards old consent", async (country, currency, method, credit, rate) => {
    const payee = { id: 4, provider_id: 10, full_name: "Method payee", beneficiary_type: "individual",
      currency, payout_method: method, status: "active", country_code: country,
      payout_admission: currency === "SGD" ? { allowed: false, reason: "financial_terms_unverified", preparation_allowed: true,
        beneficiary_id: 4, provider_id: 10, source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL" } : null };
    api.getBeneficiaries.mockResolvedValueOnce([payee]);
    // Synthetic authorized HTTP responses exercise UI switching only. Current backend holds are unchanged.
    api.dynamicOptions.mockResolvedValue({ beneficiary: { id: 4, name: payee.full_name, currency, country_code: country },
      status: "QUOTE_REFERENCE_ONLY", reason_codes: [],
      quote_availability: { status: "QUOTE_REFERENCE_ONLY", destination_currencies: [currency], reason_codes: [] } });
    api.dynamicQuote.mockResolvedValue({ ...makeQuote(), destination_currency: currency,
      quoted_destination_amount: { currency, amount: credit }, nium_quoted_fx_rate: rate });
    mount(); fireEvent.click(await screen.findByRole("button", { name: /Method payee/ }));
    const legacyName = `Existing ${currency} ${method} payment`;
    expect(screen.getByRole("radio", { name: legacyName })).toBeChecked();
    fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("radio", { name: "Dynamic Multi-Currency" }));
    await screen.findByRole("option", { name: currency });
    expect(screen.getByLabelText("Payment amount")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Recipient currency"), { target: { value: currency } });
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
    await screen.findByRole("region", { name: "Quoted payment" });
    await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Submit payment" })).toBeEnabled();
    fireEvent.click(screen.getByRole("radio", { name: legacyName }));
    expect(screen.getByRole("radio", { name: legacyName })).toBeChecked();
    expect(screen.getByPlaceholderText("Enter an amount")).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Payment summary" })).queryByText("USD 1000")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Dynamic Multi-Currency" }));
    await screen.findByRole("option", { name: currency });
    expect(screen.getByLabelText("Recipient currency")).toHaveValue("");
    expect(screen.getByLabelText("Payment amount")).toHaveValue("");
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(api.dynamicQuote).toHaveBeenCalledTimes(1);
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });

  it("discards quote, Review and consent when switching to another backend-provided currency", async () => {
    api.dynamicOptions.mockResolvedValueOnce({ beneficiary: { id: 4, name: "GBP Payee", currency: "GBP", country_code: "GB" },
      status: "QUOTE_REFERENCE_ONLY", reason_codes: [],
      quote_availability: { status: "QUOTE_REFERENCE_ONLY", destination_currencies: ["GBP", "EUR"], reason_codes: [] } });
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(screen.getByLabelText("Recipient currency"), { target: { value: "EUR" } });
    expect(screen.getByLabelText("Recipient currency")).toHaveValue("EUR");
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("rejects a changed quote identity or entered amount before Review", async () => {
    api.dynamicQuote.mockResolvedValueOnce({ ...makeQuote(), beneficiary_id: 99 });
    mount(); fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
    await screen.findByRole("option", { name: "GBP" });
    fireEvent.change(screen.getByLabelText("Recipient currency"), { target: { value: "GBP" } });
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("quoted amounts do not match");
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    api.dynamicQuote.mockResolvedValueOnce({ ...makeQuote(), entered_amount: "1001" });
    fireEvent.click(screen.getByRole("button", { name: "Request Nium quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("quoted amounts do not match");
    expect(api.dynamicReview).not.toHaveBeenCalled();
  });

  it("clears the quote, Review and consent when the entered amount changes", async () => {
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(screen.getByLabelText("Payment amount"), { target: { value: "1200" } });
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Payment summary" })).queryByText("USD 1000")).not.toBeInTheDocument();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
  });

  it("retains legacy transfer history alongside the Dynamic payment", async () => {
    api.getTransfers.mockResolvedValue([{ id: 55, transfer_no: "LEGACY-HK-55", provider_id: 10, beneficiary_id: 9,
      transfer_type: "payout", source_currency: "USD", target_currency: "USD", source_amount: "100", status: "completed" }]);
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    await screen.findByRole("region", { name: "Payment status" });
    const activity = document.getElementById("transfer-activity")!;
    expect(within(activity).getByText("LEGACY-HK-55")).toBeVisible();
    await waitFor(() => expect(within(activity).getByText(makeTransfer().id)).toBeVisible());
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });

  it.each(["SOURCE_AMOUNT", "DESTINATION_AMOUNT"] as const)("quotes, reviews and submits %s with one included fee", async (mode) => {
    mount(); await quotePayment(mode);
    expect(within(screen.getByRole("region", { name: "Quoted payment" })).getByText("Principal: USD 980")).toBeVisible();
    await reviewPayment();
    const review = await screen.findByRole("region", { name: "Authoritative payment review" });
    expect(within(review).getByText("Total wallet debit: USD 1000")).toBeVisible();
    expect(within(review).getByText("Included fee: USD 20")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Payment summary" })).getByText("USD 1000")).toBeVisible();
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Review");
    expect(screen.getByLabelText("Current route")).toHaveTextContent("/account/transfers");
    expect(api.dynamicQuote).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, expect.objectContaining({ amount_mode: mode, entered_amount: mode === "SOURCE_AMOUNT" ? "1000" : "784" }));
    fireEvent.click(screen.getByRole("checkbox"));
    const submit = screen.getByRole("button", { name: "Submit payment" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByRole("region", { name: "Payment status" });
    await waitFor(() => expect(api.dynamicSubmit).toHaveBeenCalledTimes(1));
    expect(api.dynamicSubmit).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, request);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Submit");
    expect(screen.getByText("Transfer activity")).toBeVisible();
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
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

  it("shows a backend Review refusal without changing payment methods", async () => {
    api.dynamicReview.mockResolvedValueOnce({ ...makeReview(), status: "UNAVAILABLE",
      reason_codes: ["dynamic_customer_corridor_not_permitted"] });
    mount(); await quotePayment(); await reviewPayment();
    expect(await screen.findByRole("alert")).toHaveTextContent("This payment corridor is unavailable for your Nium account.");
    expect(screen.getByRole("radio", { name: "Dynamic Multi-Currency" })).toBeChecked();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(api.dynamicSubmit).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });

  it("rejects insufficient balance and expired quote before consent", async () => {
    api.dynamicQuote.mockRejectedValueOnce(new ApiRequestError("Insufficient balance", 409, undefined,
      { reason_codes: ["dynamic_insufficient_available_funds"] }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
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
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.queryByRole("region", { name: "Authoritative payment review" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Quoted payment" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Recipient currency")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /GBP Payee/ }));
    await screen.findByRole("option", { name: "GBP" });
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

  it("requires a fresh Review after a definitive pre-admission balance refusal", async () => {
    api.dynamicSubmit.mockRejectedValueOnce(new ApiRequestError("Insufficient funds", 409, undefined,
      { reason_codes: ["dynamic_insufficient_available_funds"] }));
    mount(); await quotePayment(); await reviewPayment();
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("cannot cover");
    await screen.findByRole("button", { name: "Review payment" });
    expect(screen.queryByRole("region", { name: "Payment status" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit payment" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("origin-dynamic-payment:12")).toBeNull();
    expect(api.dynamicSubmit).toHaveBeenCalledTimes(1);
  });

  it("returns to recipient selection when recovery definitively refuses an expired operation after reload", async () => {
    sessionStorage.setItem("origin-dynamic-payment:12", JSON.stringify({ request }));
    api.dynamicSubmit.mockRejectedValueOnce(new ApiRequestError("Quote expired", 409, undefined,
      { reason_codes: ["dynamic_quote_expired"] }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Recover same submission" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("quote expired");
    expect(await screen.findByRole("button", { name: /GBP Payee/ })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Payment status" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("origin-dynamic-payment:12")).toBeNull();
    expect(api.dynamicSubmit).toHaveBeenCalledWith({ userId: "12", token: "customer-token" }, request);
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
