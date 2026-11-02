import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import AccountTransfers from "./AccountTransfers";
import { webcrypto } from "node:crypto";
import { ApiRequestError } from "@/services/apiClient";
import { claimPaymentIdentity, readPaymentIdentity, rememberPaymentTransfer } from "./paymentSafety";
import type { Transfer } from "@/services/moneyMovementService";

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
    fx_rate: "1.32", fx_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(), conversion_amount: null,
    terms: { currency: "USD", fee_amount: "0", total_wallet_debit: "5",
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString() },
  }));
  api.createTransfer.mockImplementation(async ({ payload }) => transferResponse(payload, "approval_required"));
});
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const savedBlockedDraft = async (state = "lock_unknown") => {
  const identity = await claimPaymentIdentity("12", 10, 9, "a".repeat(64));
  const transfer: Transfer = { id: 5, transfer_no: "TRF-YUGG8X5B0FV2", provider_id: 10, beneficiary_id: 9,
    transfer_type: "payout", source_currency: "USD", target_currency: "SGD", source_amount: "5", status: "draft",
    client_reference: identity.clientReference, purpose_code: "TRUTHFUL", reference_text: "OLD-REFERENCE",
    payout_workflow: { state, can_refresh_review: true, dispatch_allowed: false } };
  rememberPaymentTransfer("12", identity, transfer);
  api.getTransfer.mockResolvedValue(transfer);
  api.getTransfers.mockResolvedValue([transfer]);
  return { identity: readPaymentIdentity("12")!, transfer };
};

describe("customer standard SGD transfer lifecycle", () => {
  const confirmedAmounts = () => ({ source_currency: "USD", destination_currency: "SGD", source_amount: "5.00000000",
    fx_rate: "1.276738080", fx_lock_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    total_wallet_debit: "5", transfer_fee: { amount: "0", currency: "USD" },
    estimated_conversion_amount: "6.3836904", conversion_amount: null, beneficiary_credit: null });

  it("shares backend terms between Review, summary and details, then invalidates them when the amount changes", async () => {
    api.reviewTransfer.mockImplementation(async ({ payload }) => {
      const amounts = confirmedAmounts();
      return { ...transferResponse(payload), review_token: "confirmed-review", source_amount: "5", destination_currency: "SGD",
        fx_rate: amounts.fx_rate, fx_expires_at: amounts.fx_lock_expires_at, conversion_amount: null,
        terms: { currency: "USD", fee_amount: "0", total_wallet_debit: "5", expires_at: amounts.fx_lock_expires_at },
        payout_amounts: amounts };
    });
    mount(); await details();
    const summary = () => within(screen.getByRole("region", { name: "Payment summary" }));
    await waitFor(() => expect(summary().getByText("1.276738080 SGD per USD")).toBeVisible());
    expect(summary().getByText("USD 0.00")).toBeVisible();
    expect(summary().getByText("SGD 6.3836904 (estimate)")).toBeVisible();
    expect(summary().getByText("Unavailable — final credit not confirmed")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "SGD LOCAL payment review" })).getByText("SGD 6.3836904 (estimate)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByText("Complete payment details");
    expect(screen.getAllByText("1.276738080 SGD per USD")).toHaveLength(2);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: "6" } });
    expect(screen.queryByText("1.276738080 SGD per USD")).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 6.3836904 (estimate)")).not.toBeInTheDocument();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
  });

  it("invalidates displayed terms when the receiving account changes", async () => {
    mount(); await details();
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Payment summary" })).getByText("1.32 SGD per USD")).toBeVisible());
    api.getBeneficiaries.mockResolvedValue([{ ...payee, account_number: "changed-account" }]);
    await act(async () => { await clients[0].invalidateQueries({ queryKey: ["money-beneficiaries"] }); });
    await waitFor(() => expect(within(screen.getByRole("region", { name: "Payment summary" })).queryByText("1.32 SGD per USD")).not.toBeInTheDocument());
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it("blocks an incomplete review without fabricating a persisted transfer identity", async () => {
    const original = api.reviewTransfer.getMockImplementation()!;
    api.reviewTransfer.mockImplementation(async (request) => {
      const { id, transfer_no, status, payout_workflow, ...review } = await original(request);
      return review;
    });
    mount(); await details();
    await screen.findByText("Review did not return a saved payment. Refresh the saved payment status before continuing.");
    expect(readPaymentIdentity("12")?.transferId).toBeUndefined();
    expect(screen.getByRole("checkbox", { name: /I authorize/ })).toBeDisabled();
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
  });

  it("restores authoritative amounts from a saved draft into summary and reopened details without acquiring FX", async () => {
    const view = mount(); await details();
    await waitFor(() => expect(readPaymentIdentity("12")?.transferId).toBe(50));
    const payload = api.reviewTransfer.mock.calls[0][0].payload;
    api.getTransfer.mockResolvedValue({ ...transferResponse(payload), payout_amounts: confirmedAmounts() });
    view.unmount(); mount();
    await screen.findByRole("heading", { name: "Payment draft saved" });
    expect(within(screen.getByRole("region", { name: "Payment summary" })).getByText("SGD 6.3836904 (estimate)")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review saved instruction" }));
    await screen.findByText("Complete payment details");
    expect(screen.getAllByText("SGD 6.3836904 (estimate)")).toHaveLength(2);
    expect(api.reviewTransfer).toHaveBeenCalledTimes(1);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it("Select → Review → Submit creates one approval_required instruction without provider submission", async () => {
    mount(); await details();
    const review = await screen.findByRole("region", { name: "SGD LOCAL payment review" });
    await waitFor(() => expect(within(review).getByRole("checkbox", { name: /I authorize/ })).toBeEnabled());
    fireEvent.click(within(review).getByRole("checkbox", { name: /I authorize/ }));
    fireEvent.click(within(review).getByRole("checkbox", { name: /purpose is truthful/ }));
    expect(screen.queryByRole("button", { name: /Save Draft|Resume|Check saved payment|Refresh pricing|FX Lock/i })).not.toBeInTheDocument();
    expect(api.requestSgdRecoveryReview).not.toHaveBeenCalled();
    expect(api.recoverSgdCapturedOutcome).not.toHaveBeenCalled();
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
    expect(screen.queryByRole("button", { name: "Start New Transfer" })).not.toBeInTheDocument();
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
  it("offers a separate new wizard for a structured unknown draft without retrying it", async () => {
    api.reviewTransfer.mockImplementation(async ({ payload }) => { throw new ApiRequestError("FX outcome unknown", 422, undefined, {
      transfer: { ...transferResponse(payload),
        payout_workflow: { state: "lock_unknown", recovery_required: true } },
    }); });
    mount(); await details();
    await screen.findByRole("heading", { name: "Payment outcome needs review" });
    expect(screen.getByRole("button", { name: "Start New Transfer" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Cancel saved/ })).not.toBeInTheDocument();
    expect(api.createTransfer).not.toHaveBeenCalled();
    const reviewCalls = api.reviewTransfer.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Start New Transfer" }));
    await screen.findByRole("button", { name: /Synthetic SG payee/ });
    expect(readPaymentIdentity("12")).toBeNull();
    expect(api.reviewTransfer).toHaveBeenCalledTimes(reviewCalls);
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it.each(["locking", "lock_unknown", "submitting", "submission_unknown", "pending", "provider_pending"])(
    "starts a new wizard from a %s draft using only local state and preserves Transfer 5 in history", async (state) => {
      const { transfer } = await savedBlockedDraft(state);
      const original = JSON.parse(JSON.stringify(transfer));
      localStorage.setItem("unrelated-session", "preserve-me");
      localStorage.setItem("ow-payment-identity-v1:other-user", "preserve-other-user");
      mount();
      await screen.findByRole("heading", { name: "Payment outcome needs review" });
      expect(screen.queryByRole("button", { name: /Cancel saved|Review saved|Submit|Approve/ })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
      const getCalls = api.getTransfer.mock.calls.length;
      const historyCalls = api.getTransfers.mock.calls.length;
      const beneficiaryCalls = api.getBeneficiary.mock.calls.length;
      fireEvent.click(screen.getByRole("button", { name: "Start New Transfer" }));
      await screen.findByRole("button", { name: /Synthetic SG payee/ });
      expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Choose payee");
      expect(screen.getByRole("status")).toHaveTextContent("TRF-YUGG8X5B0FV2 remains pending investigation");
      expect(screen.getByRole("link", { name: /previous transfer in Transfer activity/ })).toHaveAttribute("href", "#transfer-activity");
      expect(screen.getByText("TRF-YUGG8X5B0FV2", { exact: true })).toBeVisible();
      expect(readPaymentIdentity("12")).toBeNull();
      expect(localStorage.getItem("unrelated-session")).toBe("preserve-me");
      expect(localStorage.getItem("ow-payment-identity-v1:other-user")).toBe("preserve-other-user");
      expect(api.getTransfer).toHaveBeenCalledTimes(getCalls);
      expect(api.getTransfers).toHaveBeenCalledTimes(historyCalls);
      expect(api.getBeneficiary).toHaveBeenCalledTimes(beneficiaryCalls);
      for (const action of [api.reviewTransfer, api.createTransfer, api.submitTransfer, api.cancelTransfer,
        api.syncTransferStatus, api.requestSgdRecoveryReview, api.recoverSgdCapturedOutcome]) expect(action).not.toHaveBeenCalled();
      expect(transfer).toEqual(original);

      fireEvent.click(screen.getByRole("button", { name: /Synthetic SG payee/ }));
      expect(screen.getByPlaceholderText("Enter an amount")).toHaveValue("");
      expect(screen.getByPlaceholderText("INV-2026-001, PO-12345")).toHaveValue("");
      expect(screen.queryByRole("region", { name: "SGD LOCAL payment review" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Open saved payment" }));
      await screen.findByRole("heading", { name: "Payment outcome needs review" });
      expect(screen.getByText("Saved payment #5: draft / " + state)).toBeVisible();
      expect(screen.queryByRole("button", { name: /Review saved|Submit|Approve/ })).not.toBeInTheDocument();
      expect(api.createTransfer).not.toHaveBeenCalled();
      expect(transfer).toEqual(original);
    },
  );

  it("allocates fresh operation identity only on intentional Review of the new USD to SGD transfer", async () => {
    const { identity, transfer } = await savedBlockedDraft();
    const original = JSON.parse(JSON.stringify(transfer));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Start New Transfer" }));
    await screen.findByRole("button", { name: /Synthetic SG payee/ });
    expect(readPaymentIdentity("12")).toBeNull();
    await details();
    await waitFor(() => expect(api.reviewTransfer).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readPaymentIdentity("12")?.transferId).toBe(50));
    expect(readPaymentIdentity("12")?.clientReference).not.toBe(identity.clientReference);
    expect(readPaymentIdentity("12")?.preparationId).not.toBe(identity.preparationId);
    expect(api.reviewTransfer.mock.calls[0][0].payload).toMatchObject({ source_amount: "5", provider_id: 10, beneficiary_id: 9,
      client_reference: readPaymentIdentity("12")!.clientReference, preparation_id: readPaymentIdentity("12")!.preparationId });
    expect(api.reviewTransfer.mock.calls[0][0].payload).not.toHaveProperty("transfer_id");
    expect(api.reviewTransfer.mock.calls[0][0].payload).not.toHaveProperty("review_token");
    expect(transfer).toEqual(original);
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
  });

  it("keeps the previous transfer accessible even outside the latest five activity rows", async () => {
    const { transfer } = await savedBlockedDraft();
    api.getTransfers.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({ ...transfer, id: 100 + index,
      transfer_no: `NEWER-${index}`, status: "completed", payout_workflow: { state: "completed" } })));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Start New Transfer" }));
    await screen.findByRole("button", { name: /Synthetic SG payee/ });
    const activity = document.getElementById("transfer-activity")!;
    expect(within(activity).getByText("TRF-YUGG8X5B0FV2")).toBeVisible();
    expect(within(activity).getAllByRole("button", { name: "Open saved payment" })).toHaveLength(6);
  });

  it("refuses to clear a different payment activated in another tab", async () => {
    await savedBlockedDraft();
    mount();
    const start = await screen.findByRole("button", { name: "Start New Transfer" });
    const another = { ...readPaymentIdentity("12")!, clientReference: "OW-another-tab", transferId: 99 };
    localStorage.setItem("ow-payment-identity-v1:12", JSON.stringify(another));
    fireEvent.click(start);
    await screen.findByText(/Another payment is active/);
    expect(readPaymentIdentity("12")).toEqual(another);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Submit");
    expect(api.reviewTransfer).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it("retains the blocked session if local storage cannot release its pointer", async () => {
    const { identity } = await savedBlockedDraft();
    mount();
    const start = await screen.findByRole("button", { name: "Start New Transfer" });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    fireEvent.click(start);
    await screen.findByText("Storage unavailable");
    expect(readPaymentIdentity("12")).toEqual(identity);
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Submit");
    expect(api.reviewTransfer).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it("does not leave while a saved status request is in flight", async () => {
    const { identity, transfer } = await savedBlockedDraft();
    mount();
    const start = await screen.findByRole("button", { name: "Start New Transfer" });
    let resolveStatus!: (value: Transfer) => void;
    api.getTransfer.mockImplementationOnce(() => new Promise<Transfer>((resolve) => { resolveStatus = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved status" }));
    expect(start).toBeDisabled();
    fireEvent.click(start);
    expect(readPaymentIdentity("12")).toEqual(identity);
    await act(async () => { resolveStatus(transfer); });
    await waitFor(() => expect(start).toBeEnabled());
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent("Submit");
    expect(api.reviewTransfer).not.toHaveBeenCalled();
    expect(api.createTransfer).not.toHaveBeenCalled();
  });

  it("blocks recovery and duplicate reset clicks while the browser identity lock is pending", async () => {
    const { identity } = await savedBlockedDraft();
    mount();
    const start = await screen.findByRole("button", { name: "Start New Transfer" });
    let releaseLock!: () => void;
    const request = vi.fn((_name: string, callback: () => void) => new Promise<void>((resolve) => {
      releaseLock = () => { callback(); resolve(); };
    }));
    vi.stubGlobal("navigator", { locks: { request } });
    const statusCalls = api.getTransfer.mock.calls.length;
    fireEvent.click(start); fireEvent.click(start);
    expect(start).toBeDisabled();
    expect(screen.getByRole("button", { name: "Refresh saved status" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved status" }));
    expect(api.getTransfer).toHaveBeenCalledTimes(statusCalls);
    expect(readPaymentIdentity("12")).toEqual(identity);
    await act(async () => { releaseLock(); });
    await screen.findByRole("button", { name: /Synthetic SG payee/ });
    expect(request).toHaveBeenCalledTimes(1);
    expect(readPaymentIdentity("12")).toBeNull();
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
