import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/services/apiClient";
import type { Beneficiary } from "@/services/moneyMovementService";
import type { ProviderSummary } from "@/services/fxOrderService";
import { normalizeStatus } from "@/lib/status";
import { dynamicOptions, dynamicQuote, dynamicReview, dynamicSubmit, dynamicStatus,
  type DynamicMode, type DynamicOptions, type DynamicQuote, type DynamicReview, type DynamicSubmission,
  type DynamicTransfer, type DynamicInstruction } from "@/services/niumDynamicService";
import { amountError, matchesQuote, matchesReview } from "./dynamicPaymentTerms";

type Saved = { request: DynamicSubmission; id?: string };
const terminal = new Set(["paid", "failed", "returned", "requires_attention", "cancelled"]);
const reasonText: Record<string, string> = {
  dynamic_quote_expired: "This quote expired. Request a new quote and review it again.",
  dynamic_quote_already_consumed: "This quote already belongs to a payment. Recover that payment before starting another.",
  dynamic_quote_binding_changed: "The beneficiary or payment details changed. Request a new quote.",
  dynamic_insufficient_available_funds: "The USD wallet cannot cover the principal and included USD 20 fee.",
  dynamic_review_binding_changed: "The reviewed details changed. Request a new quote and review again.",
  dynamic_wallet_has_unresolved_payout: "An earlier payment is awaiting confirmation. Check its status before sending another payment.",
  dynamic_confirmation_evidence_expired: "The payment checks expired. Review the payment again before submitting.",
  dynamic_customer_corridor_not_permitted: "This payment corridor is unavailable for your Nium account.",
  dynamic_customer_corridor_ambiguous: "Nium could not establish an unambiguous payment corridor for your account.",
  dynamic_payout_instruction_rejected: "Nium could not validate these payment instructions. Check the payment purpose and source of funds.",
};
function errorText(error: unknown) {
  if (error instanceof ApiRequestError) {
    const reasons = error.payload?.reason_codes;
    if (Array.isArray(reasons)) {
      return reasons.map((reason) => reasonText[String(reason)] ?? "The provider cannot currently verify these payment terms.").filter((v, i, all) => all.indexOf(v) === i).join(" ");
    }
  }
  return error instanceof Error ? error.message : "Payment information is temporarily unavailable.";
}

// Candidate screening mirrors the customer boundary; only options/quote/review grant availability.
// USD and SGD retain their existing transfer workflows.
export const isDynamicBeneficiaryCandidate = (beneficiary: Beneficiary, provider?: ProviderSummary) =>
  provider?.code === "nium" && provider.status === "active" && provider.supports_transfers
  && beneficiary.provider_id === provider.id && ["active", "approved", "verified"].includes(normalizeStatus(beneficiary.status))
  && beneficiary.payout_method === "LOCAL" && !["USD", "SGD"].includes(beneficiary.currency);

export function useDynamicPayment(selected: Beneficiary | null, canWrite: boolean) {
  const { user, token } = useAuth();
  const auth = { userId: String(user?.id ?? ""), token: token ?? "" };
  const storageKey = `origin-dynamic-payment:${auth.userId}`;
  const beneficiaryId = selected?.id ?? 0;
  const [currency, setCurrency] = useState("");
  const [mode, setMode] = useState<DynamicMode>("SOURCE_AMOUNT");
  const [amount, setAmount] = useState("");
  const [instruction, setInstruction] = useState<DynamicInstruction>({ purpose_code: "", source_of_funds: "", comment: "" });
  const [options, setOptions] = useState<DynamicOptions | null>(null);
  const [quote, setQuote] = useState<DynamicQuote | null>(null);
  const [review, setReview] = useState<DynamicReview | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [transfer, setTransfer] = useState<DynamicTransfer | null>(null);
  const [activity, setActivity] = useState<DynamicTransfer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const sending = useRef(false);
  const generation = useRef(0);
  const identity = `${auth.userId}:${auth.token}`;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const expired = !!quote && Date.parse(quote.quote_expires_at) <= now;
  const reviewExpired = !!review && Date.parse(review.review_expires_at ?? review.quote_expires_at) <= now;
  const locked = busy || saved !== null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    ++generation.current;
    setSaved(null); setTransfer(null); setQuote(null); setReview(null); setOptions(null); setAccepted(false);
    setReady(false); setBusy(false); setCurrency(""); setActivity([]); setError("");
    setMode("SOURCE_AMOUNT"); setAmount(""); setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
    if (!auth.userId || !auth.token) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const candidate: Saved = JSON.parse(raw);
        if (!candidate.request || !/^[a-f0-9]{64}$/.test(candidate.request.accepted_fingerprint)
          || candidate.request.client_reference !== `DYN-${candidate.request.accepted_fingerprint}`
          || ![candidate.request.provider_account_id, candidate.request.beneficiary_id, candidate.request.balance_id].every((v) => Number.isInteger(v) && v > 0)
          || (candidate.id !== undefined && typeof candidate.id !== "string")) throw new Error("Saved payment recovery data is invalid. Contact support before submitting again.");
        setSaved(candidate);
      }
      setReady(true);
    } catch (failure) { setError(errorText(failure)); }
    // Session/identity changes discard all in-memory quote and consent state.
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const version = ++generation.current;
    setQuote(null); setReview(null); setAccepted(false); setOptions(null); setCurrency("");
    setAmount(""); setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
    if (!beneficiaryId || saved) { setBusy(false); return; }
    setBusy(true); setError("");
    dynamicOptions(auth, beneficiaryId).then((result) => {
      if (generation.current !== version) return;
      if (result.beneficiary.id !== beneficiaryId) throw new Error("Beneficiary response changed. Refresh the beneficiary list.");
      setOptions(result);
    }).catch((failure) => { if (generation.current === version) setError(errorText(failure)); })
      .finally(() => { if (generation.current === version) setBusy(false); });
  }, [beneficiaryId, identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!saved?.id || !auth.token) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await dynamicStatus(auth, saved.id!);
        if (!active) return;
        if (result.id !== saved.id || result.beneficiary.id !== saved.request.beneficiary_id) throw new Error("Payment status binding changed. Contact support.");
        setTransfer(result); rememberActivity(result); setError("");
        if (!terminal.has(result.status)) timer = setTimeout(poll, 10000);
      } catch (failure) { if (active) { setError(errorText(failure)); timer = setTimeout(poll, 15000); } }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [saved?.id, identity, statusRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberActivity = (result: DynamicTransfer) => setActivity((items) =>
    [result, ...items.filter((item) => item.id !== result.id)].slice(0, 5));
  const clearReview = () => { ++generation.current; setReview(null); setAccepted(false); setError(""); };
  const invalidate = () => { ++generation.current; setQuote(null); setReview(null); setAccepted(false); setError(""); };
  const getQuote = async () => {
    if (sending.current || busy || saved || !ready || !canWrite || !currency
      || !options?.quote_availability.destination_currencies.includes(currency)) return;
    const validation = amountError(mode, amount);
    if (validation) { setError(validation); return; }
    const version = ++generation.current;
    setBusy(true); setError(""); setQuote(null); setReview(null); setAccepted(false);
    try {
      const result = await dynamicQuote(auth, { beneficiary_id: beneficiaryId, destination_currency: currency, amount_mode: mode, entered_amount: amount });
      if (generation.current !== version) return;
      if (!matchesQuote(result, beneficiaryId, currency, mode, amount)) throw new Error("The quoted amounts do not match this payment. Request a new quote.");
      setQuote(result);
    } catch (failure) { if (generation.current === version) setError(errorText(failure)); }
    finally { if (generation.current === version) setBusy(false); }
  };
  const getReview = async () => {
    if (busy || saved || !ready || !canWrite || !quote || Date.parse(quote.quote_expires_at) <= Date.now()) return;
    const version = ++generation.current;
    setBusy(true); setReview(null); setAccepted(false); setError("");
    try {
      const result = await dynamicReview(auth, { beneficiary_id: beneficiaryId, dynamic_quote_id: quote.dynamic_quote_id, instruction });
      if (generation.current !== version) return;
      if (!matchesReview(result, quote, instruction)) throw new Error("The server cannot currently authorize these payment terms. Submission is unavailable.");
      setReview(result);
      return true;
    } catch (failure) { if (generation.current === version) setError(errorText(failure)); }
    finally { if (generation.current === version) setBusy(false); }
  };
  const submit = async () => {
    if (sending.current || !ready || saved?.id) return;
    let recovery = saved;
    if (!recovery) {
      if (!canWrite || !review || !quote || !accepted || Date.parse(quote.quote_expires_at) <= Date.now() || Date.parse(review.review_expires_at ?? review.quote_expires_at) <= Date.now() || !matchesReview(review, quote, instruction)) return;
      recovery = { request: { provider_account_id: review.provider_account_id, beneficiary_id: review.beneficiary_id,
        balance_id: review.balance_id, client_reference: `DYN-${review.accepted_fingerprint!}`, accepted_fingerprint: review.accepted_fingerprint! } };
    }
    sending.current = true; setBusy(true); setError("");
    const startedIdentity = identity;
    try {
      // Persist BEFORE sending. A timeout/reload must reuse exactly this operation.
      sessionStorage.setItem(storageKey, JSON.stringify(recovery));
      setSaved(recovery);
      const result = await dynamicSubmit(auth, recovery.request);
      if (currentIdentity.current !== startedIdentity) return;
      if (!result.id || result.beneficiary.id !== recovery.request.beneficiary_id) throw new Error("Payment identity changed. Contact support before retrying.");
      const completed = { ...recovery, id: result.id };
      sessionStorage.setItem(storageKey, JSON.stringify(completed)); setSaved(completed); setTransfer(result); rememberActivity(result);
    } catch (failure) {
      if (currentIdentity.current === startedIdentity) {
        const reasons = failure instanceof ApiRequestError ? failure.payload?.reason_codes : null;
        const refusedBeforeAdmission = failure instanceof ApiRequestError && failure.status === 409 && Array.isArray(reasons)
          && reasons.length === 1 && ["dynamic_confirmation_evidence_expired", "dynamic_insufficient_available_funds",
            "dynamic_quote_expired", "dynamic_quote_binding_changed", "dynamic_review_binding_changed"].includes(String(reasons[0]));
        if (refusedBeforeAdmission) {
          try {
            sessionStorage.removeItem(storageKey); setSaved(null); setReview(null); setAccepted(false);
            setError(errorText(failure));
          } catch (storageFailure) { setError(errorText(storageFailure)); }
        } else setError(`${errorText(failure)} Recover using the same submission; do not create another payment.`);
      }
    } finally { sending.current = false; if (currentIdentity.current === startedIdentity) setBusy(false); }
  };
  const startAnother = () => {
    if (!saved?.id || !transfer || !["paid", "cancelled"].includes(transfer.status)) return;
    try {
      sessionStorage.removeItem(storageKey);
      invalidate(); setSaved(null); setTransfer(null); setOptions(null); setCurrency(""); setAmount("");
      setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
      return true;
    } catch (failure) { setError(errorText(failure)); }
  };

  return { selected, currency, mode, amount, instruction, options, quote, review, accepted, saved, transfer,
    activity, busy, error, ready, expired, reviewExpired, locked: locked || !ready || !canWrite,
    getQuote, getReview, submit, startAnother, invalidate, clearReview, setAccepted,
    refreshStatus: () => setStatusRefresh((value) => value + 1),
    changeCurrency: (value: string) => { invalidate(); setCurrency(value); },
    changeMode: (value: DynamicMode) => { invalidate(); setMode(value); setAmount(""); },
    changeAmount: (value: string) => { invalidate(); setAmount(value); },
    changeInstruction: (key: keyof DynamicInstruction, value: string) => { clearReview(); setInstruction({ ...instruction, [key]: value }); },
  };
}

export type DynamicPayment = ReturnType<typeof useDynamicPayment>;
