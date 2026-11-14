import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { DynamicTransfer } from "@/services/niumDynamicService";
import { dynamicStatusLabel, instructionError } from "./dynamicPaymentTerms";
import type { DynamicPayment } from "./useDynamicPayment";

const field = "h-12 rounded-xl border border-[#d7d7d2] bg-white px-3 text-[#0f2442] disabled:opacity-60 dark:border-white/10 dark:bg-[#10141b] dark:text-white";
const button = "h-12 rounded-full bg-[#15803d] px-7 text-white hover:bg-[#166534]";

export function DynamicDetails({ payment: p, onBack, onReview }: {
  payment: DynamicPayment; onBack: () => void; onReview: () => void;
}) {
  const invalidInstruction = instructionError(p.instruction);
  return <div className="mx-auto max-w-3xl space-y-6">
    <h2 className="text-center text-2xl font-bold">Complete payment details</h2>
    {p.options && <dl aria-label="Payment availability" className="space-y-2 text-sm">
      <div><dt>Provider-supported</dt><dd>{p.options.provider_listing?.status === "LISTED" ? "Listed" : "Unavailable"}</dd></div>
      <div><dt>Customer-entitled</dt><dd>{p.options.customer_entitlement === "VERIFIED" ? "Verified" : "Unavailable"}</dd></div>
      <div><dt>Financially authorized</dt><dd>{p.options.financial_authorization === "CUSTOMER_PRICING_AUTHORIZED" ? "Customer pricing authorized" : "Unavailable"}</dd></div>
      <div><dt>Executable</dt><dd>A matching READY Review and confirmation are required.</dd></div>
    </dl>}
    <div className="grid gap-4">
      <label className="grid gap-2">Recipient currency<select aria-label="Recipient currency" className={field}
        value={p.currency} disabled={p.locked || !p.available} onChange={(e) => p.changeCurrency(e.target.value)}>
        <option value="">Select recipient currency</option>
        {p.currencies.map((code) => <option key={code} value={code}>{code}</option>)}
      </select></label>
      {p.rails.length > 0 && <label className="grid gap-2">Payout rail<select aria-label="Payout rail" className={field}
        value={p.payoutRail} disabled={p.locked || p.rails.length === 1} onChange={() => p.invalidate()}>
        {p.rails.map((rail) => <option key={rail} value={rail}>{rail}</option>)}
      </select><span className="text-sm">The verified rail for this beneficiary.</span></label>}
      {p.availabilityReason && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
        <p>This beneficiary currently has no available recipient currency.</p><p>{p.availabilityReason}</p>
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-3 rounded-2xl border border-[#d7d7d2] p-5 dark:border-white/10">
          <span className="text-lg font-semibold">You send <span className="text-sm">USD</span></span>
          <Input aria-label="You send" aria-describedby="dynamic-send-help" className={`${field} text-2xl font-semibold`}
            inputMode="decimal" autoComplete="off" value={p.sendAmount} placeholder={p.sourceScale === 0 ? "0" : "0.00"}
            disabled={p.locked || !p.currency || !p.amountModes.includes("SOURCE_AMOUNT")}
            onChange={(e) => p.changeSendAmount(e.target.value)} />
          <span id="dynamic-send-help" className="text-sm">Total USD wallet debit, including applicable fees.</span>
          {p.sourceScale !== undefined && p.sourceScale < 2 && <span className="text-sm">{p.sourceScale === 0 ? "Whole USD amounts only." : `Up to ${p.sourceScale} decimal place.`}</span>}
        </label>
        <label className="grid gap-3 rounded-2xl border border-[#d7d7d2] p-5 dark:border-white/10">
          <span className="text-lg font-semibold">Recipient gets <span className="text-sm">{p.currency || "Select currency"}</span></span>
          <Input aria-label="Recipient gets" aria-describedby="dynamic-receive-help" className={`${field} text-2xl font-semibold`}
            inputMode="decimal" autoComplete="off" value={p.receiveAmount} placeholder={p.destinationScale === 0 ? "0" : "0.00"}
            disabled={p.locked || !p.currency || !p.amountModes.includes("DESTINATION_AMOUNT")}
            onChange={(e) => p.changeReceiveAmount(e.target.value)} />
          <span id="dynamic-receive-help" className="text-sm">Enter the amount to receive in {p.currency || "the selected currency"}.</span>
          {p.destinationScale !== undefined && <span className="text-sm">{p.destinationScale === 0 ? "Whole amounts only." : `Up to ${p.destinationScale} decimal places.`}</span>}
        </label>
      </div>
      <p className="text-sm">Edit an available amount field, then request a quote. {p.mode === "SOURCE_AMOUNT"
        ? "Nium will quote the recipient amount from your USD spend."
        : "Nium will quote the USD conversion principal. The planned debit also includes the contracted Nium fee."}</p>
      <p>Available USD balance: {p.availableUsdBalance === null ? "Unavailable" : `USD ${p.availableUsdBalance}`}</p>
      <Button className={button} disabled={p.locked || p.busy || !p.available || !p.currency || !p.amount} onClick={() => void p.getQuote()}>Request Nium quote</Button>
      {p.busy && <p role="status">{p.quote ? "Checking payment terms…" : "Requesting Nium terms…"}</p>}
    </div>
    {p.quote && <section aria-label="Quoted payment" className="space-y-3 rounded-xl border p-5">
      <p>USD transfer principal: {p.quote.quoted_principal.currency} {p.quote.quoted_principal.amount}</p>
      <p>Included Nium transaction fee (contract): {p.quote.planned_included_fee.currency} {p.quote.planned_included_fee.amount}</p>
      <p>The contracted Nium fee is allocated within the planned USD debit. Nium's quoted rate is used without adding another FX margin. Actual Nium fee collection and settlement remain unverified.</p>
      <p>Quoted total wallet debit: USD {p.quote.planned_total_usd_debit}</p>
      <p>Quoted recipient amount: {p.quote.quoted_destination_amount.currency} {p.quote.quoted_destination_amount.amount}</p>
      {p.quote.pricing_status === "UNAUTHORIZED_PLANNING_ONLY" && <p role="status">
        These fees and the total debit are a preparation estimate. Submission requires authorized financial terms at Review.
      </p>}
      <p>The recipient amount is quoted. Final delivery and settlement are confirmed by Nium after submission.</p>
      <p>A quote reference does not authorize execution. Review must verify the exact payment instructions.</p>
      <p>Nium quoted rate: {p.quote.nium_quoted_fx_rate}</p>
      <p>Quote: {p.quote.dynamic_quote_id}</p><p>Provider quote: {p.quote.provider_quote_id}</p>
      <p>{p.expired ? "Quote expired. Request a new quote." : `Quote expires: ${p.quote.quote_expires_at}`}</p>
      {p.balanceError && <p role="alert">{p.balanceError}</p>}
      {([['purpose_code', 'Payment purpose code'], ['source_of_funds', 'Source of funds'], ['comment', 'Payment reference']] as const)
        .map(([key, label]) => <label key={key} className="grid gap-2">{label}
          <Input aria-label={label} className={field} maxLength={255} value={p.instruction[key]}
            disabled={p.locked} onChange={(e) => p.changeInstruction(key, e.target.value)} />
        </label>)}
      {invalidInstruction && Object.values(p.instruction).every((value) => value.length > 0)
        && <p role="alert">{invalidInstruction}</p>}
      <Button className={button} disabled={p.locked || p.busy || p.expired || !!p.balanceError || !!invalidInstruction}
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
    <p>Beneficiary: {p.options?.beneficiary.id === r.beneficiary_id ? p.options.beneficiary.name : `#${r.beneficiary_id}`} (#{r.beneficiary_id})</p>
    <p>Recipient currency: {r.destination_amount.currency}</p>
    <p>Amount mode: {r.amount_mode === "SOURCE_AMOUNT" ? "SEND USD — total spend" : "RECEIVE — recipient amount"}</p>
    <p>Entered amount: {r.amount_mode === "SOURCE_AMOUNT" ? "USD" : r.destination_amount.currency} {r.entered_amount}</p>
    <p>USD transfer principal: {r.principal.currency} {r.principal.amount}</p>
    <p>Included Nium transaction fee (contract): {r.included_fee.currency} {r.included_fee.amount}</p>
    <p>The contracted Nium fee is included in your confirmed debit. The actual settlement fee is verified separately.</p>
    {r.payout_rail && <p>Payout rail: {r.payout_rail}</p>}
    <p>Total wallet debit: USD {r.total_usd_debit}</p>
    <p>Recipient amount: {r.destination_amount.currency} {r.destination_amount.amount}</p>
    <p>{r.amount_mode === "DESTINATION_AMOUNT" ? "This is the exact recipient amount instructed to Nium." : "The recipient amount is quoted; Nium confirms actual delivery after submission."}</p>
    <p>Nium quoted rate: {r.nium_quoted_fx_rate}</p>
    <p>Quote: {r.dynamic_quote_id}</p><p>Provider quote: {r.provider_quote_id}</p>
    <p>Quote expires: {r.quote_expires_at}</p>
    <p>Review expires: {r.review_expires_at}</p>
    <p>Payment purpose code: {r.instruction.purpose_code}</p>
    <p>Source of funds: {r.instruction.source_of_funds}</p>
    <p>Payment reference: {r.instruction.comment}</p>
    <p>Your confirmed USD wallet debit is fixed. Provider settlement differences do not authorize an additional customer debit.</p>
    {p.balanceError && <p role="alert">{p.balanceError}</p>}
    {p.expired && <p role="status">Quote expired. Request a new quote.</p>}
    {p.reviewExpired && <p role="status">Payment checks expired. Review the payment again before submitting.</p>}
    <label className="flex items-start gap-2"><input type="checkbox" checked={p.accepted}
      disabled={p.locked || !p.executableAmountModes.includes(r.amount_mode) || p.expired || p.reviewExpired || !!p.balanceError} onChange={(e) => p.setAccepted(e.target.checked)} />
      I confirm these amounts and payment instructions.</label>
    <div className="flex gap-3">
      <Button variant="outline" disabled={p.busy || !!p.saved} onClick={onBack}>Back</Button>
      <Button className={button} disabled={p.locked || p.busy || !p.executableAmountModes.includes(r.amount_mode) || p.expired || p.reviewExpired || !!p.balanceError || !p.accepted}
        onClick={() => void p.submit()}>Submit payment</Button>
    </div>
  </section>;
}

export function DynamicResult({ payment: p, onNewPayment }: { payment: DynamicPayment; onNewPayment: () => void }) {
  return <section aria-label="Payment status" className="mx-auto max-w-3xl space-y-4">
    <h2 className="text-2xl font-bold">{p.transfer ? dynamicStatusLabel[p.transfer.status] ?? "Status unavailable" : "Submission recovery"}</h2>
    {p.transfer && <><p role="status">{p.transfer.message}</p><p>Wallet debit: USD {p.transfer.total_usd_debit}</p>
      <p>Recipient amount: {p.transfer.destination_amount.currency} {p.transfer.destination_amount.amount}</p><p>Payment: {p.transfer.id}</p>
      {p.transfer.provider_fee_observation?.status === "SETTLED_FEE_RECORDS"
        ? <p>Observed Nium settlement fees: {p.transfer.provider_fee_observation.fees?.map((fee) => `${fee.currency} ${fee.amount}`).join(", ")}</p>
        : <p>Actual Nium settlement fee: unverified.</p>}</>}
    {p.saved?.id && !p.transfer && <p role="status">Payment status is unavailable and the outcome may be unknown. Refresh this payment's status before starting another payment.</p>}
    {p.saved?.id && <Button variant="outline" onClick={p.refreshStatus}>Refresh payment status</Button>}
    {p.saved?.id && p.transfer && ["paid", "cancelled"].includes(p.transfer.status)
      && <Button className={button} disabled={p.busy} onClick={onNewPayment}>Start another payment</Button>}
    {p.saved?.request && !p.saved.id && <><p>The provider outcome may be unknown. Keep this payment identity while recovering.</p>
      <p>Recovery reference: {p.saved.request.client_reference}</p>
      <Button className={button} disabled={p.busy} onClick={() => void p.lookupReference(p.saved!.request!.client_reference)}>Look up saved payment</Button></>}
  </section>;
}

export function DynamicSummary({ payment: p }: { payment: DynamicPayment }) {
  if (!p.transfer && !p.review && !p.quote) return <div className="space-y-3">
    <p className="font-semibold">Dynamic Multi-Currency</p>
    <p>Enter either amount and request a Nium quote to see the exchange rate, fees and total USD wallet debit.</p>
  </div>;
  const terms = p.transfer ?? p.review;
  const principal = terms?.principal ?? p.quote?.quoted_principal;
  const fee = terms?.included_fee ?? p.quote?.planned_included_fee;
  const debit = terms?.total_usd_debit ?? p.quote?.planned_total_usd_debit;
  const credit = terms?.destination_amount ?? p.quote?.quoted_destination_amount;
  const rows = [
    ["Payment", "Dynamic Multi-Currency"],
    ["USD transfer principal", principal && `${principal.currency} ${principal.amount}`],
    [p.transfer && p.transfer.fee_classification?.fee_owner !== "NIUM"
      ? "Included fee (ownership unverified)" : "Included Nium transaction fee (contract)", fee && `${fee.currency} ${fee.amount}`],
    [terms ? "Confirmed wallet debit" : "Quoted wallet debit", debit && `USD ${debit}`],
    ["Recipient amount", credit && `${credit.currency} ${credit.amount}`],
    ["FX rate", p.quote?.nium_quoted_fx_rate],
    ["Quote", p.quote?.dynamic_quote_id ?? p.review?.dynamic_quote_id],
    ["Provider quote", p.quote?.provider_quote_id],
    ["Quote expiry", terms?.quote_expires_at ?? p.quote?.quote_expires_at],
  ];
  return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4">
    <dt>{label}</dt><dd className="break-all text-right font-semibold">{value || "Awaiting provider terms"}</dd>
  </div>)}</dl>;
}

export function DynamicRecovery({ payment: p, disabled = false }: { payment: DynamicPayment; disabled?: boolean }) {
  const [reference, setReference] = useState("");
  const [id, setId] = useState("");
  const blocked = disabled || p.busy;
  return <section aria-label="Dynamic payment recovery" className="space-y-3 rounded-xl border p-5">
    <h3 className="font-semibold">Find an existing Dynamic payment</h3>
    <p className="text-sm">Check your payments if browser recovery details are missing. These lookups never send a payment.</p>
    {disabled && <p role="status">Resolve the active saved payment before opening another payment.</p>}
    <label className="grid gap-2">Dynamic client reference<Input aria-label="Dynamic client reference" value={reference}
      disabled={blocked} onChange={(event) => setReference(event.target.value)} /></label>
    <Button variant="outline" disabled={blocked || !reference} onClick={() => void p.lookupReference(reference)}>Find payment by reference</Button>
    <label className="grid gap-2">Dynamic transfer ID<Input aria-label="Dynamic transfer ID" value={id}
      disabled={blocked} onChange={(event) => setId(event.target.value)} /></label>
    <Button variant="outline" disabled={blocked || !id} onClick={() => void p.lookupId(id)}>Find payment by ID</Button>
    <Button variant="outline" disabled={blocked} onClick={() => void p.lookupRecent()}>Show recent Dynamic payments</Button>
    {p.recovering && <p role="status">Looking up your Dynamic payments…</p>}
    {p.recoveryError && <p role="alert">{p.recoveryError}</p>}
    {p.recoveryPage && <div aria-label="Recent Dynamic payments" className="space-y-3">
      {p.recoveryPage.data.length === 0 && <p>No payments were found on this page. An unknown outcome still requires checking its original reference.</p>}
      {p.recoveryPage.data.map((item) => <div key={item.id} className="space-y-1 border-t pt-3">
        <p className="break-all">{item.id}</p><p>Beneficiary #{item.beneficiary.id} · {dynamicStatusLabel[item.status]}</p>
        <p>USD {item.total_usd_debit} · {item.destination_amount.currency} {item.destination_amount.amount}</p>
        {item.created_at && <p>Created: {item.created_at}</p>}
        <Button variant="outline" disabled={blocked || (!!p.saved && p.saved.id !== item.id)}
          onClick={() => void p.lookupId(item.id)}>Open payment {item.id}</Button>
      </div>)}
      {p.recoveryPage.page > 1 && <Button variant="outline" disabled={blocked}
        onClick={() => void p.lookupRecent(p.recoveryPage!.page - 1)}>Previous payments</Button>}
      {p.recoveryPage.next_page !== null && <Button variant="outline" disabled={blocked}
        onClick={() => void p.lookupRecent(p.recoveryPage!.next_page!)}>More payments</Button>}
    </div>}
  </section>;
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
