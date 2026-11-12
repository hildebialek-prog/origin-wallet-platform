import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/services/apiClient";
import { getBeneficiaries, type Beneficiary } from "@/services/moneyMovementService";
import { getProviders } from "@/services/fxOrderService";
import { dynamicOptions, dynamicQuote, dynamicReview, dynamicSubmit, dynamicStatus,
  type DynamicMode, type DynamicOptions, type DynamicQuote, type DynamicReview, type DynamicSubmission,
  type DynamicTransfer, type DynamicInstruction } from "@/services/niumDynamicService";
import { amountError, matchesQuote, matchesReview, dynamicStatusLabel } from "./dynamicPaymentTerms";

type Saved = { request: DynamicSubmission; id?: string };
const terminal = new Set(["paid", "failed", "returned", "requires_attention", "cancelled"]);
const field = "rounded-lg border border-slate-300 bg-white p-3 text-slate-950 disabled:opacity-60";
const button = "rounded-lg bg-slate-900 px-5 py-3 text-white disabled:opacity-50";
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

export default function AccountDynamicTransfer() {
  const { user, token } = useAuth();
  const auth = { userId: String(user?.id ?? ""), token: token ?? "" };
  const storageKey = `origin-dynamic-payment:${auth.userId}`;
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState(0);
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
  const selected = beneficiaries.find((b) => b.id === beneficiaryId);
  const expired = !!quote && Date.parse(quote.quote_expires_at) <= now;
  const reviewExpired = !!review && Date.parse(review.review_expires_at ?? review.quote_expires_at) <= now;
  const locked = busy || saved !== null;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    ++generation.current;
    setSaved(null); setTransfer(null); setQuote(null); setReview(null); setOptions(null); setAccepted(false);
    setReady(false); setBusy(false); setBeneficiaryId(0); setCurrency(""); setBeneficiaries([]); setError("");
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
    Promise.all([getBeneficiaries(auth), getProviders()]).then(([items, providers]) => {
      if (!active) return;
      const list = Array.isArray(providers) ? providers : providers.data ?? [];
      const ids = new Set(list.filter((p) => p.code === "nium" && p.status === "active").map((p) => p.id));
      setBeneficiaries(items.filter((b) => ids.has(b.provider_id) && ["active", "approved", "verified"].includes(b.status)
        && b.payout_method === "LOCAL" && !["USD", "SGD"].includes(b.currency)));
    }).catch((failure) => { if (active) setError(errorText(failure)); });
    return () => { active = false; };
    // Session/identity changes discard all in-memory quote and consent state.
  }, [identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const version = ++generation.current;
    setQuote(null); setReview(null); setAccepted(false); setOptions(null); setCurrency("");
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
        setTransfer(result); setError("");
        if (!terminal.has(result.status)) timer = setTimeout(poll, 10000);
      } catch (failure) { if (active) { setError(errorText(failure)); timer = setTimeout(poll, 15000); } }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [saved?.id, identity, statusRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const invalidate = () => { ++generation.current; setQuote(null); setReview(null); setAccepted(false); setError(""); };
  const getQuote = async () => {
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
    if (!quote || expired) return;
    const version = ++generation.current;
    setBusy(true); setReview(null); setAccepted(false); setError("");
    try {
      const result = await dynamicReview(auth, { beneficiary_id: beneficiaryId, dynamic_quote_id: quote.dynamic_quote_id, instruction });
      if (generation.current !== version) return;
      if (!matchesReview(result, quote, instruction)) throw new Error("The server cannot currently authorize these payment terms. Submission is unavailable.");
      setReview(result);
    } catch (failure) { if (generation.current === version) setError(errorText(failure)); }
    finally { if (generation.current === version) setBusy(false); }
  };
  const submit = async () => {
    if (sending.current || !ready) return;
    let recovery = saved;
    if (!recovery) {
      if (!review || !quote || !accepted || Date.parse(review.review_expires_at ?? review.quote_expires_at) <= Date.now() || !matchesReview(review, quote, instruction)) return;
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
      sessionStorage.setItem(storageKey, JSON.stringify(completed)); setSaved(completed); setTransfer(result);
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
      invalidate(); setSaved(null); setTransfer(null); setBeneficiaryId(0); setOptions(null); setCurrency(""); setAmount("");
      setInstruction({ purpose_code: "", source_of_funds: "", comment: "" });
    } catch (failure) { setError(errorText(failure)); }
  };

  return <main className="mx-auto max-w-3xl space-y-6 p-6">
    <Link to="/account/transfers" className="underline">Back to transfers</Link>
    <h1 className="text-3xl font-semibold">Multi-currency payment</h1>
    {error && <p role="alert" className="rounded-lg bg-amber-50 p-4 text-amber-950">{error}</p>}
    {saved ? <section aria-label="Payment status" className="space-y-4 rounded-xl border p-5">
      <h2 className="text-xl font-semibold">{transfer ? dynamicStatusLabel[transfer.status] ?? "Status unavailable" : "Submission recovery"}</h2>
      {transfer && <><p role="status">{transfer.message}</p><p>Wallet debit: USD {transfer.total_usd_debit}</p><p>Recipient amount: {transfer.destination_amount.currency} {transfer.destination_amount.amount}</p><p>Payment: {transfer.id}</p></>}
      {saved.id && <button className={button} onClick={() => setStatusRefresh((value) => value + 1)}>Refresh payment status</button>}
      {saved.id && transfer && ["paid", "cancelled"].includes(transfer.status)
        && <button className={button} onClick={startAnother}>Start another payment</button>}
      {!saved.id && <><p>The provider outcome may be unknown. Keep this payment identity while recovering.</p><button className={button} disabled={busy} onClick={() => void submit()}>Recover same submission</button></>}
    </section> : <>
      <div className="grid gap-4">
        <label className="grid gap-2">Beneficiary<select aria-label="Beneficiary" className={field} value={beneficiaryId || ""} disabled={locked || !ready} onChange={(e) => setBeneficiaryId(Number(e.target.value))}>
          <option value="">Select beneficiary</option>{beneficiaries.map((b) => <option key={b.id} value={b.id}>{b.company_name || b.full_name} ({b.currency})</option>)}
        </select></label>
        <label className="grid gap-2">Recipient currency<select aria-label="Recipient currency" className={field} value={currency} disabled={locked || !options} onChange={(e) => { invalidate(); setCurrency(e.target.value); }}>
          <option value="">Select recipient currency</option>{options?.quote_availability.destination_currencies.map((code) => <option key={code} value={code}>{code}</option>)}
        </select></label>
        {options && options.quote_availability.destination_currencies.length === 0 && <p role="status">This beneficiary currently has no available recipient currency.</p>}
        <label className="grid gap-2">Amount mode<select aria-label="Amount mode" className={field} value={mode} disabled={locked || !currency} onChange={(e) => { invalidate(); setMode(e.target.value as DynamicMode); setAmount(""); }}>
          <option value="SOURCE_AMOUNT">USD wallet debit, including USD 20</option><option value="DESTINATION_AMOUNT">Recipient receives</option>
        </select></label>
        <label className="grid gap-2">{mode === "SOURCE_AMOUNT" ? "Total USD wallet debit" : `Recipient amount (${currency})`}<input aria-label="Payment amount" className={field} inputMode="decimal" value={amount} disabled={locked || !currency} onChange={(e) => { invalidate(); setAmount(e.target.value); }} /></label>
        <button className={button} disabled={locked || !currency || !amount} onClick={() => void getQuote()}>Request Nium quote</button>
      </div>
      {quote && <section aria-label="Quoted payment" className="space-y-3 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">{selected?.company_name || selected?.full_name}</h2>
        <p>Principal: USD {quote.quoted_principal.amount}</p><p>Included fee: USD {quote.planned_included_fee.amount}</p>
        <p>Total wallet debit: USD {quote.planned_total_usd_debit}</p><p>Quoted recipient amount: {quote.destination_currency} {quote.quoted_destination_amount.amount}</p>
        <p>The recipient amount is quoted. Final delivery and settlement are confirmed by Nium after submission.</p>
        <p>Nium quoted rate: {quote.nium_quoted_fx_rate}</p><p>{expired ? "Quote expired. Request a new quote." : `Quote expires: ${quote.quote_expires_at}`}</p>
        {([['purpose_code', 'Payment purpose code'], ['source_of_funds', 'Source of funds'], ['comment', 'Payment reference']] as const).map(([key, label]) => <label key={key} className="grid gap-2">{label}<input aria-label={label} className={field} maxLength={255} value={instruction[key]} disabled={locked} onChange={(e) => { setReview(null); setAccepted(false); setInstruction({ ...instruction, [key]: e.target.value }); }} /></label>)}
        <button className={button} disabled={locked || expired || Object.values(instruction).some((v) => !v.trim())} onClick={() => void getReview()}>Review payment</button>
      </section>}
      {review && <section aria-label="Authoritative payment review" className="space-y-4 rounded-xl border p-5">
        <h2 className="text-xl font-semibold">Confirm payment</h2><p>Principal: {review.principal.currency} {review.principal.amount}</p>
        <p>Included fee: {review.included_fee.currency} {review.included_fee.amount}</p><p>Total wallet debit: USD {review.total_usd_debit}</p>
        <p>Recipient amount: {review.destination_amount.currency} {review.destination_amount.amount}</p>
        <p>Your confirmed USD wallet debit is fixed. Provider settlement differences do not authorize an additional customer debit.</p>
        {reviewExpired && <p role="status">Payment checks expired. Review the payment again before submitting.</p>}
        <label><input type="checkbox" checked={accepted} disabled={locked || expired || reviewExpired} onChange={(e) => setAccepted(e.target.checked)} /> I confirm these amounts and payment instructions.</label>
        <button className={button} disabled={locked || expired || reviewExpired || !accepted} onClick={() => void submit()}>Submit payment</button>
      </section>}
    </>}
  </main>;
}
