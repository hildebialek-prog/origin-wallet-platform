import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beneficiary, Transfer } from "@/services/moneyMovementService";
import AccountTransfers from "./AccountTransfers";

const api = vi.hoisted(() => ({ getProviders: vi.fn(), getNiumPurposeCodes: vi.fn(), getBalances: vi.fn(),
  getBeneficiaries: vi.fn(), getTransfers: vi.fn(), createTransfer: vi.fn(), submitTransfer: vi.fn(),
  prepareSgdLocalReview: vi.fn(), prepareSgdLocal: vi.fn(), lockSgdLocal: vi.fn(), submitSgdLocal: vi.fn(), getTransfer: vi.fn(),
  refreshSgdLocalPricing: vi.fn(), restartSgdLocalReview: vi.fn(), syncTransferStatus: vi.fn(), cancelTransfer: vi.fn(),
  recoverSgdLocalCapturedOutcome: vi.fn(), requestSgdLocalRecoveryReview: vi.fn(), requestSgdLocalApproval: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);
vi.mock("@/services/fxOrderService", () => api);
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "12", kycStatus: "approved" }, token: "customer-token" }) }));
// Native controls keep this test focused on wizard state and API routing.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) =>
    <select value={value} onChange={(event) => onValueChange(event.target.value)}><option value="">Select</option>{children}</select>,
  SelectTrigger: () => null, SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{typeof children === "string" ? children : value}</option>,
}));

const payee: Beneficiary = { id: 9, user_id: 12, provider_id: 10, beneficiary_type: "personal", full_name: "Synthetic SG payee",
  country_code: "SG", currency: "SGD", payout_method: "LOCAL", status: "active", payout_admission: {
    allowed: false, reason: "financial_terms_unverified", preparation_allowed: true, fx_lock_enabled: true,
    beneficiary_id: 9, provider_id: 10, source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL",
  } };
const prepared: Transfer = { id: 3, transfer_no: "SYNTHETIC-WIZARD", user_id: 12, provider_id: 10, beneficiary_id: 9,
  transfer_type: "payout", source_currency: "USD", target_currency: "SGD", source_amount: "5.00000000", purpose_code: "TRUTHFUL",
  status: "draft", payout_workflow: { state: "draft", fx_lock_enabled: true, fx_lock_active: false, approval_request_allowed: false, blockers: [] } };
const locked = (): Transfer => ({ ...prepared, payout_workflow: { ...prepared.payout_workflow!, state: "locked",
  fx_lock_active: true, approval_request_allowed: true, submission_token: "reviewed-customer-instruction",
  customer_instruction: { transfer_id: 3, source_amount: "5", source_currency: "USD", destination_currency: "SGD", purpose_code: "TRUTHFUL",
    fx_quote_id: 5, rate: "1.275939120", expires_at: new Date(Date.now() + 60_000).toISOString(),
    receiving_account: { name: payee.full_name, bank: "Synthetic bank", last_four: "1234", sha256: "bound-account" },
    financial_terms: { policy: "one_time_uncapped", fee_amount: null, fee_currency: "USD", total_wallet_debit: null,
      expires_at: new Date(Date.now() + 60_000).toISOString() } } } });
// Synthetic current terms with the reported Transfer 3 identifiers and payment details.
const transfer3 = (): Transfer => {
  const transfer = locked();
  transfer.purpose_code = "IR008";
  transfer.reference_text = null;
  const instruction = transfer.payout_workflow!.customer_instruction!;
  instruction.purpose_code = "IR008";
  instruction.fx_quote_id = 6;
  transfer.payout_amounts = { source_currency: "USD", destination_currency: "SGD", source_amount: "5.00000000",
    total_wallet_debit: null, fx_rate: instruction.rate, fx_lock_expires_at: instruction.expires_at,
    conversion_amount: null, estimated_conversion_amount: "6.3796956", transfer_fee: null, beneficiary_credit: null };
  return transfer;
};
const clients: QueryClient[] = [];
const mount = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  render(<QueryClientProvider client={client}><MemoryRouter><AccountTransfers /></MemoryRouter></QueryClientProvider>);
  return client;
};
const details = async () => {
  fireEvent.click((await screen.findByText("Synthetic SG payee")).closest("button")!);
  expect(screen.getByRole("heading", { name: "Complete payment details" })).toBeVisible();
  fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: "5" } });
  await screen.findByRole("option", { name: "Truthful purpose" });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "TRUTHFUL" } });
};

beforeEach(() => {
  vi.resetAllMocks();
  api.getProviders.mockResolvedValue({ data: [{ id: 10, code: "nium", name: "Nium", status: "active", supports_transfers: true }] });
  api.getBeneficiaries.mockResolvedValue([payee]);
  api.getBalances.mockResolvedValue([{ id: 1, user_id: 12, provider_id: 10, currency: "USD", available_balance: "85" }]);
  api.getTransfers.mockResolvedValue([]);
  api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "TRUTHFUL", label: "Truthful purpose" }] });
  api.prepareSgdLocalReview.mockImplementation(async () => locked());
  api.prepareSgdLocal.mockResolvedValue(prepared);
  api.lockSgdLocal.mockImplementation(async () => locked());
  api.submitSgdLocal.mockImplementation(async () => ({ ...locked(), status: "approval_required" }));
});
afterEach(() => { clients.splice(0).forEach((client) => client.clear()); });

describe("customer payment wizard routing", () => {
  it("reaches SGD Review → Submit and ends at Admin approval without a provider submission", async () => {
    mount();
    await details();
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    expect(review).toBeVisible();
    fireEvent.click(await within(review).findByRole("checkbox", { name: /I authorize/ }));
    fireEvent.click(within(review).getByRole("checkbox", { name: /selected payment purpose/ }));
    fireEvent.click(within(review).getByRole("checkbox", { name: /I explicitly accept/ }));
    const submit = within(review).getByRole("button", { name: "Submit" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await screen.findByRole("heading", { name: "Payment request created" });
    expect(api.prepareSgdLocalReview).toHaveBeenCalledTimes(1);
    expect(api.submitSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.submitSgdLocal).toHaveBeenCalledWith({ userId: "12", token: "customer-token", transferId: 3,
      submissionToken: "reviewed-customer-instruction", acceptUncappedCharges: true });
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
    expect(api.requestSgdLocalApproval).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("No further customer submission is needed");
    expect(screen.queryByRole("button", { name: /Submit|Request Approval/ })).not.toBeInTheDocument();
  });

  it("reuses preparation identity when a lost response is followed by reopening Review", async () => {
    api.prepareSgdLocalReview.mockRejectedValueOnce(new Error("Response unavailable"));
    mount();
    await details();
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    await screen.findByRole("alert");
    const reference = api.prepareSgdLocalReview.mock.calls[0][0].payload.client_reference;
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    await screen.findByRole("checkbox", { name: /I authorize/ });
    expect(api.prepareSgdLocalReview).toHaveBeenCalledTimes(2);
    expect(api.prepareSgdLocalReview.mock.calls[1][0].payload.client_reference).toBe(reference);
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
  });

  it("rechecks backend beneficiary/corridor evidence after entering Review", async () => {
    const client = mount();
    await details();
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    act(() => client.setQueryData(["money-beneficiaries", "12", "customer-token"], [{ ...payee,
      payout_admission: { ...payee.payout_admission!, destination_country: "HK" } }]));
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh review" })).toBeDisabled());
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("opens an existing draft for review instead of creating another payment", async () => {
    api.getTransfers.mockResolvedValue([locked()]);
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    await screen.findByRole("region", { name: "SGD LOCAL payment review" });
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
  });

  it("reopens Transfer 3 with IR008 and Quote 6 while supported purposes are still loading", async () => {
    const draft = transfer3();
    api.getTransfers.mockResolvedValue([draft]);
    let resolvePurposes!: (value: { data: { code: string; label: string }[] }) => void;
    api.getNiumPurposeCodes.mockReturnValue(new Promise((resolve) => { resolvePurposes = resolve; }));
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const review = await screen.findByRole("region", { name: "SGD LOCAL payment review" });
    expect(within(review).queryByText(/saved draft has different payment details/)).not.toBeInTheDocument();
    expect(within(review).getByText("6 · 1.275939120 SGD per USD")).toBeVisible();
    expect(within(review).getByText("1.275939120 SGD per USD")).toBeVisible();
    expect(within(review).queryByText("Unavailable — no confirmed FX lock")).not.toBeInTheDocument();
    expect(within(review).getByRole("button", { name: "Submit" })).toBeDisabled();
    await act(async () => resolvePurposes({ data: [{ code: "IR008", label: "Supported IR008 purpose" }] }));
    expect(await within(review).findByRole("checkbox", { name: /I authorize/ })).not.toBeChecked();
    expect(within(review).getByText("Financial terms expire").nextElementSibling)
      .toHaveTextContent(draft.payout_workflow!.customer_instruction!.financial_terms.expires_at);
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.cancelTransfer).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByPlaceholderText("Enter an amount")).toHaveValue("5.00000000");
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("IR008");
    expect(screen.getByPlaceholderText("INV-2026-001, PO-12345")).toHaveValue("");
  });

  it.each([null, "SAVED-REFERENCE"])("rehydrates the saved reference %s on payee reuse and rejects unsaved edits", async (reference) => {
    const draft = transfer3();
    draft.reference_text = reference;
    api.getTransfers.mockResolvedValue([draft]);
    api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "IR008", label: "Supported IR008 purpose" }] });
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getAllByText("Synthetic SG payee").find((element) => element.closest("button"))!.closest("button")!);
    await screen.findByRole("option", { name: "Supported IR008 purpose" });
    expect(screen.getByPlaceholderText("Enter an amount")).toHaveValue("5.00000000");
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("IR008");
    expect(screen.getByPlaceholderText("INV-2026-001, PO-12345")).toHaveValue(reference ?? "");
    fireEvent.change(screen.getByPlaceholderText("INV-2026-001, PO-12345"), { target: { value: "UNSAVED-REFERENCE" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Review payment" })[0]);
    let review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    expect(within(review).getByRole("alert")).toHaveTextContent("saved draft has different payment details");
    expect(within(review).getByRole("button", { name: "Submit" })).toBeDisabled();
    // Reopen the exact saved request without cancelling it or preparing a replacement.
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getAllByText("Synthetic SG payee").find((element) => element.closest("button"))!.closest("button")!);
    expect(screen.getByPlaceholderText("INV-2026-001, PO-12345")).toHaveValue(reference ?? "");
    fireEvent.click(screen.getAllByRole("button", { name: "Review payment" })[0]);
    review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    expect(within(review).queryByText(/saved draft has different payment details/)).not.toBeInTheDocument();
    expect(within(review).getByText("6 · 1.275939120 SGD per USD")).toBeVisible();
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.cancelTransfer).not.toHaveBeenCalled();
  });

  it("waits for saved requests and reuses Transfer 3 when the list arrives after payee selection", async () => {
    let resolveTransfers!: (value: Transfer[]) => void;
    api.getTransfers.mockReturnValue(new Promise((resolve) => { resolveTransfers = resolve; }));
    api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "IR008", label: "Supported IR008 purpose" }] });
    mount();
    fireEvent.click((await screen.findByText("Synthetic SG payee")).closest("button")!);
    fireEvent.change(screen.getByPlaceholderText("Enter an amount"), { target: { value: "5" } });
    await screen.findByRole("option", { name: "Supported IR008 purpose" });
    fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: "IR008" } });
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(screen.getByText("Loading saved payment requests before continuing.")).toBeVisible();
    expect(screen.queryByRole("region", { name: "SGD LOCAL payment review" })).not.toBeInTheDocument();
    await act(async () => resolveTransfers([transfer3()]));
    await screen.findByText("SYNTHETIC-WIZARD");
    // Both the activity row and Details now offer Review payment.
    fireEvent.click(screen.getAllByRole("button", { name: "Review payment" })[0]);
    const review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    expect(within(review).getByText("6 · 1.275939120 SGD per USD")).toBeVisible();
    expect(within(review).queryByRole("button", { name: "Get current FX quote" })).not.toBeInTheDocument();
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
  });

  it("keeps an expired Transfer 3 quote blocked without replacing or relocking the draft", async () => {
    const draft = transfer3();
    api.prepareSgdLocalReview.mockReturnValue(new Promise(() => {}));
    draft.payout_amounts!.fx_lock_expires_at = "2000-01-01T00:00:00Z";
    draft.payout_workflow!.customer_instruction!.expires_at = "2000-01-01T00:00:00Z";
    api.getTransfers.mockResolvedValue([draft]);
    api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "IR008", label: "Supported IR008 purpose" }] });
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    expect(within(review).getByText("Expired — a new FX lock and review are required")).toBeVisible();
    expect(within(review).getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("reopens a submitted payment with changed terms for automatic preparation and fresh consent", async () => {
    const changed = transfer3();
    changed.status = "approval_required";
    changed.payout_workflow!.can_refresh_review = true;
    api.getTransfers.mockResolvedValue([changed]);
    api.getNiumPurposeCodes.mockResolvedValue({ data: [{ code: "IR008", label: "Supported IR008 purpose" }] });
    api.prepareSgdLocalReview.mockImplementation(async () => transfer3());
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    await waitFor(() => expect(api.prepareSgdLocalReview).toHaveBeenCalledTimes(1));
    expect(api.prepareSgdLocalReview).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({
      transfer_id: 3, beneficiary_id: 9, source_amount: "5.00000000", purpose_code: "IR008", reference_text: null,
    }) }));
    expect(await within(review).findByRole("checkbox", { name: /I authorize/ })).not.toBeChecked();
    expect(within(review).getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("preserves an unsupported saved purpose for display while keeping submission blocked", async () => {
    api.getTransfers.mockResolvedValue([transfer3()]);
    // A successful allowlist response deliberately omits the saved IR008 code.
    mount();
    await screen.findByText("SYNTHETIC-WIZARD");
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    const review = screen.getByRole("region", { name: "SGD LOCAL payment review" });
    await within(review).findByText("Select a supported Nium payment purpose.");
    expect(within(review).getByText("IR008")).toBeVisible();
    expect(within(review).queryByText(/saved draft has different payment details/)).not.toBeInTheDocument();
    expect(within(review).getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("keeps the HK USD SWIFT path on the existing transfer API", async () => {
    api.getBeneficiaries.mockResolvedValue([{ ...payee, country_code: "HK", currency: "USD", payout_method: "SWIFT", payout_admission: null }]);
    api.createTransfer.mockResolvedValue({ ...prepared, target_currency: "USD", payout_workflow: null, status: "approval_required" });
    mount();
    await details();
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    expect(screen.queryByRole("region", { name: "SGD LOCAL payment review" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("heading", { name: "Payment request created" });
    expect(api.createTransfer).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({
      target_currency: "USD", source_currency: "USD", source_amount: 5, purpose_code: "TRUTHFUL",
      raw_data: expect.objectContaining({ nium: { sourceOfFunds: "Corporate Account", payout: { swiftFeeType: "SHA" } } }),
    }) }));
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });
});
