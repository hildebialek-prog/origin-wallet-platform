import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiRequestError } from "@/services/apiClient";
import {
  cancelTransfer, getTransfer, prepareSgdLocalReview, recoverSgdLocalCapturedOutcome,
  requestSgdLocalRecoveryReview, submitSgdLocal,
  syncTransferStatus, type Balance, type Transfer,
} from "@/services/moneyMovementService";
import { SgdLocalAmountBreakdown } from "./SgdLocalAmountBreakdown";

type Props = {
  userId: string;
  token: string;
  providerId: number;
  beneficiaryId: number;
  sourceAmount: string;
  purposeCode: string;
  referenceText?: string;
  preparationReference?: string;
  fxEnabled: boolean;
  balance?: Balance;
  validationError: string;
  draft: Transfer | null;
  onDraft: (transfer: Transfer) => void;
  onSubmitted: (transfer: Transfer) => void;
  onBusyChange?: (busy: boolean) => void;
  onTransferChanged?: () => Promise<unknown>;
};

// Compare principal and wallet debit without rounding away eight-decimal differences.
const units = (amount: unknown): bigint | null => {
  if ((typeof amount !== "string" && typeof amount !== "number") || !/^\d{1,12}(?:\.\d{1,8})?$/.test(String(amount))) return null;
  const [whole, fraction = ""] = String(amount).split(".");
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
};

export default function SgdLocalReview(props: Props) {
  const { draft, onDraft, onSubmitted } = props;
  const [now, setNow] = useState(Date.now());
  const [acceptedReview, setAcceptedReview] = useState<string | null>(null);
  const [confirmedPurpose, setConfirmedPurpose] = useState<string | null>(null);
  const [uncappedReview, setUncappedReview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const automaticReview = useRef<string | null>(null);
  const clientReference = useRef(props.preparationReference ?? `OW-${crypto.randomUUID()}`);
  const workflow = draft?.payout_workflow;
  const canRefreshReview = workflow?.can_refresh_review || workflow?.can_restart_review;
  const instruction = workflow?.customer_instruction;
  const terms = instruction?.financial_terms;
  const uncapped = terms?.policy === "one_time_uncapped";
  const principal = units(props.sourceAmount);
  const matchesDraft = (transfer: Transfer) => transfer.user_id === Number(props.userId) && transfer.provider_id === props.providerId
    && transfer.beneficiary_id === props.beneficiaryId && transfer.transfer_type === "payout"
    && transfer.source_currency === "USD" && transfer.target_currency === "SGD"
    && principal !== null && units(transfer.source_amount) === principal && transfer.purpose_code === props.purposeCode
    && (transfer.reference_text ?? "") === (props.referenceText ?? "");
  const matches = !draft || matchesDraft(draft);
  const instructionMatches = !!instruction && instruction.transfer_id === draft?.id && instruction.source_currency === "USD"
    && instruction.destination_currency === "SGD" && units(instruction.source_amount) === principal
    && instruction.purpose_code === props.purposeCode && !!instruction.receiving_account.sha256
    && Number.isFinite(Number(instruction.rate)) && Number(instruction.rate) > 0;
  const currentTime = Math.max(now, Date.now());
  const amounts = draft?.payout_amounts;
  const amountsMatch = !amounts || (amounts.source_currency === "USD" && amounts.destination_currency === "SGD"
    && units(amounts.source_amount) === principal
    && (amounts.fx_lock_expires_at == null || Date.parse(amounts.fx_lock_expires_at) > currentTime));
  const current = instructionMatches && Date.parse(instruction!.expires_at) > currentTime
    && Date.parse(terms?.expires_at ?? "") > currentTime && workflow?.fx_lock_active === true && amountsMatch;
  const fundingMatches = props.balance?.user_id === Number(props.userId) && props.balance.provider_id === props.providerId
    && props.balance.currency === "USD";
  const available = units(props.balance?.available_balance);
  const total = units(terms?.total_wallet_debit);
  const fundedReserve = terms?.pilot_reserve?.currency === "USD" && (units(terms.pilot_reserve.amount) ?? 0n) > 0n;
  const fundingRequired = total ?? (uncapped || fundedReserve ? principal : null);
  const funded = fundingMatches && available !== null && fundingRequired !== null && principal !== null
    && principal > 0n && fundingRequired === principal && available >= fundingRequired
    && (terms?.reservation_amount === undefined || units(terms.reservation_amount) === principal);
  const unexpectedFee = (units(terms?.fee_amount) ?? 0n) > 0n || (units(draft?.payout_amounts?.transfer_fee?.amount) ?? 0n) > 0n;
  const pending = uncertain || ["locking", "lock_unknown"].includes(workflow?.state ?? "")
    || ["submitting", "submission_unknown"].includes(draft?.status ?? "");
  const valid = !!props.userId && !!props.token && !props.validationError && matches && principal !== null && principal > 0n;
  const ready = valid && funded && !unexpectedFee && current && draft?.status === "draft"
    && workflow?.approval_request_allowed === true && !!workflow.submission_token;
  const intentKey = JSON.stringify([props.userId, props.providerId, props.beneficiaryId, props.sourceAmount, props.purposeCode, props.referenceText ?? ""]);
  // Bind consent to the entire displayed instruction, even if a response reuses its token.
  const reviewKey = JSON.stringify([intentKey, draft?.id, workflow?.submission_token, instruction]);
  const accepted = acceptedReview === reviewKey;
  const purposeConfirmed = confirmedPurpose === intentKey;
  const uncappedAccepted = uncappedReview === reviewKey;

  useEffect(() => {
    setAcceptedReview(null);
    setUncappedReview(null);
  }, [reviewKey]);
  useEffect(() => { setConfirmedPurpose(null); }, [intentKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const clearAcceptance = () => { setAcceptedReview(null); setUncappedReview(null); };
  const run = async (operation: () => Promise<void>) => {
    if (started.current) return;
    if (!props.userId || !props.token) { setError("Sign in before continuing."); return; }
    started.current = true;
    setBusy(true);
    props.onBusyChange?.(true);
    setError("");
    try { await operation(); await props.onTransferChanged?.(); }
    catch (failure) {
      if (failure instanceof ApiRequestError && failure.payload?.transfer) onDraft(failure.payload.transfer as Transfer);
      setUncertain(true);
      clearAcceptance();
      setError(`${failure instanceof Error ? failure.message : "Request could not be confirmed."} ${draft ? "Refresh payment details" : "Refresh review"} before continuing.`);
    } finally { started.current = false; setBusy(false); props.onBusyChange?.(false); }
  };
  const auth = { userId: props.userId, token: props.token };
  const refresh = () => run(async () => {
    if (!draft) return;
    const latest = await getTransfer({ ...auth, transferId: draft.id });
    onDraft(latest);
    clearAcceptance();
    setUncertain(false);
    if (latest.status === "approval_required") onSubmitted(latest);
  });
  const canRead = draft?.user_id === Number(props.userId);
  const canQuote = valid && fundingMatches && available !== null && principal !== null && available >= principal;

  const prepareReview = () => run(async () => {
    if (!canQuote || !props.fxEnabled || !matches || ["locking", "lock_unknown"].includes(workflow?.state ?? "")) return;
    clearAcceptance();
    setConfirmedPurpose(null);
    const prepared = await prepareSgdLocalReview({ ...auth, payload: {
      transfer_id: draft?.id, preparation_id: crypto.randomUUID(), provider_id: props.providerId,
      beneficiary_id: props.beneficiaryId, source_amount: props.sourceAmount, purpose_code: props.purposeCode,
      reference_text: props.referenceText || null, client_reference: draft?.client_reference ?? clientReference.current,
    } });
    onDraft(prepared);
    if (!matchesDraft(prepared)) throw new Error("The saved payment does not match the reviewed details.");
    setUncertain(false);
    if (prepared.status === "approval_required") onSubmitted(prepared);
  });

  useEffect(() => {
    // One attempt per displayed payment intent, including React StrictMode effect replay.
    // Expiry while reading never silently replaces terms or reuses customer acceptance.
    if (current && !canRefreshReview) { automaticReview.current = intentKey; return; }
    if (!canQuote || !props.fxEnabled || pending || !matches
      || (draft && draft.status !== "draft" && !canRefreshReview)
      || automaticReview.current === intentKey) return;
    automaticReview.current = intentKey;
    void prepareReview();
    // Operations use the latest render; changing response objects must not repeat preparation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentKey, canQuote, props.fxEnabled, pending, matches, canRefreshReview]);

  return <section aria-label="SGD LOCAL payment review" className="space-y-4 rounded-2xl border p-5">
    <h3 className="font-semibold">SGD LOCAL payment terms</h3>
    <SgdLocalAmountBreakdown sourceAmount={props.sourceAmount} amounts={matches ? draft?.payout_amounts : null} />
    {instruction && matches && <dl className="space-y-2 text-sm">
      <div><dt>Receiving account</dt><dd>{instruction.receiving_account.name} · {instruction.receiving_account.bank} · ending {instruction.receiving_account.last_four}</dd></div>
      <div><dt>Payment purpose</dt><dd>{instruction.purpose_code}</dd></div>
      <div><dt>Payment reference</dt><dd>{draft?.reference_text || "None"}</dd></div>
      <div><dt>Current FX quote</dt><dd>{instruction.fx_quote_id} · {instruction.rate} SGD per USD</dd></div>
      <div><dt>FX expires</dt><dd>{instruction.expires_at}</dd></div>
      <div><dt>Financial terms expire</dt><dd>{terms?.expires_at}</dd></div>
      <div><dt>Reviewed NIUM fee</dt><dd>{terms?.fee_amount == null ? "Unverified" : `${terms.fee_currency} ${terms.fee_amount}`}</dd></div>
      <div><dt>Reviewed total wallet debit (USD)</dt><dd>{terms?.total_wallet_debit ?? "Unverified"}</dd></div>
      <div><dt>Internal principal reservation (USD)</dt><dd>{terms?.reservation_amount ?? instruction.source_amount}</dd></div>
      {terms?.pilot_reserve && <div><dt>Separate pilot fee reserve</dt><dd>{terms.pilot_reserve.amount} {terms.pilot_reserve.currency}</dd></div>}
    </dl>}
    <p className="text-sm">Submit records your payment instruction for independent Admin approval. Admin Approve &amp; submit initiates the payout.</p>
    {uncapped && <p className="text-sm text-amber-800">Additional NIUM charges are unknown, uncapped and not reserved. Only the USD principal is reserved. The total wallet debit and final SGD credit are unverified.</p>}
    {busy && <p role="status">Preparing or confirming payment details…</p>}
    {props.validationError && <p role="alert">{props.validationError}</p>}
    {!matches && <p role="alert">The saved draft has different payment details. Reopen the saved payment from Transfer Activity to review its existing details.</p>}
    {instruction && !instructionMatches && <p role="alert">The payment instruction does not match the current beneficiary, amount, currency or purpose.</p>}
    {instruction && !current && <p role="status">FX or financial terms expired or unavailable. Refresh review and accept the current terms before Submit.</p>}
    {!busy && !instruction && <p role="status">Current payment terms are unavailable. Refresh review to prepare them; Submit remains blocked until the terms can be verified and accepted.</p>}
    {!funded && <p role="status">A matching USD wallet with sufficient available balance for the reviewed debit is required.</p>}
    {unexpectedFee && <p role="alert">The provider charge exceeds the principal-only funding policy. Payment remains blocked.</p>}
    {pending && <p role="status">The request outcome is pending or unknown. Do not submit again; refresh or reconcile its status.</p>}
    {workflow?.blockers?.map((blocker) => <p key={blocker} role="status" className="text-sm">{blocker}</p>)}
    {error && <p role="alert">{error}</p>}
    <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={purposeConfirmed} onChange={(event) => setConfirmedPurpose(event.target.checked ? intentKey : null)} />The selected payment purpose is truthful.</label>
    {ready && <>
      <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={accepted} onChange={(event) => setAcceptedReview(event.target.checked ? reviewKey : null)} />I authorize this beneficiary and receiving account, USD principal, SGD LOCAL payout, purpose, current FX quote and financial terms.</label>
      {uncapped && <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy} checked={uncappedAccepted} onChange={(event) => setUncappedReview(event.target.checked ? reviewKey : null)} />I explicitly accept that additional NIUM charges are unknown, uncapped and not reserved.</label>}
    </>}
    <div className="flex flex-wrap gap-2">
      {(!draft || draft.status === "draft" || canRefreshReview) && <Button variant="outline"
        disabled={busy || !canQuote || !props.fxEnabled || ["locking", "lock_unknown"].includes(workflow?.state ?? "")}
        onClick={() => void prepareReview()}>Refresh review</Button>}
      {draft && <Button variant="outline" disabled={busy || !canRead} onClick={() => void refresh()}>Refresh payment details</Button>}
      {draft && workflow?.can_reconcile_status && <Button variant="outline" disabled={busy || !canRead} onClick={() => void run(async () => {
        onDraft((await syncTransferStatus({ ...auth, transferId: draft.id })).transfer); clearAcceptance();
      })}>Reconcile status</Button>}
      {draft && workflow?.can_recover_captured_outcome && <Button variant="outline" disabled={busy || !canRead} onClick={() => void run(async () => {
        onDraft(await recoverSgdLocalCapturedOutcome({ ...auth, transferId: draft.id })); clearAcceptance();
      })}>Recover saved provider evidence</Button>}
      {draft && workflow?.can_request_recovery_review && <>
        <p role="status">{workflow.recovery_review_requested_at ? "Outcome review requested. Funds and payment evidence remain protected." : "Request an evidence review without repeating the FX lock or payment."}</p>
        <Button variant="outline" disabled={busy || !canRead || !!workflow.recovery_review_requested_at} onClick={() => void run(async () => {
          onDraft(await requestSgdLocalRecoveryReview({ ...auth, transferId: draft.id })); clearAcceptance();
        })}>Request outcome review</Button>
      </>}
      {draft?.status === "draft" && !pending && <Button variant="outline" disabled={busy || !canRead} onClick={() => void run(async () => {
        onDraft(await cancelTransfer({ ...auth, transferId: draft.id })); clearAcceptance();
      })}>Cancel preparation</Button>}
      <Button disabled={busy || pending || !ready || !accepted || !purposeConfirmed || (uncapped && !uncappedAccepted)} onClick={() => void run(async () => {
        if (!ready || !accepted || !purposeConfirmed || pending || (uncapped && !uncappedAccepted)) return;
        if (!draft || !workflow?.submission_token || !instruction || Date.parse(instruction.expires_at) <= Date.now()
          || Date.parse(instruction.financial_terms.expires_at) <= Date.now()
          || (amounts?.fx_lock_expires_at != null && !(Date.parse(amounts.fx_lock_expires_at) > Date.now()))) {
          throw new Error("FX or financial terms expired. Review new terms.");
        }
        // This endpoint records customer acceptance. It does not approve or dispatch the payout.
        onDraft({ ...draft, status: "submission_unknown" });
        const submitted = await submitSgdLocal({ ...auth, transferId: draft.id,
          submissionToken: workflow.submission_token, acceptUncappedCharges: uncappedAccepted });
        onDraft(submitted); clearAcceptance();
        if (submitted.status !== "approval_required") throw new Error("Payment acceptance could not be confirmed.");
        onSubmitted(submitted);
      })}>Submit</Button>
    </div>
  </section>;
}
