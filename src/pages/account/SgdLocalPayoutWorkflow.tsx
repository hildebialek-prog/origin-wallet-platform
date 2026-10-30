import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiRequestError } from "@/services/apiClient";
import {
  cancelTransfer, getTransfer, prepareSgdLocalPayout, requestSgdLocalApproval, requestSgdLocalFxLock, requestSgdLocalRecoveryReview, restartSgdLocalReview, recoverSgdLocalCapturedOutcome,
  refreshSgdLocalPricing, syncTransferStatus, type Balance, type Beneficiary, type Transfer,
} from "@/services/moneyMovementService";
import type { PurposeCodeOption } from "@/services/fxOrderService";
import { formatAmount } from "@/lib/money";
import { SgdLocalAmountBreakdown } from "./SgdLocalAmountBreakdown";
import { createClientReference } from "./transferForm";

// Exact comparisons for principal, wallet availability and reviewed debit.
const units = (value: unknown): bigint | null => {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d{1,12}(?:\.\d{1,8})?$/.test(String(value))) return null;
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
};

export const SgdLocalPayoutWorkflow = ({ userId, token, beneficiary, balance, sourceAmount, purposeCode, purposes,
  purposesLoading, purposesFailed, existingTransfer, onAmountChange, onPurposeChange, onBack, onTransferChanged }: {
  userId: string; token: string; beneficiary: Beneficiary; balance?: Balance; sourceAmount: string; purposeCode: string;
  purposes: readonly PurposeCodeOption[]; purposesLoading: boolean; purposesFailed: boolean; existingTransfer?: Transfer;
  onAmountChange: (value: string) => void; onPurposeChange: (value: string) => void; onBack: () => void;
  onTransferChanged: () => Promise<unknown>;
}) => {
  const [transfer, setTransfer] = useState<Transfer | null>(existingTransfer ?? null);
  const [truthful, setTruthful] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const busyRef = useRef(false);
  const clientReference = useRef(createClientReference());
  const requestId = useRef<string | null>(null);
  useEffect(() => { if (!transfer && existingTransfer) setTransfer(existingTransfer); }, [existingTransfer, transfer]);
  const workflow = transfer?.payout_workflow;
  const expiry = Date.parse(transfer?.payout_amounts?.fx_lock_expires_at ?? "");
  const lockActive = workflow?.fx_lock_active === true && Number.isFinite(expiry) && expiry > Math.max(now, Date.now());
  useEffect(() => {
    if (!lockActive) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.max(1, expiry - Date.now()), 2_147_483_647));
    return () => window.clearTimeout(timer);
  }, [expiry, lockActive, now]);
  const purpose = transfer?.purpose_code ?? purposeCode;
  const amount = transfer ? String(transfer.source_amount) : sourceAmount;
  const uncertain = ["locking", "lock_unknown"].includes(workflow?.state ?? "") || ["submitting", "submission_unknown"].includes(transfer?.status ?? "");
  const sourceCurrency = beneficiary.payout_admission?.source_currency ?? balance?.currency ?? "";
  const targetCurrency = beneficiary.currency;
  const principal = units(amount);
  const validAmount = principal !== null && principal > 0n;
  const available = units(balance?.available_balance);
  const fundingMatches = balance?.user_id === Number(userId) && balance.provider_id === beneficiary.provider_id && balance.currency === sourceCurrency;
  const fee = transfer?.payout_amounts?.transfer_fee;
  const feeUnits = units(fee?.amount);
  const total = units(transfer?.payout_amounts?.total_wallet_debit);
  const termsConfirmed = workflow?.provider_fee_status === "confirmed" && fee?.currency === sourceCurrency &&
    feeUnits !== null && principal !== null && feeUnits === 0n && total === principal && !!workflow.financial_terms_token;
  const pilot = workflow?.pilot_policy;
  const pilotPrincipal = units(pilot?.reservation_amount);
  const pilotReserve = units(pilot?.reserve_amount);
  const uncappedPilot = pilot?.policy === "one_time_uncapped" && pilot.reserve_amount === null && pilot.charge_ceiling === null &&
    pilot.risk_acknowledgement === "additional_nium_charges_are_unknown_uncapped_and_not_reserved" && principal === 500_000_000n;
  const fundedPilot = (pilot?.policy === undefined || pilot.policy === "funded_reserve") && pilotReserve !== null && pilotReserve > 0n;
  const pilotAuthorized = !!pilot?.authorization_id && sourceCurrency === "USD" && targetCurrency === "SGD" &&
    principal !== null && principal > 0n && principal <= 500_000_000n && pilotPrincipal === principal &&
    pilot.reserve_currency === "USD" && (fundedPilot || uncappedPilot) &&
    pilot.fee_status === "unverified" && pilot.total_wallet_debit === null &&
    workflow?.provider_fee_status === "unavailable" && fee == null && total === null && !!workflow.financial_terms_token;
  const unexpectedFee = feeUnits !== null && feeUnits > 0n;
  const fundingRequired = pilotAuthorized ? principal : total;
  const allInAvailable = fundingMatches && available !== null && fundingRequired !== null && available >= fundingRequired;
  const fxEnabled = workflow?.fx_lock_enabled ?? beneficiary.payout_admission?.fx_lock_enabled === true;
  const purposeSupported = purposes.some((option) => option.code === purpose);
  const draft = !transfer || transfer.status === "draft";
  const intentMatches = !transfer || (transfer.user_id === Number(userId) && transfer.provider_id === beneficiary.provider_id && transfer.beneficiary_id === beneficiary.id &&
    transfer.source_currency === sourceCurrency && transfer.target_currency === targetCurrency && validAmount);
  const canLock = draft && fxEnabled && intentMatches && !uncertain && !lockActive && validAmount && purposeSupported && truthful &&
    fundingMatches && available !== null && principal !== null && available >= principal;

  const perform = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await operation();
      await onTransferChanged();
    } catch (failure) {
      if (failure instanceof ApiRequestError && failure.payload?.transfer) setTransfer(failure.payload.transfer as Transfer);
      setError(failure instanceof Error ? failure.message : "The outcome is unavailable. Refresh the saved request before continuing.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const lock = () => void perform(async () => {
    if (!canLock) return;
    let saved = transfer;
    if (!saved) {
      saved = await prepareSgdLocalPayout({ userId, token, payload: {
        provider_id: beneficiary.provider_id, beneficiary_id: beneficiary.id,
        source_currency: sourceCurrency, target_currency: targetCurrency, source_amount: sourceAmount, purpose_code: purposeCode,
        purpose_confirmed: true, client_reference: clientReference.current, expected_fee_amount: "0", expected_fee_currency: sourceCurrency,
      } });
      setTransfer(saved);
    }
    if (!requestId.current || (Number.isFinite(expiry) && expiry <= Date.now())) requestId.current = crypto.randomUUID();
    setTransfer({ ...saved, payout_workflow: saved.payout_workflow ? { ...saved.payout_workflow, state: "locking", fx_lock_active: false } : null });
    setTransfer(await requestSgdLocalFxLock({ userId, token, transferId: saved.id, requestId: requestId.current }));
  });

  return <div className="space-y-5">
    <h2 className="text-2xl font-semibold">SGD Local payment</h2>
    <p>{beneficiary.full_name} · {beneficiary.bank_name || "Singapore bank"} · {targetCurrency} · LOCAL</p>
    <p>Funding wallet: {sourceCurrency} · Available after reservations: {balance ? formatAmount(balance.available_balance, sourceCurrency) : "No synced balance"}</p>
    <label className="block">{sourceCurrency} source amount
      <Input aria-label={`${sourceCurrency} source amount`} value={amount} disabled={busy || !!transfer}
        onChange={(event) => onAmountChange(event.target.value)} inputMode="decimal" />
    </label>
    {!validAmount ? <p role="alert">Enter a positive source amount with at most eight decimal places.</p> : null}
    <label className="block">Payment purpose
      <select aria-label="Payment purpose" className="mt-2 w-full rounded border bg-transparent p-3" value={purpose}
        disabled={busy || !!transfer || purposesLoading || purposesFailed} onChange={(event) => onPurposeChange(event.target.value)}>
        <option value="">Select a truthful supported purpose</option>
        {purposes.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
      </select>
    </label>
    {purposesLoading ? <p>Loading NIUM payment purposes…</p> : null}
    {purposesFailed ? <p role="alert">Payment purposes are unavailable. Preparation is blocked.</p> : null}
    <label className="flex items-start gap-2"><input type="checkbox" checked={truthful} disabled={busy}
      onChange={(event) => setTruthful(event.target.checked)} />I confirm this purpose truthfully describes the payment.</label>
    {uncappedPilot ? <p role="alert">Additional NIUM charges are unknown and uncapped. Only USD 5 principal is reserved for this one-time test; no fee reserve is held. Actual charges will be recorded separately.</p>
      : <p>{termsConfirmed ? "Charging terms are confirmed for this reviewed request." : "Provider charging terms are not confirmed."}</p>}
    {pilotAuthorized && !uncappedPilot ? <p role="status">This test request has a separately funded USD charge reserve of {formatAmount(pilot.reserve_amount!, "USD")}.
      Only the source principal is reserved for the transfer. Provider fees and total debit remain unconfirmed; actual charges will be recorded separately.</p> : null}
    <p>Internal reservation policy: {validAmount ? formatAmount(amount, sourceCurrency) : "Enter a source amount"}.
      {validAmount ? ` Expected principal debit: ${formatAmount(amount, sourceCurrency)} (internal policy).` : ""} This does not confirm NIUM charges or total debit.</p>
    <SgdLocalAmountBreakdown sourceAmount={amount} amounts={transfer?.payout_amounts} />
    {!fxEnabled ? <p role="status">Fresh FX locking is unavailable until the reviewed release enables it.</p> : null}
    {error ? <p role="alert">{error}</p> : null}
    {unexpectedFee ? <p role="alert">The provider charge exceeds the principal-only funding policy. Payment remains blocked.</p> : null}
    <p role="status">Admin Approval: {transfer?.status === "approval_required" ? "Requested" : transfer?.status === "approved" ? "Approved" : "Not requested"}</p>
    {transfer ? <p>Request {transfer.transfer_no} · Status: {transfer.status}</p> : null}
    {uncertain ? <p role="alert">The request is pending or uncertain. Do not submit again; refresh or reconcile its status.</p> : null}
    {workflow?.blockers.map((reason) => <p key={reason} className="text-sm text-amber-700">{reason}</p>)}
    {!workflow ? <p className="text-sm text-amber-700">Payment submission is blocked until provider charging terms and the all-in wallet debit are verified.</p> : null}
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={onBack} disabled={busy}>Back to beneficiaries</Button>
      <Button onClick={lock} disabled={busy || !canLock}>{busy ? "Working…" : transfer ? "Explicitly request a fresh FX lock" : "Save draft and request a fresh FX lock"}</Button>
      <Button disabled={busy || !transfer || !draft || !lockActive || !(termsConfirmed || pilotAuthorized) || !allInAvailable || unexpectedFee || !intentMatches || !purposeSupported || !truthful || workflow?.approval_request_allowed !== true}
        onClick={() => transfer && void perform(async () => setTransfer(await requestSgdLocalApproval({ userId, token, transferId: transfer.id, financialTermsToken: workflow?.financial_terms_token ?? "" })))}>Submit for Admin Approval</Button>
      {transfer && workflow?.can_refresh_pricing ? <Button variant="outline" disabled={busy || !draft || uncertain}
        onClick={() => void perform(async () => setTransfer(await refreshSgdLocalPricing({ userId, token, transferId: transfer.id })))}>Check provider charges</Button> : null}
      <p>An independent administrator approves and submits the payment. Refresh to check its status.</p>
      {transfer && workflow?.can_restart_review ? <Button variant="outline" disabled={busy || !truthful}
        onClick={() => void perform(async () => {
          setTransfer(await restartSgdLocalReview({ userId, token, transferId: transfer.id }));
          requestId.current = null;
          setTruthful(false);
        })}>Start a new FX review</Button> : null}
      {transfer ? <Button variant="outline" disabled={busy} onClick={() => void perform(async () => {
        setTransfer(await getTransfer({ userId, token, transferId: transfer.id }));
      })}>Refresh preparation status</Button> : null}
      {transfer && workflow?.can_reconcile_status === true ? <Button variant="outline" disabled={busy}
        onClick={() => void perform(async () => setTransfer((await syncTransferStatus({ userId, token, transferId: transfer.id })).transfer))}>
        {["completed", "failed", "cancelled", "rejected"].includes(transfer.status) ? "Reconcile wallet debit" : "Reconcile status"}</Button> : null}
      {transfer && workflow?.can_recover_captured_outcome ? <Button variant="outline" disabled={busy}
        onClick={() => void perform(async () => setTransfer(await recoverSgdLocalCapturedOutcome({ userId, token, transferId: transfer.id })))}>
        Recover saved provider evidence
      </Button> : null}
      {transfer && workflow?.can_request_recovery_review ? <div className="space-y-2">
        <p role="status">{workflow.recovery_review_requested_at
          ? "Outcome review requested. Funds and payment evidence remain protected while authoritative evidence is awaited."
          : "This outcome requires an evidence review. Request review without repeating the FX lock or payment."}</p>
        <Button variant="outline" disabled={busy || !!workflow.recovery_review_requested_at}
          onClick={() => void perform(async () => setTransfer(await requestSgdLocalRecoveryReview({ userId, token, transferId: transfer.id })))}>
          Request outcome review
        </Button>
      </div> : null}
      {transfer && draft && !uncertain ? <Button variant="outline" disabled={busy} onClick={() => void perform(async () => {
        await cancelTransfer({ userId, token, transferId: transfer.id });
        onBack();
      })}>Cancel preparation</Button> : null}
    </div>
    <p className="text-xs">Locks are requested only by the explicit button. NIUM performs conversion and payout. No SGD wallet or wallet-to-wallet transfer is needed.</p>
  </div>;
};
