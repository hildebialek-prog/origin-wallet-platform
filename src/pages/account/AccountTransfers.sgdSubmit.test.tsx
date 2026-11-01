import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import AccountTransfers from "./AccountTransfers";
import { webcrypto } from "node:crypto";
import { ApiRequestError } from "@/services/apiClient";
import { readPaymentIdentity } from "./paymentSafety";

const api = vi.hoisted(() => ({ getProviders: vi.fn(), getNiumPurposeCodes: vi.fn(), getBalances: vi.fn(),
  getBeneficiaries: vi.fn(), getTransfers: vi.fn(), createTransfer: vi.fn(), reviewTransfer: vi.fn(),
  getTransfer: vi.fn(), getBeneficiary: vi.fn(), requestSgdRecoveryReview: vi.fn(), recoverSgdCapturedOutcome: vi.fn(),
  submitTransfer: vi.fn(), syncTransferStatus: vi.fn(), cancelTransfer: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);
vi.mock("@/services/fxOrderService", () => api);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "12", kycStatus: "approved" }, token: "customer-token" }) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) =>
    <select value={value} onChange={(event) => onValueChange(event.target.value)}><option value="">Select</option>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{typeof children === "string" ? children : value}</option>,
}));

const payee = { id: 9, provider_id: 10, beneficiary_type: "individual", full_name: "Synthetic SG payee",
  country_code: "SG", currency: "SGD", payout_method: "LOCAL", status: "active", payout_admission: {
    allowed: false, reason: "contract_verification_pending", preparation_allowed: true,
    beneficiary_id: 9, provider_id: 10, source_currency: "USD", destination_country: "SG",
    destination_currency: "SGD", payout_method: "LOCAL",
  } };
const clients: QueryClient[] = [];
const transferResponse = (payload: Record<string, unknown>, status = "draft") => ({
  id: 50, transfer_no: "SYNTHETIC-NEW", provider_id: payload.provider_id, beneficiary_id: payload.beneficiary_id,
  transfer_type: "payout", source_currency: "USD", target_currency: payload.target_currency ?? "SGD",
  source_amount: payload.source_amount, purpose_code: payload.purpose_code, reference_text: payload.reference_text,
  client_reference: payload.client_reference, source_bank_account_id: null, fx_quote_id: null, target_amount: null,
  fee_amount: null, fee_currency: null, status,
  payout_workflow: { state: status === "draft" ? "locked" : status, dispatch_allowed: false,
    dispatch_owner: "checker_approval", recovery_required: false, customer_accepted_at: status === "draft" ? null : new Date().toISOString() },
});
const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><MemoryRouter><AccountTransfers /></MemoryRouter></QueryClientProvider>);
};
const details = async (amount = "5") => {
  const payeeButton = await screen.findByRole("button", { name: /Synthetic SG payee/ });
  expect(payeeButton).toBeEnabled();
  fireEvent.click(payeeButton);
  fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: amount } });
  await screen.findByRole("option", { name: "Truthful purpose" });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "TRUTHFUL" } });
  fireEvent.change(screen.getByPlaceholderText("INV-2026-001, PO-12345"), { target: { value: "INV-NEW" } });
  fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("navigator", { locks: { request: async (_name: string, callback: () => unknown) => callback() } });
  api.getProviders.mockResolvedValue({ data: [{ id: 10, code: "nium", name: "Nium", status: "active", supports_transfers: true }] });
  api.getBeneficiaries.mockResolvedValue([payee]);
  api.getBeneficiary.mockResolvedValue(payee);
  api.getBalances.mockResolvedValue([{ id: 1, provider_id: 10, currency: "USD", available_balance: "85" }]);
  api.getTransfers.mockResolvedValue([]);
  api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "TRUTHFUL", label: "Truthful purpose" }] });
  api.reviewTransfer.mockImplementation(async ({ payload }) => ({
    ...transferResponse(payload),
    review_token: "new-reviewed-instruction", source_amount: "5", source_currency: "USD", destination_currency: "SGD",
    fx_rate: "1.32", fx_expires_at: new Date(Date.now() + 60_000).toISOString(), conversion_amount: null,
    terms: { currency: "USD", fee_amount: "0", total_wallet_debit: "5",
      expires_at: new Date(Date.now() + 60_000).toISOString() },
  }));
  api.createTransfer.mockImplementation(async ({ payload }) => transferResponse(payload, "approval_required"));
});
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); vi.unstubAllGlobals(); });

describe("customer standard SGD transfer lifecycle", () => {
  it("Select → Review → Submit creates one approval_required instruction without provider submission", async () => {
    mount(); await details();
    const review = await screen.findByRole("region", { name: "SGD LOCAL payment review" });
    await waitFor(() => expect(within(review).getByRole("checkbox", { name: /I authorize/ })).toBeEnabled());
    fireEvent.click(within(review).getByRole("checkbox", { name: /I authorize/ }));
    fireEvent.click(within(review).getByRole("checkbox", { name: /purpose is truthful/ }));
    const submit = within(review).getByRole("button", { name: "Submit" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByRole("heading", { name: "Payment awaiting Admin processing" });
    expect(api.createTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer.mock.calls[0][0].payload).toMatchObject({
      source_amount: "5", source_currency: "USD", target_currency: "SGD",
      review_token: "new-reviewed-instruction", reference_text: "INV-NEW",
    });
    expect(api.submitTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("No further customer submission is needed");
  });
  it("lets the backend automatically synchronize a missing/stale balance during review", async () => {
    api.getBalances.mockResolvedValue([]);
    mount(); await details();
    await waitFor(() => expect(api.reviewTransfer).toHaveBeenCalledTimes(1));
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it("surfaces the financial blocker without extra lock, pricing or approval buttons", async () => {
    api.reviewTransfer.mockRejectedValue(new Error("Verified NIUM pricing unavailable."));
    mount(); await details();
    expect(await screen.findByRole("alert")).toHaveTextContent("Verified NIUM pricing unavailable");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /FX Lock|Refresh pricing|Refresh review|Submit for Admin/ })).not.toBeInTheDocument();
  });
  it("does not reopen cancelled Transfers 3 and 4 for a new payment", async () => {
    api.getTransfers.mockResolvedValue([3, 4].map((id) => ({ id, transfer_no: "CANCELLED-" + id, provider_id: 10,
      beneficiary_id: 9, source_currency: "USD", target_currency: "SGD", source_amount: "5", status: "cancelled" })));
    mount();
    await screen.findByRole("button", { name: /Synthetic SG payee/ });
    await screen.findByText("CANCELLED-4");
    expect(screen.getByText("CANCELLED-3")).toBeVisible();
    // The payee also appears in both activity rows; select its button, not a global text match.
    expect(screen.getAllByText("Synthetic SG payee")).toHaveLength(3);
    await details();
    await waitFor(() => expect(api.reviewTransfer).toHaveBeenCalledTimes(1));
    expect(api.reviewTransfer.mock.calls[0][0].payload).not.toHaveProperty("transfer_id");
    expect(api.cancelTransfer).not.toHaveBeenCalled();
  });
  it("reopens a saved draft after reload using GET, without automatic review or acceptance", async () => {
    const view = mount(); await details();
    await waitFor(() => expect(readPaymentIdentity("12")?.transferId).toBe(50));
    const identity = readPaymentIdentity("12")!;
    api.getTransfer.mockResolvedValue({ id: 50, provider_id: 10, beneficiary_id: 9, transfer_no: "SYNTHETIC-NEW",
      transfer_type: "payout", source_currency: "USD", target_currency: "SGD", source_amount: "5", status: "draft",
      purpose_code: "TRUTHFUL", reference_text: "INV-NEW", client_reference: identity.clientReference,
      payout_workflow: { state: "locked", dispatch_allowed: false } });
    view.unmount(); mount();
    await screen.findByRole("heading", { name: "Payment draft saved" });
    expect(api.getTransfer).toHaveBeenCalledWith({ userId: "12", token: "customer-token", transferId: 50 });
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start a separate payment" })).toBeDisabled();
    expect(localStorage.getItem("ow-payment-identity-v1:12")).not.toMatch(/review_token|customer-token|INV-NEW/);
  });
  it("blocks changed payment details rather than minting a new reference", async () => {
    api.reviewTransfer.mockRejectedValue(new ApiRequestError("Pricing unavailable", 422));
    mount(); await details(); await screen.findByText("Pricing unavailable");
    const original = readPaymentIdentity("12");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    await screen.findByText(/Payment details or receiving account changed/);
    expect(readPaymentIdentity("12")).toEqual(original);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
  });
  it("resolves a lost acceptance response by reopening the saved payment after reload", async () => {
    api.createTransfer.mockRejectedValueOnce(new ApiRequestError("Acceptance response lost", 0));
    const view = mount(); await details();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /I authorize/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("checkbox", { name: /I authorize/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /purpose is truthful/ }));
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByText("Acceptance response lost");
    api.getTransfer.mockResolvedValue(transferResponse(api.reviewTransfer.mock.calls[0][0].payload, "approval_required"));
    view.unmount(); mount();
    await screen.findByRole("heading", { name: "Payment awaiting Admin processing" });
    expect(api.createTransfer).toHaveBeenCalledTimes(1);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });
  it("preserves structured unknown operations and never offers another payment", async () => {
    api.reviewTransfer.mockImplementation(async ({ payload }) => { throw new ApiRequestError("FX outcome unknown", 422, undefined, {
      transfer: { ...transferResponse(payload),
        payout_workflow: { state: "lock_unknown", recovery_required: true } },
    }); });
    mount(); await details();
    await screen.findByRole("heading", { name: "Payment outcome needs review" });
    expect(screen.getByRole("button", { name: "Start a separate payment" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Cancel saved/ })).not.toBeInTheDocument();
    expect(api.createTransfer).not.toHaveBeenCalled();
  });
  it.each(["5", "10"])("retains HK SWIFT USD %s identity across an ambiguous retry", async (amount) => {
    const hk = { ...payee, country_code: "HK", currency: "USD", payout_method: "SWIFT", payout_admission: null };
    api.getBeneficiaries.mockResolvedValue([hk]); api.getBeneficiary.mockResolvedValue(hk);
    api.createTransfer.mockRejectedValueOnce(new ApiRequestError("Response lost", 0));
    mount(); await details(amount);
    const submit = await screen.findByRole("button", { name: "Submit" });
    fireEvent.click(submit); fireEvent.click(submit);
    await screen.findByText("Response lost");
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("heading", { name: "Payment awaiting Admin processing" });
    expect(api.createTransfer).toHaveBeenCalledTimes(2);
    expect(api.createTransfer.mock.calls[1][0].payload).toEqual(api.createTransfer.mock.calls[0][0].payload);
    expect(api.createTransfer.mock.calls[0][0].payload).toMatchObject({ source_amount: Number(amount), source_currency: "USD", target_currency: "USD",
      purpose_code: "TRUTHFUL", reference_text: "INV-NEW", raw_data: { nium: { payout: { swiftFeeType: "SHA" } } } });
    expect(api.reviewTransfer).not.toHaveBeenCalled(); expect(api.submitTransfer).not.toHaveBeenCalled();
  });
});
