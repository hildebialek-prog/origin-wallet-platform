import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/services/apiClient";
import type { Balance, Beneficiary } from "@/services/moneyMovementService";
import type { ProviderSummary } from "@/services/fxOrderService";
import { normalizeStatus } from "@/lib/status";
import { dynamicOptions, dynamicQuote, dynamicReview, dynamicSubmit, dynamicStatus, dynamicTransfers,
  type DynamicMode, type DynamicOptions, type DynamicQuote, type DynamicReview, type DynamicSubmission,
  type DynamicTransfer, type DynamicTransferPage, type DynamicInstruction } from "@/services/niumDynamicService";
import { amountError, currencyScale, instructionError, matchesQuote, matchesReview, matchesTransfer, matchesTransferPage, quoteOptionsAvailable, reasonCodes, walletDebitError } from "./dynamicPaymentTerms";

type Saved = { request: DynamicSubmission; id?: string; beneficiaryId?: never }
  | { request?: never; id: string; beneficiaryId: number };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const clientReference = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;
const terminal = new Set(["paid", "failed", "returned", "requires_attention", "cancelled"]);
const reasonText: Record<string, string> = {
  dynamic_corridor_unsupported: "Dynamic is unavailable for this beneficiary's corridor.",
  dynamic_quote_expired: "This quote expired. Request a new quote and review it again.",
  dynamic_quote_already_consumed: "This quote already belongs to a payment. Recover that payment before starting another.",
  dynamic_quote_binding_changed: "The beneficiary or payment details changed. Request a new quote.",
  dynamic_insufficient_available_funds: "The USD wallet cannot cover the principal and applicable fees.",
  dynamic_financial_authorization_unavailable: "Transfer pricing is not yet authorized. This payment is unavailable.",
  dynamic_pricing_corridor_unsupported: "The selected corridor has no supported Dynamic fee agreement.",
  dynamic_financial_terms_changed: "The transfer pricing changed. Request a new quote and review the terms again.",
  dynamic_provider_financial_mapping_unverified: "The provider's fees and wallet debit cannot currently be verified.",
  dynamic_production_quote_contract_unverified: "Nium quoting is not yet verified for this account. This payment is unavailable.",
  dynamic_review_binding_changed: "The reviewed details changed. Request a new quote and review again.",
  dynamic_wallet_has_unresolved_payout: "An earlier payment is awaiting confirmation. Check its status before sending another payment.",
  dynamic_confirmation_evidence_expired: "The payment checks expired. Review the payment again before submitting.",
  dynamic_customer_corridor_not_permitted: "This payment corridor is unavailable for your Nium account.",
  dynamic_customer_corridor_ambiguous: "Nium could not establish an unambiguous payment corridor for your account.",
  dynamic_payout_instruction_rejected: "Nium could not validate these payment instructions. Check the payment purpose and source of funds.",
  dynamic_payout_submission_disabled: "Automatic payment processing is unavailable. Check any existing payment's status before trying again.",
  dynamic_transfer_status_unavailable: "Payment status is unavailable. The outcome may be unknown; do not submit another payment.",
};
const describeReasons = (reasons: string[]) => reasons.map((reason) => reasonText[reason]
  ?? `The provider cannot currently verify these payment terms (${reason}).`).filter((v, i, all) => all.indexOf(v) === i).join(" ");
function errorText(error: unknown) {
  if (error instanceof ApiRequestError) {
    const reasons = error.payload?.reason_codes;
    if (Array.isArray(reasons) && reasons.length > 0) {
      return describeReasons(reasons.map(String));
    }
  }
  return error instanceof Error ? error.message : "Payment information is temporarily unavailable.";
}

// All valid Nium recipients may request an options check. Only the backend grants corridor availability.
export const isDynamicBeneficiaryCandidate = (beneficiary: Beneficiary, provider?: ProviderSummary) =>
  provider?.code === "nium" && provider.status === "active" && provider.supports_transfers
  && beneficiary.provider_id === provider.id && ["active", "approved", "verified"].includes(normalizeStatus(beneficiary.status));

export function useDynamicPayment(selected: Beneficiary | null, canWrite: boolean, balances: readonly Balance[]) {
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
  const [acceptedFingerprint, setAcceptedFingerprint] = useState<string | null>(null);
  const accepted = !!review && acceptedFingerprint === review.accepted_fingerprint;
  const [saved, setSaved] = useState<Saved | null>(null);
  const [transfer, setTransfer] = useState<DynamicTransfer | null>(null);
  const [activity, setActivity] = useState<DynamicTransfer[]>([]);
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [refusalCodes, setRefusalCodes] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [recovering, setRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryPage, setRecoveryPage] = useState<DynamicTransferPage | null>(null);
  const lookupSequence = useRef(0);
  const lookupActive = useRef(false);
  const sending = useRef(false);
  const generation = useRef(0);
  const pendingQuote = useRef<number | null>(null);
  const identity = `${auth.userId}:${auth.token}`;
  const [stateIdentity, setStateIdentity] = useState(identity);
  const sameIdentity = stateIdentity === identity;
  const currentIdentity = useRef(identity);
  currentIdentity.current = identity;
  const scope = `${identity}:${beneficiaryId}:${selected?.provider_id}:${selected?.country_code}:${selected?.currency}:${selected?.payout_method}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const expired = !!quote && Date.parse(quote.quote_expires_at) <= Math.max(now, Date.now());
  const reviewExpired = !!review && Date.parse(review.review_expires_at) <= Math.max(now, Date.now());
  const locked = (busy && !quoting) || recovering || saved !== null;
  const recoveryBeneficiaryId = saved?.request?.beneficiary_id ?? saved?.beneficiaryId;
  const availabilityReasons = [...new Set([...reasonCodes(options?.reason_codes), ...reasonCodes(options?.quote_availability?.reason_codes)])];
  const available = quoteOptionsAvailable(options, beneficiaryId)
    && options!.quote_availability.payout_rail === selected?.payout_method;
  const currencies = available ? options!.quote_availability.destination_currencies : [];
  const rails = available ? options!.eligible_payout_rails! : [];
  const payoutRail = rails.length === 1 && rails[0] === options?.quote_availability.payout_rail ? rails[0] : "";
  const amountModes = available ? options!.quote_availability.supported_amount_modes! : [];
  const scales = available ? options!.currency_scales : undefined;
  const sourceScale = currencyScale(scales, "USD");
  const destinationScale = currencyScale(scales, currency);
  const availabilityReason = options && !available
    ? describeReasons(availabilityReasons) || "Complete provider, customer, financial and payout-method authority is unavailable. Dynamic quoting is disabled."
    : "";
  const wallets = balances.filter((balance) => balance.provider_id === selected?.provider_id && balance.currency === "USD");
  const wallet = wallets.length === 1 ? wallets[0] : null;
  const balanceError = quote ? walletDebitError(review?.total_usd_debit ?? quote.planned_total_usd_debit, wallet?.available_balance) : "";
  const sendAmount = mode === "SOURCE_AMOUNT" ? amount : quote?.planned_total_usd_debit ?? "";
  const receiveAmount = mode === "DESTINATION_AMOUNT" ? amount : quote?.quoted_destination_amount.amount ?? "";
  const executable = !!quote && !!review && available && amountModes.includes(mode)
    && matchesQuote(quote, beneficiaryId, currency, mode, amount, scales) && matchesReview(review, quote, instruction);
  const reportError = (failure: unknown) => {
    setRefusalCodes(failure instanceof ApiRequestError ? reasonCodes(failure.payload?.reason_codes) : []);
    setError(errorText(failure));
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setStateIdentity(identity);
    ++lookupSequence.current; lookupActive.current = false;
    setRecovering(false); setRecoveryPage(null); setRecoveryError("");
    ++generation.current;
    pendingQuote.current = null;
    setSaved(null); setTransfer(null); setQuote(null); setReview(null); setOptions(null); setAcceptedFingerprint(null);
    setReady(false); setBusy(false); setQuoting(false); setCurrency(""); setActivity([]); setError("");
    setRefusalCodes([]);
    setMode("SOURCE_AMOUNT"); setAmount(""); setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
    if (!auth.userId || !auth.token) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const candidate: Saved = JSON.parse(raw);
        if (candidate.request ? (!/^[a-f0-9]{64}$/.test(candidate.request.accepted_fingerprint)
          || candidate.request.client_reference !== `DYN-${candidate.request.accepted_fingerprint}`
          || ![candidate.request.provider_account_id, candidate.request.beneficiary_id, candidate.request.balance_id].every((v) => Number.isInteger(v) && v > 0)
          || (candidate.id !== undefined && !uuid.test(candidate.id)))
          : (!uuid.test(candidate.id) || !Number.isInteger(candidate.beneficiaryId) || candidate.beneficiaryId <= 0)) {
          throw new Error("Saved payment recovery data is invalid. Use the read-only lookup or contact support before submitting again.");
        }
        setSaved(candidate);
      }
      setReady(true);
    } catch (failure) { reportError(failure); }
    // Session/identity changes discard all in-memory quote and consent state.
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const version = ++generation.current;
    pendingQuote.current = null;
    setQuoting(false);
    setQuote(null); setReview(null); setAcceptedFingerprint(null); setOptions(null); setCurrency("");
    setRefusalCodes([]);
    setAmount(""); setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
    if (!beneficiaryId || saved) { setBusy(false); return; }
    setBusy(true); setError(""); setRefusalCodes([]);
    dynamicOptions(auth, beneficiaryId).then((result) => {
      if (generation.current !== version) return;
      if (currentScope.current !== scope) return;
      if (!result?.beneficiary || result.beneficiary.id !== beneficiaryId || result.beneficiary.currency !== selected?.currency
        || result.beneficiary.country_code !== selected?.country_code) throw new Error("Beneficiary response changed or is incomplete. Refresh the beneficiary list.");
      setOptions(result);
      setRefusalCodes([...new Set([...reasonCodes(result.reason_codes), ...reasonCodes(result.quote_availability?.reason_codes)])]);
      if (quoteOptionsAvailable(result, beneficiaryId) && result.quote_availability.payout_rail === selected?.payout_method
        && result.quote_availability.destination_currencies.includes(result.beneficiary.currency)) {
        setCurrency(result.beneficiary.currency);
        setMode(result.quote_availability.supported_amount_modes![0]);
      }
    }).catch((failure) => { if (generation.current === version && currentScope.current === scope) reportError(failure); })
      .finally(() => { if (generation.current === version) setBusy(false); });
    return () => { ++generation.current; pendingQuote.current = null; };
  }, [selected, identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!saved?.id || !auth.token) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await dynamicStatus(auth, saved.id!);
        if (!active) return;
        if (result?.id !== saved.id || !matchesTransfer(result, recoveryBeneficiaryId!, review)) throw new Error("Payment status binding changed or is incomplete. Contact support.");
        setTransfer(result); rememberActivity(result); setError(""); setRefusalCodes([]);
        if (!terminal.has(result.status)) timer = setTimeout(poll, 10000);
      } catch (failure) { if (active) { reportError(failure); timer = setTimeout(poll, 15000); } }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [saved?.id, identity, statusRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const rememberActivity = (result: DynamicTransfer) => setActivity((items) =>
    [result, ...items.filter((item) => item.id !== result.id)].slice(0, 5));
  const clearReview = () => {
    ++generation.current; pendingQuote.current = null;
    setBusy(false); setQuoting(false); setReview(null); setAcceptedFingerprint(null); setError(""); setRefusalCodes([]);
  };
  const invalidate = () => {
    ++generation.current; pendingQuote.current = null;
    setQuoting(false); setBusy(false); setQuote(null); setReview(null); setAcceptedFingerprint(null); setError("");
    setRefusalCodes([]);
  };

  // Recovery is GET-only. A failed or empty lookup never authorizes another POST.
  const lookup = async (kind: "recent" | "reference" | "id", value = "", page = 1) => {
    if (!auth.userId || !auth.token || sending.current || lookupActive.current || !sameIdentity) return;
    if (kind === "reference" && (value.trim() !== value || !clientReference.test(value))) { setRecoveryError("Enter the exact payment client reference."); return; }
    if (kind === "id" && (value.trim() !== value || !uuid.test(value))) { setRecoveryError("Enter a valid Dynamic transfer ID."); return; }
    if (kind !== "recent" && saved && (saved.id ? kind !== "id" || value !== saved.id
      : kind !== "reference" || value !== saved.request?.client_reference)) {
      setRecoveryError("Resolve the saved payment using its retained identity before opening another payment."); return;
    }
    const startedIdentity = identity;
    const version = ++lookupSequence.current;
    lookupActive.current = true; setRecovering(true); setRecoveryError("");
    try {
      let result: DynamicTransfer;
      if (kind === "id") {
        result = await dynamicStatus(auth, value);
        if (result?.id !== value) throw new Error("Recovered payment identity changed. Contact support.");
      } else {
        const found = await dynamicTransfers(auth, kind === "reference" ? { client_reference: value } : { page });
        if (currentIdentity.current !== startedIdentity || lookupSequence.current !== version) return;
        if (!matchesTransferPage(found, kind === "reference" ? 1 : page)) throw new Error("The payment lookup response is incomplete. Contact support before submitting again.");
        if (kind === "recent") { setRecoveryPage(found); return; }
        if (found.data.length === 0) throw new Error("No matching transfer was found yet. The outcome may be unknown. Keep this reference and check again; do not submit another payment.");
        if (found.data.length !== 1 || found.has_more) throw new Error("The payment reference is ambiguous. Contact support before submitting again.");
        result = found.data[0];
      }
      if (currentIdentity.current !== startedIdentity || lookupSequence.current !== version) return;
      const expectedBeneficiary = recoveryBeneficiaryId ?? result?.beneficiary?.id;
      if (!Number.isInteger(expectedBeneficiary) || expectedBeneficiary <= 0 || !matchesTransfer(result, expectedBeneficiary, saved ? review : null)) {
        throw new Error("Recovered payment terms or beneficiary changed. Contact support before submitting again.");
      }
      const recovered: Saved = saved?.request ? { request: saved.request, id: result.id }
        : { id: result.id, beneficiaryId: result.beneficiary.id };
      invalidate(); setSaved(recovered); setTransfer(result); rememberActivity(result); setReady(true);
      try { sessionStorage.setItem(storageKey, JSON.stringify(recovered)); }
      catch { setRecoveryError("Payment recovered, but browser storage is unavailable. Retain the payment ID for future status checks."); }
    } catch (failure) {
      if (currentIdentity.current === startedIdentity && lookupSequence.current === version) setRecoveryError(errorText(failure));
    } finally {
      if (currentIdentity.current === startedIdentity && lookupSequence.current === version) {
        lookupActive.current = false; setRecovering(false);
      }
    }
  };
  const getQuote = async () => {
    if (!sameIdentity || sending.current || lookupActive.current || busy || pendingQuote.current !== null || saved || !ready || !canWrite || !currency
      || !available || !currencies.includes(currency)) return;
    const modes = options!.quote_availability.supported_amount_modes;
    if (!modes?.includes(mode)) { setError("Nium does not support quoting from this amount field for the selected beneficiary."); return; }
    const validation = amountError(mode, amount, mode === "SOURCE_AMOUNT" ? sourceScale : destinationScale);
    if (validation) { setError(validation); return; }
    if (mode === "SOURCE_AMOUNT") {
      const funds = walletDebitError(amount, wallet?.available_balance);
      if (funds) { setError(funds); return; }
    }
    const version = ++generation.current;
    const requestedScope = scope;
    pendingQuote.current = version;
    setBusy(true); setQuoting(true); setError(""); setRefusalCodes([]); setQuote(null); setReview(null); setAcceptedFingerprint(null);
    try {
      const result = await dynamicQuote(auth, { beneficiary_id: beneficiaryId, destination_currency: currency, amount_mode: mode, entered_amount: amount });
      if (generation.current !== version || currentScope.current !== requestedScope) return;
      if (!matchesQuote(result, beneficiaryId, currency, mode, amount, scales) || result.payout_rail !== payoutRail
        || result.customer_pricing?.country !== selected?.country_code) throw new Error("The quoted amounts or payout method do not match this payment. Request a new quote.");
      setQuote(result);
    } catch (failure) { if (generation.current === version && currentScope.current === requestedScope) reportError(failure); }
    finally {
      if (generation.current === version && currentScope.current === requestedScope) {
        pendingQuote.current = null; setBusy(false); setQuoting(false);
      }
    }
  };
  const getReview = async () => {
    if (!sameIdentity || lookupActive.current || busy || saved || !ready || !canWrite || !available || !quote || Date.parse(quote.quote_expires_at) <= Date.now()) return;
    if (!matchesQuote(quote, beneficiaryId, currency, mode, amount, scales)) return;
    const invalidInstruction = instructionError(instruction);
    if (invalidInstruction) { setError(invalidInstruction); return; }
    if (balanceError) { setError(balanceError); return; }
    const version = ++generation.current;
    const requestedScope = scope;
    setBusy(true); setReview(null); setAcceptedFingerprint(null); setError(""); setRefusalCodes([]);
    try {
      const result = await dynamicReview(auth, { beneficiary_id: beneficiaryId, dynamic_quote_id: quote.dynamic_quote_id, instruction });
      if (generation.current !== version || currentScope.current !== requestedScope) return;
      if (result.status === "UNAVAILABLE" || result.reason_codes?.length) {
        throw new ApiRequestError(describeReasons(result.reason_codes ?? []) || "Dynamic Review is currently unavailable.", 503, undefined,
          { reason_codes: result.reason_codes });
      }
      if (!matchesReview(result, quote, instruction)) throw new Error("The server cannot currently authorize these payment terms. Submission is unavailable.");
      if (!wallet || result.balance_id !== wallet.id) throw new Error("The reviewed funding wallet does not match the available USD balance.");
      const funds = walletDebitError(result.total_usd_debit, wallet.available_balance);
      if (funds) throw new Error(funds);
      setReview(result);
      return true;
    } catch (failure) { if (generation.current === version && currentScope.current === requestedScope) reportError(failure); }
    finally { if (generation.current === version && currentScope.current === requestedScope) setBusy(false); }
  };
  const submit = async () => {
    if (!sameIdentity || sending.current || lookupActive.current || !ready || saved?.id) return;
    if (saved?.request) { await lookup("reference", saved.request.client_reference); return; }
    if (busy || !canWrite || !executable || !review || !quote || !accepted) return;
    // Expiry can pass between the last render and this click.
    if (!matchesReview(review, quote, instruction)) { setAcceptedFingerprint(null); return; }
    if (!wallet || review.balance_id !== wallet.id) { setError("The reviewed funding wallet is unavailable. Refresh balances and review again."); return; }
    const funds = walletDebitError(review.total_usd_debit, wallet.available_balance);
    if (funds) { setError(funds); setAcceptedFingerprint(null); return; }
    const recovery = { request: { provider_account_id: review.provider_account_id, beneficiary_id: review.beneficiary_id,
      balance_id: review.balance_id, client_reference: `DYN-${review.accepted_fingerprint!}`, accepted_fingerprint: review.accepted_fingerprint! } };
    sending.current = true; setBusy(true); setError(""); setRefusalCodes([]);
    const startedIdentity = identity;
    try {
      // Persist BEFORE the sole initiation. Timeout/reload recovery uses GET only.
      sessionStorage.setItem(storageKey, JSON.stringify(recovery));
      setSaved(recovery);
      const result = await dynamicSubmit(auth, recovery.request);
      if (currentIdentity.current !== startedIdentity) return;
      if (!matchesTransfer(result, recovery.request.beneficiary_id, review)) throw new Error("Payment identity or confirmed terms changed. Contact support before retrying.");
      const completed = { ...recovery, id: result.id };
      // Retain a known intent in memory even if updating durable browser storage fails.
      setSaved(completed); setTransfer(result); rememberActivity(result);
      sessionStorage.setItem(storageKey, JSON.stringify(completed));
    } catch (failure) {
      if (currentIdentity.current === startedIdentity) {
        const reasons = failure instanceof ApiRequestError ? failure.payload?.reason_codes : null;
        setRefusalCodes(reasonCodes(reasons));
        const refusedBeforeAdmission = failure instanceof ApiRequestError && failure.status === 409 && Array.isArray(reasons)
          && reasons.length === 1 && ["dynamic_confirmation_evidence_expired", "dynamic_insufficient_available_funds",
            "dynamic_quote_expired", "dynamic_quote_binding_changed", "dynamic_review_binding_changed"].includes(String(reasons[0]));
        if (refusedBeforeAdmission) {
          try {
            sessionStorage.removeItem(storageKey); setSaved(null); setReview(null); setAcceptedFingerprint(null);
            setError(errorText(failure));
          } catch (storageFailure) { setError(errorText(storageFailure)); }
        } else setError(`${errorText(failure)} Look up this payment using its retained reference; do not create another payment.`);
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

  return { selected, currency: sameIdentity ? currency : "", mode, amount: sameIdentity ? amount : "",
    sendAmount: sameIdentity ? sendAmount : "", receiveAmount: sameIdentity ? receiveAmount : "", instruction,
    options: sameIdentity ? options : null, quote: sameIdentity ? quote : null, review: sameIdentity ? review : null,
    accepted: sameIdentity && accepted, saved: sameIdentity ? saved : null, transfer: sameIdentity ? transfer : null,
    recoveryBeneficiaryId: sameIdentity ? recoveryBeneficiaryId : undefined,
    recoveryPage: sameIdentity ? recoveryPage : null, recoveryError: sameIdentity ? recoveryError : "", recovering,
    lookupRecent: (page = 1) => lookup("recent", "", page), lookupReference: (value: string) => lookup("reference", value),
    lookupId: (value: string) => lookup("id", value),
    availableUsdBalance: typeof wallet?.available_balance === "string" ? wallet.available_balance : null, balanceError,
    available: sameIdentity && available, currencies: sameIdentity ? currencies : [], rails, payoutRail, availabilityReason,
    amountModes: sameIdentity ? amountModes : [], sourceScale, destinationScale,
    executableAmountModes: sameIdentity && executable ? [review!.amount_mode] : [],
    activity: sameIdentity ? activity : [], busy: busy || recovering, error: sameIdentity ? error : "", refusalCodes: sameIdentity ? refusalCodes : [],
    ready: sameIdentity && ready, expired, reviewExpired, locked: !sameIdentity || locked || !ready || !canWrite || !available,
    getQuote, getReview, submit, startAnother, invalidate, clearReview,
    setAccepted: (value: boolean) => setAcceptedFingerprint(value && executable ? review!.accepted_fingerprint! : null),
    refreshStatus: () => setStatusRefresh((value) => value + 1),
    changeCurrency: (value: string) => {
      if (value !== "" && !currencies.includes(value)) return;
      invalidate(); setCurrency(value); if (mode === "DESTINATION_AMOUNT") setAmount("");
    },
    changeSendAmount: (value: string) => { invalidate(); setMode("SOURCE_AMOUNT"); setAmount(value); },
    changeReceiveAmount: (value: string) => { invalidate(); setMode("DESTINATION_AMOUNT"); setAmount(value); },
    changeInstruction: (key: keyof DynamicInstruction, value: string) => { clearReview(); setInstruction((current) => ({ ...current, [key]: value })); },
  };
}

export type DynamicPayment = ReturnType<typeof useDynamicPayment>;
