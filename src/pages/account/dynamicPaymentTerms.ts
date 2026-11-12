import type { DynamicInstruction, DynamicMode, DynamicQuote, DynamicReview } from "@/services/niumDynamicService";

// Comparison only: never derive FX or price a transfer in the browser.
export const exactDecimal = (value: unknown) => {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) return null;
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
};
const cents = (value: string) => {
  const exact = exactDecimal(value);
  if (exact === null || !/^\d+(\.\d{1,2})?$/.test(exact)) return null;
  const [whole, fraction = ""] = exact.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
export function amountError(mode: DynamicMode, amount: string) {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(amount)) return "Enter an exact positive amount with up to two decimal places.";
  const value = cents(amount);
  if (value === null || value <= (mode === "SOURCE_AMOUNT" ? 2000n : 0n)) {
    return mode === "SOURCE_AMOUNT" ? "USD send amount must be greater than the included USD 20 fee." : "Recipient amount must be positive.";
  }
  return "";
}
export function matchesQuote(quote: DynamicQuote, beneficiaryId: number, currency: string, mode: DynamicMode, amount: string) {
  if (!quote?.quoted_principal || !quote.planned_included_fee || !quote.quoted_destination_amount
    || exactDecimal(quote.entered_amount) === null || exactDecimal(quote.nium_quoted_fx_rate) === null
    || exactDecimal(quote.nium_quoted_fx_rate) === "0") return false;
  const principal = cents(quote.quoted_principal?.amount ?? "");
  const total = cents(quote.planned_total_usd_debit ?? "");
  return quote.beneficiary_id === beneficiaryId && quote.destination_currency === currency && quote.source_currency === "USD"
    && quote.amount_mode === mode && exactDecimal(quote.entered_amount) === exactDecimal(amount)
    && quote.quoted_principal.currency === "USD" && quote.planned_included_fee.currency === "USD"
    && cents(quote.planned_included_fee.amount) === 2000n && principal !== null && principal > 0n && total === principal + 2000n
    && quote.quoted_destination_amount.currency === currency && (cents(quote.quoted_destination_amount.amount) ?? 0n) > 0n
    && (mode === "SOURCE_AMOUNT" ? total === cents(amount) : exactDecimal(quote.quoted_destination_amount.amount) === exactDecimal(amount))
    && /^[a-zA-Z0-9_-]+$/.test(quote.provider_quote_id) && !!quote.dynamic_quote_id && Number.isFinite(Date.parse(quote.quote_expires_at));
}
export function matchesReview(review: DynamicReview, quote: DynamicQuote, instruction: DynamicInstruction) {
  if (!review?.principal || !review.included_fee || !review.destination_amount || !review.instruction
    || !Array.isArray(review.reason_codes) || review.reason_codes.length !== 0
    || exactDecimal(review.entered_amount) === null || exactDecimal(review.principal.amount) === null
    || exactDecimal(review.total_usd_debit) === null || exactDecimal(review.destination_amount.amount) === null) return false;
  return review.status === "READY" && /^[a-f0-9]{64}$/.test(review.accepted_fingerprint ?? "")
    && (review.review_expires_at === undefined || (Number.isFinite(Date.parse(review.review_expires_at))
      && Date.parse(review.review_expires_at) <= Date.parse(review.quote_expires_at)))
    && Number.isInteger(review.provider_account_id) && review.provider_account_id > 0
    && Number.isInteger(review.balance_id) && review.balance_id > 0 && !!review.review_id
    && review.dynamic_quote_id === quote.dynamic_quote_id && review.beneficiary_id === quote.beneficiary_id
    && review.amount_mode === quote.amount_mode && exactDecimal(review.entered_amount) === exactDecimal(quote.entered_amount)
    && review.principal.currency === "USD" && exactDecimal(review.principal.amount) === exactDecimal(quote.quoted_principal.amount)
    && review.included_fee.currency === "USD" && cents(review.included_fee.amount) === 2000n
    && exactDecimal(review.total_usd_debit) === exactDecimal(quote.planned_total_usd_debit)
    && review.destination_amount.currency === quote.destination_currency
    && exactDecimal(review.destination_amount.amount) === exactDecimal(quote.quoted_destination_amount.amount)
    && Date.parse(review.quote_expires_at) === Date.parse(quote.quote_expires_at)
    && Object.entries(instruction).every(([key, value]) => review.instruction[key as keyof DynamicInstruction] === value);
}

export const dynamicStatusLabel: Record<string, string> = {
  queued: "Pending", processing: "Processing", pending_provider_confirmation: "Provider confirmation pending",
  reconciled: "Wallet accounting reconciled", paid: "Paid", failed: "Failed", returned: "Returned",
  requires_attention: "Exception — support review required", cancelled: "Cancelled",
};
