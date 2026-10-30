import { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/services/apiClient";
import * as money from "@/services/moneyMovementService";
import type { Beneficiary, Transfer } from "@/services/moneyMovementService";
import { SgdLocalPayoutWorkflow } from "./SgdLocalPayoutWorkflow";
import { beneficiaryTransferOption, hasSgdLocalPreparation, validateNiumTransferConfiguration } from "./transferForm";

vi.mock("@/services/moneyMovementService", () => ({
  prepareSgdLocalPayout: vi.fn(), requestSgdLocalFxLock: vi.fn(), requestSgdLocalApproval: vi.fn(),
  refreshSgdLocalPricing: vi.fn(), getTransfer: vi.fn(), requestSgdLocalRecoveryReview: vi.fn(), restartSgdLocalReview: vi.fn(), recoverSgdLocalCapturedOutcome: vi.fn(), submitTransfer: vi.fn(), syncTransferStatus: vi.fn(), cancelTransfer: vi.fn(),
}));

const beneficiary: Beneficiary = {
  id: 9, user_id: 12, provider_id: 10, beneficiary_type: "personal", full_name: "Synthetic SG Individual",
  country_code: "SG", currency: "SGD", payout_method: "LOCAL", status: "active", bank_name: "Synthetic Singapore Bank",
  payout_admission: {
    allowed: false, reason: "financial_terms_unverified", beneficiary_id: 9, provider_id: 10,
    source_currency: "USD", destination_country: "SG", destination_currency: "SGD", payout_method: "LOCAL",
    preparation_allowed: true, fx_lock_enabled: true,
  },
};
const provider = { id: 10, code: "nium", name: "Nium", status: "active", supports_transfers: true };
const purposes = [{ code: "TEST_PURPOSE", label: "Synthetic purpose, not Production verification" }];
const draft: Transfer = {
  id: 1, user_id: 12, provider_id: 10, beneficiary_id: 9, transfer_no: "SYNTHETIC-SGD", transfer_type: "payout",
  source_currency: "USD", target_currency: "SGD", source_amount: "5.00000000", purpose_code: "TEST_PURPOSE", status: "draft",
  payout_workflow: {
    state: "draft", fx_lock_active: false, fx_lock_enabled: true,
    expected_fee: { amount: "0", currency: "USD", basis: "user_expectation" }, provider_fee_status: "unavailable",
    approval_request_allowed: false, dispatch_allowed: false, blockers: ["Provider charging terms are unverified."],
  },
};
const locked: Transfer = {
  ...draft, payout_workflow: { ...draft.payout_workflow!, state: "locked", fx_lock_active: true },
  payout_amounts: {
    source_currency: "USD", destination_currency: "SGD", source_amount: "5.00000000", total_wallet_debit: null,
    fx_rate: "1.275939120", fx_lock_expires_at: "2036-10-30T10:10:00Z", conversion_amount: null,
    estimated_conversion_amount: "6.3796956", transfer_fee: null, beneficiary_credit: null,
  },
};
const onChanged = vi.fn().mockResolvedValue(undefined);

const Harness = ({ existingTransfer, initialAmount = "5", payee = beneficiary }: { existingTransfer?: Transfer; initialAmount?: string; payee?: Beneficiary }) => {
  const [amount, setAmount] = useState(initialAmount);
  const [purpose, setPurpose] = useState("");
  return <SgdLocalPayoutWorkflow userId={String(payee.user_id)} token="synthetic-token" beneficiary={payee}
    balance={{ id: 1, user_id: payee.user_id, provider_id: payee.provider_id, currency: "USD", available_balance: "85" }}
    sourceAmount={amount} purposeCode={purpose} purposes={purposes} purposesLoading={false} purposesFailed={false}
    existingTransfer={existingTransfer} onAmountChange={setAmount} onPurposeChange={setPurpose}
    onBack={vi.fn()} onTransferChanged={onChanged} />;
};

describe("explicit controlled SGD preparation", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it("allows preparation selection without granting general payment admission", () => {
    expect(hasSgdLocalPreparation(beneficiary)).toBe(true);
    expect(beneficiaryTransferOption(beneficiary, provider).selectable).toBe(true);
    expect(validateNiumTransferConfiguration({ provider, beneficiary, sourceCurrency: "USD", targetCurrency: "SGD",
      purposeCode: "TEST_PURPOSE", purposeOptions: purposes })).not.toBe("");
    expect(hasSgdLocalPreparation({ ...beneficiary, payout_admission: { ...beneficiary.payout_admission!, beneficiary_id: 37 } })).toBe(false);
  });

  it("never locks, creates or submits during rendering and requires a truthful supported purpose", () => {
    const view = render(<Harness />);
    view.rerender(<Harness />);
    expect(money.prepareSgdLocalPayout).not.toHaveBeenCalled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Save draft and request/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    expect(screen.getByRole("button", { name: /Save draft and request/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Save draft and request/ })).toBeEnabled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
  });

  it.each(["0", "-1", "5.000000001", "9999999999999", "invalid"])("blocks invalid principal %s", (value) => {
    render(<Harness initialAmount={value} />);
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /Save draft and request/ })).toBeDisabled();
    expect(screen.getByText(/Enter a positive source amount/)).toBeVisible();
  });

  it("uses the selected owned beneficiary and decimal principal without the CUG identities", async () => {
    const payee = { ...beneficiary, id: 55, user_id: 72, provider_id: 31, payout_admission: {
      ...beneficiary.payout_admission!, beneficiary_id: 55, provider_id: 31,
    } };
    const saved = { ...draft, user_id: 72, provider_id: 31, beneficiary_id: 55, source_amount: "12.34000000" };
    vi.mocked(money.prepareSgdLocalPayout).mockResolvedValue(saved);
    vi.mocked(money.requestSgdLocalFxLock).mockResolvedValue(saved);
    render(<Harness initialAmount="12.34" payee={payee} />);
    expect(hasSgdLocalPreparation(payee)).toBe(true);
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Save draft and request/ }));
    await waitFor(() => expect(money.prepareSgdLocalPayout).toHaveBeenCalledWith(expect.objectContaining({
      userId: "72", payload: expect.objectContaining({ provider_id: 31, beneficiary_id: 55,
        source_amount: "12.34", source_currency: "USD", target_currency: "SGD", purpose_code: "TEST_PURPOSE" }),
    })));
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("requires the reviewed debit to match the variable principal exactly", () => {
    render(<Harness existingTransfer={{ ...locked, source_amount: "12.34000000", payout_workflow: {
      ...locked.payout_workflow!, approval_request_allowed: true, provider_fee_status: "confirmed",
    }, payout_amounts: { ...locked.payout_amounts!, source_amount: "12.34000000", total_wallet_debit: "5",
      transfer_fee: { amount: "0", currency: "USD" } } }} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
  });

  it("requests independent approval for a reserved pilot while keeping fees and total debit unconfirmed", async () => {
    const pilot: Transfer = { ...locked, payout_workflow: { ...locked.payout_workflow!, approval_request_allowed: true,
      financial_terms_token: "specific-transfer-review", pilot_policy: { authorization_id: "specific-grant",
        reservation_amount: "5", reserve_currency: "USD", reserve_amount: "2", fee_status: "unverified", total_wallet_debit: null } } };
    vi.mocked(money.requestSgdLocalApproval).mockResolvedValue({ ...pilot, status: "approval_required" });
    render(<Harness existingTransfer={pilot} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/separately funded USD charge reserve/)).toBeVisible();
    expect(screen.getByText("Unavailable — fees not confirmed")).toBeVisible();
    expect(screen.getByText("Unavailable — provider confirmation pending")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Submit for Admin Approval" }));
    await waitFor(() => expect(money.requestSgdLocalApproval).toHaveBeenCalledWith({ userId: "12", token: "synthetic-token",
      transferId: 1, financialTermsToken: "specific-transfer-review" }));
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("permits the exact one-time review without a reserve or confirmed pricing and displays uncapped charges", async () => {
    const pilot: Transfer = { ...locked, payout_workflow: { ...locked.payout_workflow!, approval_request_allowed: true,
      financial_terms_token: "specific-uncapped-review", expected_fee: { amount: null, currency: "USD", basis: "unknown_fees_explicitly_accepted" },
      pilot_policy: { authorization_id: "specific-grant", policy: "one_time_uncapped", reservation_amount: "5", reserve_currency: "USD",
        reserve_amount: null, charge_ceiling: null, fee_status: "unverified", total_wallet_debit: null,
        risk_acknowledgement: "additional_nium_charges_are_unknown_uncapped_and_not_reserved" } } };
    vi.mocked(money.requestSgdLocalApproval).mockResolvedValue({ ...pilot, status: "approval_required" });
    render(<Harness existingTransfer={pilot} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("alert")).toHaveTextContent("Additional NIUM charges are unknown and uncapped");
    expect(screen.queryByText(/Expected test fee: USD 0.00/)).not.toBeInTheDocument();
    expect(screen.getByText("Unavailable — fees not confirmed")).toBeVisible();
    expect(screen.getByText("Unavailable — provider confirmation pending")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Submit for Admin Approval" }));
    await waitFor(() => expect(money.requestSgdLocalApproval).toHaveBeenCalledWith({ userId: "12", token: "synthetic-token",
      transferId: 1, financialTermsToken: "specific-uncapped-review" }));
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it.each(["5.01", "4"])("does not reuse pilot terms for a changed principal %s", (amount) => {
    render(<Harness existingTransfer={{ ...locked, source_amount: amount, payout_workflow: {
      ...locked.payout_workflow!, approval_request_allowed: true, financial_terms_token: "specific-transfer-review",
      pilot_policy: { authorization_id: "specific-grant", reservation_amount: "5", reserve_currency: "USD",
        reserve_amount: "2", fee_status: "unverified", total_wallet_debit: null },
    } }} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
    expect(money.requestSgdLocalApproval).not.toHaveBeenCalled();
  });

  it("sends one explicit request on a double click and shows exact FX, estimate and unknown fees", async () => {
    vi.mocked(money.prepareSgdLocalPayout).mockResolvedValue(draft);
    let complete!: (transfer: Transfer) => void;
    vi.mocked(money.requestSgdLocalFxLock).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    fireEvent.click(screen.getByRole("checkbox"));
    const button = screen.getByRole("button", { name: /Save draft and request/ });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(money.requestSgdLocalFxLock).toHaveBeenCalledTimes(1));
    expect(money.prepareSgdLocalPayout).toHaveBeenCalledTimes(1);
    expect(money.prepareSgdLocalPayout).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({
      beneficiary_id: 9, source_amount: "5", purpose_code: "TEST_PURPOSE", purpose_confirmed: true,
      expected_fee_amount: "0", expected_fee_currency: "USD",
    }) }));
    await act(async () => complete(locked));
    expect(screen.getByText("1.275939120 SGD per USD")).toBeVisible();
    expect(screen.getByText("SGD 6.3796956 (estimate)")).toBeVisible();
    expect(screen.getByText("Provider charging terms are not confirmed.")).toBeVisible();
    expect(screen.queryByText(/Expected test fee: USD 0.00/)).not.toBeInTheDocument();
    expect(screen.getByText("Unavailable — provider confirmation pending")).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Submit once to NIUM" })).not.toBeInTheDocument();
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(money.requestSgdLocalApproval).not.toHaveBeenCalled();
  });

  it("expires displayed FX and requires an explicit new lock without automatic requests", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T10:00:00Z"));
    render(<Harness existingTransfer={{ ...locked, payout_amounts: { ...locked.payout_amounts!, fx_lock_expires_at: "2026-10-30T10:00:02Z" } }} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText("1.275939120 SGD per USD")).toBeVisible();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText("1.275939120 SGD per USD")).not.toBeInTheDocument();
    expect(screen.queryByText("SGD 6.3796956 (estimate)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explicitly request a fresh FX lock/ })).toBeEnabled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
  });

  it("keeps an uncertain lock blocked and refreshes local status without retrying FX", async () => {
    const unknown = { ...draft, payout_workflow: { ...draft.payout_workflow!, state: "lock_unknown" } };
    vi.mocked(money.prepareSgdLocalPayout).mockResolvedValue(draft);
    vi.mocked(money.requestSgdLocalFxLock).mockRejectedValue(new ApiRequestError("Synthetic uncertain FX outcome", 422, undefined, { transfer: unknown }));
    vi.mocked(money.getTransfer).mockResolvedValue(unknown);
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Save draft and request/ }));
    await screen.findByText("Synthetic uncertain FX outcome");
    expect(screen.getByRole("button", { name: /Explicitly request a fresh FX lock/ })).toBeDisabled();
    expect(money.getTransfer).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh preparation status" }));
    await waitFor(() => expect(money.getTransfer).toHaveBeenCalledTimes(1));
    expect(money.requestSgdLocalFxLock).toHaveBeenCalledTimes(1);
  });

  it("does not repeat FX after a network failure without a response", async () => {
    vi.mocked(money.prepareSgdLocalPayout).mockResolvedValue(draft);
    vi.mocked(money.requestSgdLocalFxLock).mockRejectedValue(new TypeError("Synthetic network failure"));
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Payment purpose"), { target: { value: "TEST_PURPOSE" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Save draft and request/ }));
    await screen.findByText("Synthetic network failure");
    const button = screen.getByRole("button", { name: /Explicitly request a fresh FX lock/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(money.requestSgdLocalFxLock).toHaveBeenCalledTimes(1);
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("blocks a confirmed source-wallet fee that exceeds principal-only funding", () => {
    const ready = { ...locked, payout_workflow: { ...locked.payout_workflow!, provider_fee_status: "confirmed" as const,
      financial_terms_token: "a".repeat(64), approval_request_allowed: true },
      payout_amounts: { ...locked.payout_amounts!, transfer_fee: { amount: "1", currency: "USD" }, total_wallet_debit: "6" } };
    render(<Harness existingTransfer={ready} />);
    fireEvent.click(screen.getByLabelText(/I confirm this purpose/));
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
    expect(screen.getByText(/provider charge exceeds the principal-only funding policy/)).toBeVisible();
    expect(money.requestSgdLocalApproval).not.toHaveBeenCalled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("shows the dynamic principal-only business policy without confirming provider fees", () => {
    render(<Harness initialAmount="12.34" />);
    expect(screen.getByText(/Internal reservation policy:.*12.34/)).toBeVisible();
    expect(screen.getByText(/Expected principal debit:.*12.34.*internal policy/)).toBeVisible();
    expect(screen.getByText(/This does not confirm NIUM charges or total debit/)).toBeVisible();
    expect(screen.getByText(/Provider charging terms are not confirmed/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
    expect(money.requestSgdLocalApproval).not.toHaveBeenCalled();
  });

  it("refreshes provider charges only on explicit action without another FX lock or payment", async () => {
    const ready = { ...locked, payout_workflow: { ...locked.payout_workflow!, can_refresh_pricing: true } };
    vi.mocked(money.refreshSgdLocalPricing).mockResolvedValue(ready);
    render(<Harness existingTransfer={ready} />);
    expect(money.refreshSgdLocalPricing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Check provider charges" }));
    await waitFor(() => expect(money.refreshSgdLocalPricing).toHaveBeenCalledTimes(1));
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Submit for Admin Approval" })).toBeDisabled();
  });

  it("reconciles an unknown payment through the existing status endpoint and never resubmits", async () => {
    const unknown = { ...locked, status: "submission_unknown", external_transfer_id: "synthetic-reference",
      payout_workflow: { ...locked.payout_workflow!, can_reconcile_status: true } };
    vi.mocked(money.syncTransferStatus).mockResolvedValue({ transfer: unknown });
    render(<Harness existingTransfer={unknown} />);
    expect(screen.queryByRole("button", { name: "Submit once to NIUM" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reconcile status" }));
    await waitFor(() => expect(money.syncTransferStatus).toHaveBeenCalledTimes(1));
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
  });
  it("reconciles a completed payout's financial evidence without starting another payment", async () => {
    const completed = { ...locked, status: "completed", external_transfer_id: "synthetic-reference",
      payout_workflow: { ...locked.payout_workflow!, can_reconcile_status: true } };
    vi.mocked(money.syncTransferStatus).mockResolvedValue({ transfer: completed });
    render(<Harness existingTransfer={completed} />);
    fireEvent.click(screen.getByRole("button", { name: "Reconcile wallet debit" }));
    await waitFor(() => expect(money.syncTransferStatus).toHaveBeenCalledTimes(1));
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
  });
  it("requests a durable outcome review without repeating an uncertain FX acquisition", async () => {
    const unknown = { ...draft, payout_workflow: { ...draft.payout_workflow!, state: "lock_unknown",
      recovery_kind: "fx_outcome_unknown", can_request_recovery_review: true, can_reconcile_status: false } };
    vi.mocked(money.requestSgdLocalRecoveryReview).mockResolvedValue({ ...unknown, payout_workflow: {
      ...unknown.payout_workflow, recovery_review_requested_at: "2026-10-30T10:00:00Z",
    } });
    render(<Harness existingTransfer={unknown} />);
    fireEvent.click(screen.getByRole("button", { name: "Request outcome review" }));
    await screen.findByText(/Outcome review requested/);
    expect(money.requestSgdLocalRecoveryReview).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Request outcome review" })).toBeDisabled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("routes missing-reference payments to review while blocking blind reconciliation and submission", () => {
    render(<Harness existingTransfer={{ ...locked, status: "submitting", payout_workflow: {
      ...locked.payout_workflow!, recovery_kind: "provider_reference_missing", can_request_recovery_review: true,
      can_reconcile_status: false,
    } }} />);
    expect(screen.queryByRole("button", { name: "Reconcile status" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request outcome review" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Submit once to NIUM" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explicitly request a fresh FX lock/ })).toBeDisabled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("requests approval once for confirmed terms and leaves dispatch to the independent checker", async () => {
    const ready = { ...locked, payout_workflow: { ...locked.payout_workflow!, approval_request_allowed: true,
      provider_fee_status: "confirmed" as const, financial_terms_token: "a".repeat(64), blockers: [] }, payout_amounts: { ...locked.payout_amounts!,
      transfer_fee: { amount: "0", currency: "USD" }, total_wallet_debit: "5" } };
    vi.mocked(money.requestSgdLocalApproval).mockResolvedValue({ ...ready, status: "approval_required",
      payout_workflow: { ...ready.payout_workflow, approval_request_allowed: false } });
    render(<Harness existingTransfer={ready} />);
    fireEvent.click(screen.getByRole("checkbox"));
    const button = screen.getByRole("button", { name: "Submit for Admin Approval" });
    fireEvent.click(button);
    fireEvent.click(button);
    await screen.findByText("Admin Approval: Requested");
    expect(money.requestSgdLocalApproval).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
  });

  it("explicitly resets an expired approval without refreshing FX or submitting a payment", async () => {
    vi.mocked(money.restartSgdLocalReview).mockResolvedValue(draft);
    render(<Harness existingTransfer={{ ...locked, status: "approved", payout_workflow: {
      ...locked.payout_workflow!, fx_lock_active: false, can_restart_review: true,
    }, payout_amounts: { ...locked.payout_amounts!, fx_lock_expires_at: "2000-01-01T00:00:00Z" } }} />);
    const button = screen.getByRole("button", { name: "Start a new FX review" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);
    await waitFor(() => expect(money.restartSgdLocalReview).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Explicitly request a fresh FX lock/ })).toBeDisabled();
  });

  it("recovers a captured payment reference then permits status reconciliation without another submission", async () => {
    const unknown = { ...locked, status: "submission_unknown", payout_workflow: { ...locked.payout_workflow!,
      can_recover_captured_outcome: true, can_reconcile_status: false } };
    vi.mocked(money.recoverSgdLocalCapturedOutcome).mockResolvedValue({ ...unknown, payout_workflow: {
      ...unknown.payout_workflow, can_recover_captured_outcome: false, can_reconcile_status: true,
    } });
    render(<Harness existingTransfer={unknown} />);
    fireEvent.click(screen.getByRole("button", { name: "Recover saved provider evidence" }));
    await screen.findByRole("button", { name: "Reconcile status" });
    expect(money.recoverSgdLocalCapturedOutcome).toHaveBeenCalledTimes(1);
    expect(money.submitTransfer).not.toHaveBeenCalled();
    expect(money.requestSgdLocalFxLock).not.toHaveBeenCalled();
  });

});
