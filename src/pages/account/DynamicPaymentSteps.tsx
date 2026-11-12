import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DynamicMode, DynamicTransfer } from "@/services/niumDynamicService";
import { dynamicStatusLabel } from "./dynamicPaymentTerms";
import type { DynamicPayment } from "./useDynamicPayment";

const field = "h-12 rounded-xl border border-[#d7d7d2] bg-white px-3 text-[#0f2442] disabled:opacity-60 dark:border-white/10 dark:bg-[#10141b] dark:text-white";
const button = "h-12 rounded-full bg-[#15803d] px-7 text-white hover:bg-[#166534]";

export function DynamicDetails({ payment: p, onBack, onReview }: {
  payment: DynamicPayment; onBack: () => void; onReview: () => void;
}) {
  return <div className="mx-auto max-w-3xl space-y-6">
    <h2 className="text-center text-2xl font-bold">Complete payment details</h2>
    <div className="grid gap-4">
      <label className="grid gap-2">Recipient currency<select aria-label="Recipient currency" className={field}
        value={p.currency} disabled={p.locked || !p.options} onChange={(e) => p.changeCurrency(e.target.value)}>
        <option value="">Select recipient currency</option>
        {p.options?.quote_availability.destination_currencies.map((code) => <option key={code} value={code}>{code}</option>)}
      </select></label>
      {p.options && p.options.quote_availability.destination_currencies.length === 0
        && <p role="status">This beneficiary currently has no available recipient currency.</p>}
      <label className="grid gap-2">Amount mode<select aria-label="Amount mode" className={field}
        value={p.mode} disabled={p.locked || !p.currency} onChange={(e) => p.changeMode(e.target.value as DynamicMode)}>
        <option value="SOURCE_AMOUNT">USD wallet debit, including provider fee</option>
        <option value="DESTINATION_AMOUNT">Recipient receives</option>
      </select></label>
      <label className="grid gap-2">{p.mode === "SOURCE_AMOUNT" ? "Total USD wallet debit" : `Recipient amount (${p.currency})`}
        <Input aria-label="Payment amount" className={field} inputMode="decimal" value={p.amount}
          disabled={p.locked || !p.currency} onChange={(e) => p.changeAmount(e.target.value)} />
      </label>
      <Button className={button} disabled={p.locked || !p.currency || !p.amount} onClick={() => void p.getQuote()}>Request Nium quote</Button>
    </div>
    {p.quote && <section aria-label="Quoted payment" className="space-y-3 rounded-xl border p-5">
      <p>Principal: {p.quote.quoted_principal.currency} {p.quote.quoted_principal.amount}</p>
      <p>Included fee: {p.quote.planned_included_fee.currency} {p.quote.planned_included_fee.amount}</p>
      <p>Total wallet debit: USD {p.quote.planned_total_usd_debit}</p>
      <p>Quoted recipient amount: {p.quote.quoted_destination_amount.currency} {p.quote.quoted_destination_amount.amount}</p>
      <p>The recipient amount is quoted. Final delivery and settlement are confirmed by Nium after submission.</p>
      <p>Nium quoted rate: {p.quote.nium_quoted_fx_rate}</p>
      <p>Quote: {p.quote.dynamic_quote_id}</p><p>Provider quote: {p.quote.provider_quote_id}</p>
      <p>{p.expired ? "Quote expired. Request a new quote." : `Quote expires: ${p.quote.quote_expires_at}`}</p>
      {([['purpose_code', 'Payment purpose code'], ['source_of_funds', 'Source of funds'], ['comment', 'Payment reference']] as const)
        .map(([key, label]) => <label key={key} className="grid gap-2">{label}
          <Input aria-label={label} className={field} maxLength={255} value={p.instruction[key]}
            disabled={p.locked} onChange={(e) => p.changeInstruction(key, e.target.value)} />
        </label>)}
      <Button className={button} disabled={p.locked || p.expired || Object.values(p.instruction).some((v) => !v.trim())}
        onClick={onReview}>Review payment</Button>
    </section>}
    <Button variant="outline" disabled={p.busy || !!p.saved} onClick={onBack}>Back</Button>
  </div>;
}

export function DynamicReviewStep({ payment: p, onBack }: { payment: DynamicPayment; onBack: () => void }) {
  const r = p.review;
  if (!r || !p.quote) return null;
  return <section aria-label="Authoritative payment review" className="mx-auto max-w-3xl space-y-4">
    <h2 className="text-center text-2xl font-bold">Confirm payment</h2>
    <p>Principal: {r.principal.currency} {r.principal.amount}</p>
    <p>Included fee: {r.included_fee.currency} {r.included_fee.amount}</p>
    <p>Total wallet debit: USD {r.total_usd_debit}</p>
    <p>Recipient amount: {r.destination_amount.currency} {r.destination_amount.amount}</p>
    <p>Nium quoted rate: {p.quote.nium_quoted_fx_rate}</p>
    <p>Quote: {r.dynamic_quote_id}</p><p>Provider quote: {p.quote.provider_quote_id}</p>
    <p>Quote expires: {r.quote_expires_at}</p>
    <p>Payment purpose code: {r.instruction.purpose_code}</p>
    <p>Source of funds: {r.instruction.source_of_funds}</p>
    <p>Payment reference: {r.instruction.comment}</p>
    <p>Your confirmed USD wallet debit is fixed. Provider settlement differences do not authorize an additional customer debit.</p>
    {p.expired && <p role="status">Quote expired. Request a new quote.</p>}
    {p.reviewExpired && <p role="status">Payment checks expired. Review the payment again before submitting.</p>}
    <label className="flex items-start gap-2"><input type="checkbox" checked={p.accepted}
      disabled={p.locked || p.expired || p.reviewExpired} onChange={(e) => p.setAccepted(e.target.checked)} />
      I confirm these amounts and payment instructions.</label>
    <div className="flex gap-3">
      <Button variant="outline" disabled={p.busy || !!p.saved} onClick={onBack}>Back</Button>
      <Button className={button} disabled={p.locked || p.expired || p.reviewExpired || !p.accepted}
        onClick={() => void p.submit()}>Submit payment</Button>
    </div>
  </section>;
}

export function DynamicResult({ payment: p, onNewPayment }: { payment: DynamicPayment; onNewPayment: () => void }) {
  return <section aria-label="Payment status" className="mx-auto max-w-3xl space-y-4">
    <h2 className="text-2xl font-bold">{p.transfer ? dynamicStatusLabel[p.transfer.status] ?? "Status unavailable" : "Submission recovery"}</h2>
    {p.transfer && <><p role="status">{p.transfer.message}</p><p>Wallet debit: USD {p.transfer.total_usd_debit}</p>
      <p>Recipient amount: {p.transfer.destination_amount.currency} {p.transfer.destination_amount.amount}</p><p>Payment: {p.transfer.id}</p></>}
    {p.saved?.id && <Button variant="outline" onClick={p.refreshStatus}>Refresh payment status</Button>}
    {p.saved?.id && p.transfer && ["paid", "cancelled"].includes(p.transfer.status)
      && <Button className={button} disabled={p.busy} onClick={onNewPayment}>Start another payment</Button>}
    {p.saved && !p.saved.id && <><p>The provider outcome may be unknown. Keep this payment identity while recovering.</p>
      <Button className={button} disabled={p.busy || !p.ready} onClick={() => void p.submit()}>Recover same submission</Button></>}
  </section>;
}

export function DynamicSummary({ payment: p }: { payment: DynamicPayment }) {
  const terms = p.transfer ?? p.review;
  const principal = terms?.principal ?? p.quote?.quoted_principal;
  const fee = terms?.included_fee ?? p.quote?.planned_included_fee;
  const debit = terms?.total_usd_debit ?? p.quote?.planned_total_usd_debit;
  const credit = terms?.destination_amount ?? p.quote?.quoted_destination_amount;
  const rows = [
    ["Payment", "Dynamic Multi-Currency"],
    ["Principal", principal && `${principal.currency} ${principal.amount}`],
    ["Provider fee (included)", fee && `${fee.currency} ${fee.amount}`],
    ["Exact wallet debit", debit && `USD ${debit}`],
    ["Beneficiary credit", credit && `${credit.currency} ${credit.amount}`],
    ["FX rate", p.quote?.nium_quoted_fx_rate],
    ["Quote", p.quote?.dynamic_quote_id ?? p.review?.dynamic_quote_id],
    ["Provider quote", p.quote?.provider_quote_id],
    ["Quote expiry", terms?.quote_expires_at ?? p.quote?.quote_expires_at],
  ];
  return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4">
    <dt>{label}</dt><dd className="break-all text-right font-semibold">{value || "Awaiting provider terms"}</dd>
  </div>)}</dl>;
}

export function DynamicActivity({ transfer, name }: { transfer: DynamicTransfer; name?: string }) {
  return <div className="space-y-2 px-5 py-5">
    <p className="break-all font-semibold">{transfer.id}</p>
    <p>{name ?? `Beneficiary #${transfer.beneficiary.id}`} · Dynamic Multi-Currency</p>
    <p>{dynamicStatusLabel[transfer.status] ?? "Status unavailable"}</p>
    <p>Wallet debit: USD {transfer.total_usd_debit}</p>
    <p>Recipient amount: {transfer.destination_amount.currency} {transfer.destination_amount.amount}</p>
  </div>;
}
