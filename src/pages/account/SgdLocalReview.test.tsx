import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Balance, Transfer } from "@/services/moneyMovementService";
import SgdLocalReview from "./SgdLocalReview";

const api = vi.hoisted(() => ({ getTransfer: vi.fn(), lockSgdLocal: vi.fn(), prepareSgdLocal: vi.fn(),
  refreshSgdLocalPricing: vi.fn(), restartSgdLocalReview: vi.fn(), submitSgdLocal: vi.fn(),
  recoverSgdLocalCapturedOutcome: vi.fn(), requestSgdLocalRecoveryReview: vi.fn(), syncTransferStatus: vi.fn(),
  cancelTransfer: vi.fn(), submitTransfer: vi.fn(), requestSgdLocalApproval: vi.fn() }));
vi.mock("@/services/moneyMovementService", () => api);

const locked = (): Transfer => ({
  id: 3, transfer_no: "SYNTHETIC-3", user_id: 12, provider_id: 10, beneficiary_id: 9,
  transfer_type: "payout", source_currency: "USD", target_currency: "SGD", source_amount: "5.00000000",
  purpose_code: "TRUTHFUL_PURPOSE", status: "draft",
  payout_workflow: { state: "locked", fx_lock_enabled: true, fx_lock_active: true,
    approval_request_allowed: true, submission_token: "a".repeat(64), blockers: [],
    customer_instruction: { transfer_id: 3, source_amount: "5", source_currency: "USD", destination_currency: "SGD",
      purpose_code: "TRUTHFUL_PURPOSE", fx_quote_id: 5, rate: "1.275939120", expires_at: new Date(Date.now() + 60_000).toISOString(),
      receiving_account: { name: "Synthetic recipient", bank: "Synthetic bank", last_four: "1234", sha256: "test" },
      financial_terms: { policy: "one_time_uncapped", fee_amount: null, fee_currency: "USD", total_wallet_debit: null,
        expires_at: new Date(Date.now() + 60_000).toISOString() } } },
});

const balance: Balance = { id: 1, user_id: 12, provider_id: 10, currency: "USD", available_balance: "85" };
const mount = (initial: Transfer | null, overrides: { balance?: Balance; validationError?: string } = {}) => {
  const submitted = vi.fn();
  const Harness = () => {
    const [draft, setDraft] = useState(initial);
    return <SgdLocalReview userId="12" token="existing-customer-token" providerId={10} beneficiaryId={9}
      sourceAmount="5" purposeCode="TRUTHFUL_PURPOSE" fxEnabled={true} balance={balance} validationError="" {...overrides}
      draft={draft} onDraft={setDraft} onSubmitted={submitted} />;
  };
  render(<Harness />);
  return submitted;
};

const accept = () => {
  fireEvent.click(screen.getByRole("checkbox", { name: /selected payment purpose is truthful/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I authorize this beneficiary/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I explicitly accept/ }));
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", { randomUUID: () => "104afd37-c9e7-43ec-97c4-3644f99d8fbc" });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("SGD LOCAL Review → Submit", () => {
  it("does not prepare or lock on render and requires explicit purpose, terms and uncapped consent", () => {
    mount(locked());
    expect(screen.getByText(/Additional NIUM charges are unknown, uncapped/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I authorize this beneficiary/ }));
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("submits the reviewed token once with the authenticated client and ends at Admin approval", async () => {
    const draft = locked();
    api.submitSgdLocal.mockResolvedValue({ ...draft, status: "approval_required" });
    const submitted = mount(draft);
    accept();
    const button = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(submitted).toHaveBeenCalledWith(expect.objectContaining({ status: "approval_required" })));
    expect(api.submitSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.submitSgdLocal).toHaveBeenCalledWith({ userId: "12", token: "existing-customer-token", transferId: 3,
      submissionToken: "a".repeat(64), acceptUncappedCharges: true });
    expect(api.submitTransfer).not.toHaveBeenCalled();
    expect(api.requestSgdLocalApproval).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Request Approval|Submit for Admin/ })).not.toBeInTheDocument();
  });

  it("requires an explicit quote request and never repeats an uncertain FX lock", async () => {
    const prepared = { ...locked(), payout_workflow: { ...locked().payout_workflow!, state: "draft", customer_instruction: null,
      submission_token: null, approval_request_allowed: false } };
    api.prepareSgdLocal.mockResolvedValue(prepared);
    api.lockSgdLocal.mockRejectedValue(new Error("FX lock outcome unknown"));
    mount(null);
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /selected payment purpose is truthful/ }));
    fireEvent.click(screen.getByRole("button", { name: "Get current FX quote" }));
    await screen.findByRole("alert");
    expect(api.prepareSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.lockSgdLocal).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Get current FX quote" })).not.toBeInTheDocument();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("clears acceptance after financial terms change and refreshes without a POST retry", async () => {
    const draft = locked();
    api.getTransfer.mockResolvedValue({ ...draft, payout_workflow: { ...draft.payout_workflow!, submission_token: "b".repeat(64) } });
    mount(draft);
    accept();
    fireEvent.click(screen.getByRole("button", { name: "Refresh payment details" }));
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /I authorize this beneficiary/ })).not.toBeChecked());
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("holds an ambiguous Submit for a status refresh without retrying automatically", async () => {
    api.submitSgdLocal.mockRejectedValue(new Error("Response unavailable"));
    mount(locked());
    accept();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).toHaveBeenCalledTimes(1);
  });

  it.each(["fx", "terms"])("rejects expired %s before any customer submission", (expiry) => {
    const draft = locked();
    const instruction = draft.payout_workflow!.customer_instruction!;
    if (expiry === "fx") instruction.expires_at = "2000-01-01T00:00:00Z";
    else instruction.financial_terms.expires_at = "2000-01-01T00:00:00Z";
    mount(draft);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("expires consent on screen without acquiring a replacement FX lock", () => {
    vi.useFakeTimers();
    mount(locked());
    accept();
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
  });

  it.each([
    { beneficiary_id: 8 }, { provider_id: 11 }, { user_id: 13 }, { source_currency: "SGD" },
    { target_currency: "USD" }, { source_amount: "5.00000001" }, { purpose_code: "OTHER" },
    { reference_text: "UNREVIEWED-REFERENCE" },
  ])("rejects a mismatched saved intent: %j", (change) => {
    mount({ ...locked(), ...change });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("rejects a mismatched instruction even when its enclosing transfer matches", () => {
    const draft = locked();
    draft.payout_workflow!.customer_instruction!.source_amount = "5.00000001";
    mount(draft);
    expect(screen.getByText(/payment instruction does not match/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("does not lock again when preparation resolves to an existing locked draft", async () => {
    api.prepareSgdLocal.mockResolvedValue(locked());
    mount(null);
    fireEvent.click(screen.getByRole("checkbox", { name: /selected payment purpose/ }));
    const button = screen.getByRole("button", { name: "Get current FX quote" });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByRole("checkbox", { name: /I authorize/ });
    expect(api.prepareSgdLocal).toHaveBeenCalledTimes(1);
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.cancelTransfer).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it.each(["expired_lock", "wrong_currency", "wrong_amount"])("rejects conflicting payout evidence: %s", (scenario) => {
    const draft = locked();
    draft.payout_amounts = { source_currency: "USD", destination_currency: "SGD", source_amount: "5",
      total_wallet_debit: null, fx_rate: "1.275939120", conversion_amount: null, transfer_fee: null, beneficiary_credit: null,
      fx_lock_expires_at: new Date(Date.now() + 60_000).toISOString() };
    if (scenario === "expired_lock") draft.payout_amounts.fx_lock_expires_at = "2000-01-01T00:00:00Z";
    if (scenario === "wrong_currency") draft.payout_amounts.destination_currency = "USD";
    if (scenario === "wrong_amount") draft.payout_amounts.source_amount = "5.00000001";
    mount(draft);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("rejects financial terms whose reservation differs from the reviewed principal", () => {
    const draft = locked();
    draft.payout_workflow!.customer_instruction!.financial_terms.reservation_amount = "4.99999999";
    mount(draft);
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it.each([
    { available_balance: "4.99999999" }, { user_id: 13 }, { provider_id: 11 }, { currency: "SGD" },
  ])("rejects an insufficient or mismatched source wallet: %j", (change) => {
    mount(locked(), { balance: { ...balance, ...change } });
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("checks the all-in reviewed debit and blocks provider fees above the principal-only policy", () => {
    const draft = locked();
    const terms = draft.payout_workflow!.customer_instruction!.financial_terms;
    terms.total_wallet_debit = "86";
    terms.fee_amount = "1";
    mount(draft);
    expect(screen.getByText(/provider charge exceeds/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("invalidates consent when displayed terms change even if the submission token is reused", () => {
    const draft = locked();
    const props = { userId: "12", token: "test-token", providerId: 10, beneficiaryId: 9, sourceAmount: "5",
      purposeCode: "TRUTHFUL_PURPOSE", fxEnabled: true, balance, validationError: "", onDraft: vi.fn(), onSubmitted: vi.fn() };
    const view = render(<SgdLocalReview {...props} draft={draft} />);
    accept();
    const changed = locked();
    changed.payout_workflow!.customer_instruction!.receiving_account.sha256 = "changed-account";
    view.rerender(<SgdLocalReview {...props} draft={changed} />);
    expect(screen.getByRole("checkbox", { name: /I authorize/ })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("honors beneficiary/corridor validation again at Review", () => {
    mount(locked(), { validationError: "The selected beneficiary must be active." });
    expect(screen.getByRole("alert")).toHaveTextContent("must be active");
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("restarts an expired approved review explicitly and reuses its draft for the next lock", async () => {
    const expired = locked();
    expired.status = "approved";
    expired.payout_workflow!.fx_lock_active = false;
    expired.payout_workflow!.can_restart_review = true;
    const reset = { ...locked(), payout_workflow: { ...locked().payout_workflow!, state: "review_reset",
      customer_instruction: null, submission_token: null, approval_request_allowed: false, fx_lock_active: false } };
    api.restartSgdLocalReview.mockResolvedValue(reset);
    api.lockSgdLocal.mockResolvedValue(locked());
    mount(expired);
    fireEvent.click(screen.getByRole("checkbox", { name: /selected payment purpose/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review new FX terms" }));
    await waitFor(() => expect(api.restartSgdLocalReview).toHaveBeenCalledTimes(1));
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("checkbox", { name: /selected payment purpose/ })).not.toBeChecked());
    fireEvent.click(screen.getByRole("checkbox", { name: /selected payment purpose/ }));
    fireEvent.click(screen.getByRole("button", { name: "Get current FX quote" }));
    await waitFor(() => expect(api.lockSgdLocal).toHaveBeenCalledTimes(1));
    expect(api.prepareSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("recovers captured evidence and reconciles an unknown payout without locking or submitting", async () => {
    const unknown = { ...locked(), status: "submission_unknown", payout_workflow: {
      ...locked().payout_workflow!, can_recover_captured_outcome: true, can_reconcile_status: false } };
    const recovered = { ...unknown, payout_workflow: { ...unknown.payout_workflow,
      can_recover_captured_outcome: false, can_reconcile_status: true } };
    api.recoverSgdLocalCapturedOutcome.mockResolvedValue(recovered);
    api.syncTransferStatus.mockResolvedValue({ transfer: recovered });
    mount(unknown);
    fireEvent.click(screen.getByRole("button", { name: "Recover saved provider evidence" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reconcile status" }));
    await waitFor(() => expect(api.syncTransferStatus).toHaveBeenCalledTimes(1));
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });

  it("requests a durable evidence review without repeating an unknown FX operation", async () => {
    const unknown = { ...locked(), payout_workflow: { ...locked().payout_workflow!, state: "lock_unknown",
      can_request_recovery_review: true } };
    api.requestSgdLocalRecoveryReview.mockResolvedValue({ ...unknown, payout_workflow: { ...unknown.payout_workflow,
      recovery_review_requested_at: "2026-10-31T00:00:00Z" } });
    mount(unknown);
    fireEvent.click(screen.getByRole("button", { name: "Request outcome review" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Request outcome review" })).toBeDisabled());
    expect(api.requestSgdLocalRecoveryReview).toHaveBeenCalledTimes(1);
    expect(api.lockSgdLocal).not.toHaveBeenCalled();
    expect(api.submitSgdLocal).not.toHaveBeenCalled();
  });
});
