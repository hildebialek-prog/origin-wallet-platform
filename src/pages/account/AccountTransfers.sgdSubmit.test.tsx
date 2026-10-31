import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Beneficiary, Transfer } from "@/services/moneyMovementService";
import AccountTransfers from "./AccountTransfers";

const api = vi.hoisted(() => ({ getProviders: vi.fn(), getNiumPurposeCodes: vi.fn(), getBalances: vi.fn(),
  getBeneficiaries: vi.fn(), getTransfers: vi.fn(), createTransfer: vi.fn(), submitTransfer: vi.fn(),
  prepareSgdLocal: vi.fn(), lockSgdLocal: vi.fn(), submitSgdLocal: vi.fn(), getTransfer: vi.fn(),
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
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    fireEvent.click(within(review).getByRole("checkbox", { name: /selected payment purpose/ }));
    fireEvent.click(within(review).getByRole("button", { name: "Get current FX quote" }));
    fireEvent.click(await within(review).findByRole("checkbox", { name: /I authorize/ }));
    fireEvent.click(within(review).getByRole("checkbox", { name: /I explicitly accept/ }));
    const submit = within(review).getByRole("button", { name: "Submit" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await screen.findByRole("heading", { name: "Payment request created" });
    expect(api.prepareSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.submitSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.submitSgdLocal).toHaveBeenCalledWith({ userId: "12", token: "customer-token", transferId: 3,
      submissionToken: "reviewed-customer-instruction", acceptUncappedCharges: true });
    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(api.submitTransfer).not.toHaveBeenCalled();
    expect(api.requestSgdLocalApproval).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("No further customer submission is needed");
    expect(screen.queryByRole("button", { name: /Submit|Request Approval/ })).not.toBeInTheDocument();
  });

  it("rechecks backend beneficiary/corridor evidence after entering Review", async () => {
    const client = mount();
    await details();
    fireEvent.click(screen.getByRole("button", { name: "Review payment" }));
    act(() => client.setQueryData(["money-beneficiaries", "12", "customer-token"], [{ ...payee,
      payout_admission: { ...payee.payout_admission!, destination_country: "HK" } }]));
    await waitFor(() => expect(screen.getByRole("button", { name: "Get current FX quote" })).toBeDisabled());
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
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
