import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createTransfer, reviewTransfer, type StandardSgdSubmitPayload, type Transfer, type TransferReview } from "@/services/moneyMovementService";
import { ApiRequestError } from "@/services/apiClient";
import { paymentUncertain, structuredTransfer } from "./paymentSafety";
import { SgdLocalAmountBreakdown } from "./SgdLocalAmountBreakdown";
import { reviewPayoutAmounts } from "./sgdFinancialTerms";

type Props = {
  userId: string;
  token: string;
  providerId: number;
  beneficiaryId: number;
  sourceAmount: string;
  purposeCode: string;
  referenceText: string;
  preparationReference: string;
  preparationId?: string;
  transferId?: number;
  accountIdentity?: string;
  verifyIdentity?: () => Promise<void>;
  onPrepared?: (transfer: Transfer) => void;
  onTermsConfirmed?: (review: TransferReview) => void;
  onRecovery?: (transfer: Transfer) => void;
  onInspect?: () => void;
  validationError: string;
  onSubmitted: (transfer: Transfer) => void;
  onBusyChange?: (busy: boolean) => void;
};

const decimal = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return (whole.replace(/^0+(?=\d)/, "") || "0") + (fraction.replace(/0+$/, "") ? "." + fraction.replace(/0+$/, "") : "");
};

const matchesReview = (review: TransferReview, props: Props) => review.source_currency === "USD" && review.destination_currency === "SGD"
  && decimal(review.source_amount) !== null && decimal(review.source_amount) === decimal(props.sourceAmount)
  && Number.isFinite(Number(review.fx_rate)) && Number(review.fx_rate) > 0
  && review.target_currency === "SGD" && review.provider_id === props.providerId && review.beneficiary_id === props.beneficiaryId
  && review.client_reference === props.preparationReference
  && Number.isInteger(review.id)
  && review.transfer_type === "payout" && review.purpose_code === props.purposeCode && review.reference_text === props.referenceText.trim()
  && typeof review.review_token === "string" && review.review_token.length > 0
  && review.terms?.currency === "USD" && decimal(review.terms?.fee_amount) === "0"
  && decimal(review.terms?.total_wallet_debit) !== null
  && decimal(review.terms?.total_wallet_debit) === decimal(props.sourceAmount)
  && (!review.payout_amounts || (review.payout_amounts.source_currency === "USD" && review.payout_amounts.destination_currency === "SGD"
    && decimal(String(review.payout_amounts.source_amount)) === decimal(review.source_amount)
    && decimal(String(review.payout_amounts.fx_rate)) === decimal(review.fx_rate)
    && Date.parse(review.payout_amounts.fx_lock_expires_at ?? "") === Date.parse(review.fx_expires_at)
    && decimal(String(review.payout_amounts.transfer_fee?.amount)) === decimal(review.terms.fee_amount)
    && review.payout_amounts.transfer_fee?.currency === "USD"
    && decimal(String(review.payout_amounts.total_wallet_debit)) === decimal(review.terms.total_wallet_debit)));

// Review prepares evidence only. Submit uses the same transfer endpoint as USD.
export default function SgdLocalReview(props: Props) {
  const [review, setReview] = useState<TransferReview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [purposeConfirmed, setPurposeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [now, setNow] = useState(Date.now());
  const started = useRef(false);
  const intent = JSON.stringify([props.userId, props.providerId, props.beneficiaryId,
    props.sourceAmount, props.purposeCode, props.referenceText, props.preparationReference, props.accountIdentity]);
  const preparations = useRef(new Map<string, Promise<TransferReview>>());
  const generation = useRef(0);
  const callbacks = useRef(props);
  callbacks.current = props;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setReview(null); setAccepted(false); setPurposeConfirmed(false); setError(""); setUncertain(false); setBlocked(false);
    const version = ++generation.current;
    if (props.validationError || !props.token || !props.userId) {
      setBusy(false); callbacks.current.onBusyChange?.(false);
      return;
    }
    setBusy(true);
    callbacks.current.onBusyChange?.(true);
    if (!preparations.current.has(intent)) preparations.current.set(intent, (async () => {
      await props.verifyIdentity?.();
      return reviewTransfer({ userId: props.userId, token: props.token, payload: {
      provider_id: props.providerId, beneficiary_id: props.beneficiaryId, source_amount: props.sourceAmount,
      purpose_code: props.purposeCode, reference_text: props.referenceText, client_reference: props.preparationReference,
      ...(props.transferId ? { transfer_id: props.transferId } : {}),
      ...(props.preparationId ? { preparation_id: props.preparationId } : {}),
    } }); })());
    void preparations.current.get(intent)!.then((result) => {
      if (generation.current === version) {
        if (!Number.isInteger(result.id) || result.id <= 0 || typeof result.transfer_no !== "string" || !result.transfer_no) {
          throw new Error("Review did not return a saved payment. Refresh the saved payment status before continuing.");
        }
        callbacks.current.onPrepared?.(result);
        if (paymentUncertain(result)) {
          setBlocked(true); setError("The saved payment requires recovery before continuing.");
          callbacks.current.onRecovery?.(result);
        } else {
          setReview(result);
          if (matchesReview(result, callbacks.current)) callbacks.current.onTermsConfirmed?.(result);
        }
      }
    }).catch((failure: unknown) => {
      if (generation.current === version) {
        setError(failure instanceof Error ? failure.message : "Payment terms are unavailable.");
        setBlocked(true);
        const transfer = structuredTransfer(failure);
        if (transfer) callbacks.current.onRecovery?.(transfer);
      }
    }).finally(() => {
      if (generation.current === version) {
        setBusy(false); callbacks.current.onBusyChange?.(false);
      }
    });
    return () => { generation.current++; callbacks.current.onBusyChange?.(false); };
    // Preparation runs once per intent, never on expiry or response updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, props.validationError, props.token]);

  const fresh = !!review && Date.parse(review.fx_expires_at) > Math.max(now, Date.now())
    && Date.parse(review.terms?.expires_at) > Math.max(now, Date.now());
  const matches = !!review && matchesReview(review, props);
  const ready = !blocked && !props.validationError && matches && accepted && purposeConfirmed && (fresh || uncertain);

  const submit = async () => {
    if (started.current || !ready || !review) return;
    started.current = true; setBusy(true); props.onBusyChange?.(true); setError("");
    try {
      await props.verifyIdentity?.();
      if (!uncertain && (Date.parse(review.fx_expires_at) <= Date.now() || Date.parse(review.terms.expires_at) <= Date.now())) {
        throw new Error("FX or financial terms expired before acceptance. A new review is required.");
      }
      const payload: StandardSgdSubmitPayload = {
        provider_id: props.providerId, beneficiary_id: props.beneficiaryId, transfer_type: "payout",
        source_currency: "USD", target_currency: "SGD", source_amount: props.sourceAmount,
        purpose_code: props.purposeCode, reference_text: props.referenceText,
        client_reference: props.preparationReference, review_token: review.review_token,
        accept_payment_terms: true, purpose_confirmed: true,
        transfer_id: review.id,
        ...(props.preparationId ? { preparation_id: props.preparationId } : {}),
      };
      const transfer = await createTransfer({ userId: props.userId, token: props.token, payload });
      props.onSubmitted(transfer);
    } catch (failure) {
      // A retry retains the same reference and review. It cannot create a second instruction.
      const transfer = structuredTransfer(failure);
      const ambiguous = failure instanceof ApiRequestError && (failure.status === 0 || failure.status >= 500) && !transfer;
      setUncertain(ambiguous);
      setBlocked(!ambiguous);
      if (transfer) props.onRecovery?.(transfer);
      setError(failure instanceof Error ? failure.message : "Payment acceptance could not be confirmed.");
    } finally {
      started.current = false; setBusy(false); props.onBusyChange?.(false);
    }
  };

  return <section aria-label="SGD LOCAL payment review" className="space-y-4 rounded-2xl border p-5">
    <h3 className="font-semibold">SGD LOCAL payment terms</h3>
    {busy && <p role="status">Preparing or confirming payment details…</p>}
    {review && <dl className="space-y-2 text-sm">
      <div><dt>USD source amount</dt><dd>{review.source_amount}</dd></div>
      <div><dt>FX rate (SGD per USD)</dt><dd>{review.fx_rate}</dd></div>
      <div><dt>FX expires</dt><dd>{review.fx_expires_at}</dd></div>
      <div><dt>NIUM transfer fee (USD)</dt><dd>{review.terms?.fee_amount ?? "Unavailable"}</dd></div>
      <div><dt>Total wallet debit (USD)</dt><dd>{review.terms?.total_wallet_debit ?? "Unavailable"}</dd></div>
      <div><dt>Pricing expires</dt><dd>{review.terms?.expires_at ?? "Unavailable"}</dd></div>
    </dl>}
    {review && matches && <SgdLocalAmountBreakdown sourceAmount={props.sourceAmount} amounts={reviewPayoutAmounts(review)} />}
    {!busy && !review && !error && <p role="status">Current payment terms are unavailable.</p>}
    {review && !fresh && <p role="status">FX or financial terms expired. Return to payment details and review again. Accepted terms will not be replaced automatically.</p>}
    {props.validationError && <p role="alert">{props.validationError}</p>}
    {error && <p role="alert">{error}</p>}
    {review && !matches && <p role="alert">Complete, matching financial terms are unavailable. Submission is blocked.</p>}
    {uncertain && <p role="status">Acceptance could not be confirmed. Retrying Submit checks the same payment instruction. Do not start another payment.</p>}
    <p className="text-sm">Submit saves your instruction for independent Admin approval. Admin Approve &amp; submit initiates the payout.</p>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={purposeConfirmed} disabled={busy || uncertain || blocked}
      onChange={(event) => setPurposeConfirmed(event.target.checked)} />The selected payment purpose is truthful.</label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} disabled={busy || !matches || !fresh || uncertain || blocked}
      onChange={(event) => setAccepted(event.target.checked)} />I authorize this beneficiary and receiving account, USD amount, SGD LOCAL payout, purpose, FX rate and verified financial terms.</label>
    <Button disabled={busy || !ready} onClick={() => void submit()}>Submit</Button>
    {props.onInspect && (blocked || uncertain || (!!review && !fresh)) && <Button variant="outline" disabled={busy} onClick={props.onInspect}>Check saved payment</Button>}
  </section>;
}
