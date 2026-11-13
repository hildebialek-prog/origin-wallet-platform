import type { DynamicCustomerPricing, DynamicInstruction, DynamicMode, DynamicOptions, DynamicQuote, DynamicReview, DynamicTransfer, DynamicTransferPage } from "@/services/niumDynamicService";

export const reasonCodes = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((code): code is string => typeof code === "string" && code.length > 0) : [];
const emptyReasons = (value: unknown) => Array.isArray(value) && value.length === 0;
export const currencyScale = (scales: DynamicOptions["currency_scales"], currency: string) => {
  const scale = scales?.[currency];
  return Number.isInteger(scale) && scale >= 0 && scale <= 2 ? scale : undefined;
};

// Discovery authorizes a quote request only. Missing authority never means consent.
export function quoteOptionsAvailable(options: DynamicOptions | null, beneficiaryId: number) {
  const q = options?.quote_availability;
  const rails = options?.eligible_payout_rails;
  return !!options && options.beneficiary?.id === beneficiaryId && options.dynamic_available === true
    && options.source_currency === "USD" && options.status === "QUOTE_REFERENCE_ONLY"
    && options.provider_listing?.status === "LISTED" && options.customer_entitlement === "VERIFIED"
    && options.financial_authorization === "CUSTOMER_PRICING_AUTHORIZED"
    && emptyReasons(options.reason_codes) && q?.status === "QUOTE_REFERENCE_ONLY" && emptyReasons(q.reason_codes)
    && Array.isArray(q.destination_currencies) && q.destination_currencies.length > 0
    && q.destination_currencies.every((code) => typeof code === "string" && /^[A-Z]{3}$/.test(code))
    && Array.isArray(q.supported_amount_modes) && q.supported_amount_modes.length > 0
    && q.supported_amount_modes.every((mode) => mode === "SOURCE_AMOUNT" || mode === "DESTINATION_AMOUNT")
    && new Set(q.supported_amount_modes).size === q.supported_amount_modes.length
    && Array.isArray(options.supported_amount_modes) && options.supported_amount_modes.length === q.supported_amount_modes.length
    && new Set(options.supported_amount_modes).size === options.supported_amount_modes.length
    && options.supported_amount_modes.every((mode) => q.supported_amount_modes.includes(mode))
    && options.requires_instruction_validation === true && Array.isArray(options.executable_amount_modes)
    && options.executable_amount_modes.length === 0
    && currencyScale(options.currency_scales, "USD") !== undefined
    && q.destination_currencies.every((code) => currencyScale(options.currency_scales, code) !== undefined)
    && Array.isArray(rails) && rails.length === 1 && typeof rails[0] === "string"
    && /^[A-Z][A-Z0-9_]*$/.test(rails[0]) && rails[0] === q.payout_rail;
}

export function instructionError(instruction: DynamicInstruction) {
  return Object.values(instruction).some((value) => !value || value.trim() !== value
    || /[\x00-\x1f\x7f]/.test(value) || new TextEncoder().encode(value).length > 255)
    ? "Enter payment instructions without surrounding whitespace or control characters, using at most 255 UTF-8 bytes per field." : "";
}

// Comparison only: never derive FX or price a transfer in the browser.
export const exactDecimal = (value: unknown) => {
  if (typeof value !== "string" || value.length > 128 || value.trim() !== value || !/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) return null;
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
};
const cents = (value: string) => {
  const exact = exactDecimal(value);
  if (exact === null || !/^\d+(\.\d{1,2})?$/.test(exact)) return null;
  const [whole, fraction = ""] = exact.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
};
export const fitsScale = (value: unknown, scale: number | undefined) => {
  const exact = exactDecimal(value);
  return exact !== null && scale !== undefined && (exact.split(".")[1]?.length ?? 0) <= scale;
};
export function amountError(mode: DynamicMode, amount: string, scale: number | undefined) {
  if (scale === undefined) return "The authoritative currency precision is unavailable. Refresh payment options.";
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(amount)) return "Enter an exact positive amount with up to two decimal places.";
  if (!fitsScale(amount, scale)) return `Enter an exact amount with up to ${scale} decimal places.`;
  const value = cents(amount);
  if (value === null || value <= 0n) {
    return mode === "SOURCE_AMOUNT" ? "USD send amount must be positive." : "Recipient amount must be positive.";
  }
  return "";
}
function customerPriceMatches(quote: DynamicQuote) {
  const p = quote.customer_pricing;
  return !!p && Object.values(p).every((value) => typeof value === "string" && value.length > 0)
    && typeof p.version === "string" && p.version.length > 0 && p.funding === "USD" && /^[A-Z]{2}$/.test(p.country)
    && p.destination === quote.destination_currency && p.method === quote.payout_rail
    && p.fee_currency === "USD" && p.fee_payer === "SENDER" && p.fee_treatment === "INCLUDED_IN_TOTAL_USD_DEBIT"
    && p.rate_treatment === "PRESERVE_NIUM_QUOTED_RATE_NO_ADDITIONAL_MARGIN"
    && p.provider_settlement === "INDEPENDENT_AUTHENTICATED_RECONCILIATION"
    && exactDecimal(p.margin_percent) !== null
    && exactDecimal(p.fee) !== null && exactDecimal(p.fee) === exactDecimal(quote.planned_included_fee?.amount)
    && exactDecimal(p.origin_service_fee_usd) === exactDecimal(p.fee)
    && quote.origin_service_fee?.currency === "USD" && exactDecimal(quote.origin_service_fee.amount) === exactDecimal(p.fee)
    && quote.pricing_status === "CONTRACTUAL_CUSTOMER_TERMS"
    && quote.financial_verification === "CUSTOMER_PRICING_AUTHORIZED_PROVIDER_SETTLEMENT_UNVERIFIED";
}
export function matchesQuote(quote: DynamicQuote, beneficiaryId: number, currency: string, mode: DynamicMode, amount: string, scales: DynamicOptions["currency_scales"]) {
  if (!quote?.quoted_principal || !quote.planned_included_fee || !quote.quoted_destination_amount
    || exactDecimal(quote.entered_amount) === null || exactDecimal(quote.nium_quoted_fx_rate) === null
    || exactDecimal(quote.nium_quoted_fx_rate) === "0") return false;
  const principal = cents(quote.quoted_principal?.amount ?? "");
  const fee = cents(quote.planned_included_fee.amount);
  const total = cents(quote.planned_total_usd_debit ?? "");
  return quote.status === "QUOTE_REFERENCE_ONLY" && customerPriceMatches(quote)
    && quote.beneficiary_id === beneficiaryId && quote.destination_currency === currency && quote.source_currency === "USD"
    && quote.amount_mode === mode && exactDecimal(quote.entered_amount) === exactDecimal(amount)
    && quote.quoted_principal.currency === "USD" && quote.planned_included_fee.currency === "USD"
    && fee !== null && principal !== null && principal > 0n && total === principal + fee
    && quote.quoted_destination_amount.currency === currency && (cents(quote.quoted_destination_amount.amount) ?? 0n) > 0n
    && fitsScale(quote.quoted_principal.amount, currencyScale(scales, "USD"))
    && fitsScale(quote.quoted_destination_amount.amount, currencyScale(scales, currency))
    && (mode === "SOURCE_AMOUNT" ? total === cents(amount) : exactDecimal(quote.quoted_destination_amount.amount) === exactDecimal(amount))
    && typeof quote.provider_quote_id === "string" && quote.provider_quote_id.trim() === quote.provider_quote_id
    && /^[a-zA-Z0-9_-]{1,100}$/.test(quote.provider_quote_id)
    && typeof quote.dynamic_quote_id === "string" && !!quote.dynamic_quote_id && Number.isFinite(Date.parse(quote.quote_expires_at));
}
export function matchesReview(review: DynamicReview, quote: DynamicQuote, instruction: DynamicInstruction) {
  if (!review?.principal || !review.included_fee || !review.destination_amount || !review.instruction
    || !Array.isArray(review.reason_codes) || review.reason_codes.length !== 0
    || exactDecimal(review.entered_amount) === null || exactDecimal(review.principal.amount) === null
    || exactDecimal(review.total_usd_debit) === null || exactDecimal(review.destination_amount.amount) === null) return false;
  const pricingMatches = customerPriceMatches(quote) && !!review.customer_pricing && typeof review.customer_pricing === "object"
    && Object.entries(quote.customer_pricing).every(([key, value]) => review.customer_pricing![key as keyof DynamicCustomerPricing] === value)
    && Object.keys(review.customer_pricing).length === Object.keys(quote.customer_pricing).length;
  const serviceFeeMatches = review.origin_service_fee?.currency === quote.origin_service_fee?.currency
    && exactDecimal(review.origin_service_fee?.amount) !== null
    && exactDecimal(review.origin_service_fee?.amount) === exactDecimal(quote.origin_service_fee?.amount);
  return pricingMatches && serviceFeeMatches && (quote.payout_rail === undefined || review.payout_rail === quote.payout_rail) && review.status === "READY" && /^[a-f0-9]{64}$/.test(review.accepted_fingerprint ?? "")
    && Number.isFinite(Date.parse(review.review_expires_at))
    && Date.parse(review.review_expires_at) > Date.now() && Date.parse(review.quote_expires_at) > Date.now()
    && Date.parse(review.review_expires_at) <= Date.parse(review.quote_expires_at)
    && Number.isInteger(review.provider_account_id) && review.provider_account_id > 0
    && Number.isInteger(review.balance_id) && review.balance_id > 0 && review.review_id === review.accepted_fingerprint
    && review.provider_quote_id === quote.provider_quote_id
    && exactDecimal(review.nium_quoted_fx_rate) !== null && exactDecimal(review.nium_quoted_fx_rate) === exactDecimal(quote.nium_quoted_fx_rate)
    && review.dynamic_quote_id === quote.dynamic_quote_id && review.beneficiary_id === quote.beneficiary_id
    && review.amount_mode === quote.amount_mode && exactDecimal(review.entered_amount) === exactDecimal(quote.entered_amount)
    && review.principal.currency === "USD" && exactDecimal(review.principal.amount) === exactDecimal(quote.quoted_principal.amount)
    && review.included_fee.currency === "USD" && cents(review.included_fee.amount) !== null
    && cents(review.included_fee.amount) === cents(quote.planned_included_fee.amount)
    && exactDecimal(review.total_usd_debit) === exactDecimal(quote.planned_total_usd_debit)
    && review.destination_amount.currency === quote.destination_currency
    && exactDecimal(review.destination_amount.amount) === exactDecimal(quote.quoted_destination_amount.amount)
    && Date.parse(review.quote_expires_at) === Date.parse(quote.quote_expires_at)
    && Object.entries(instruction).every(([key, value]) => review.instruction[key as keyof DynamicInstruction] === value);
}

export function matchesTransfer(transfer: DynamicTransfer, beneficiaryId: number, review?: DynamicReview | null) {
  if (!transfer || typeof transfer.id !== "string" || !transfer.id || transfer.beneficiary?.id !== beneficiaryId
    || transfer.source_currency !== "USD" || !/^[A-Z]{3}$/.test(transfer.destination_currency)
    || !["SOURCE_AMOUNT", "DESTINATION_AMOUNT"].includes(transfer.amount_mode)
    || typeof transfer.financial_reconciled !== "boolean" || typeof transfer.message !== "string"
    || !Object.prototype.hasOwnProperty.call(dynamicStatusLabel, transfer.status)
    || (["paid", "reconciled"].includes(transfer.status) && !transfer.financial_reconciled)
    || transfer.principal?.currency !== "USD" || transfer.included_fee?.currency !== "USD"
    || transfer.destination_amount?.currency !== transfer.destination_currency) return false;
  const principal = cents(transfer.principal.amount);
  const fee = cents(transfer.included_fee.amount);
  const total = cents(transfer.total_usd_debit);
  if (principal === null || principal <= 0n || fee === null || total !== principal + fee
    || (cents(transfer.destination_amount.amount) ?? 0n) <= 0n) return false;
  return !review || (transfer.amount_mode === review.amount_mode
    && exactDecimal(transfer.total_usd_debit) === exactDecimal(review.total_usd_debit)
    && exactDecimal(transfer.principal.amount) === exactDecimal(review.principal.amount)
    && exactDecimal(transfer.included_fee.amount) === exactDecimal(review.included_fee.amount)
    && transfer.destination_currency === review.destination_amount.currency
    && exactDecimal(transfer.destination_amount.amount) === exactDecimal(review.destination_amount.amount));
}

export function matchesTransferPage(result: DynamicTransferPage, page: number) {
  return !!result && result.page === page && Number.isInteger(result.per_page) && result.per_page >= 1 && result.per_page <= 50
    && typeof result.has_more === "boolean" && result.next_page === (result.has_more ? page + 1 : null)
    && Array.isArray(result.data) && result.data.length <= result.per_page
    && new Set(result.data.map((item) => item?.id)).size === result.data.length
    && result.data.every((item) => Number.isInteger(item?.beneficiary?.id) && item.beneficiary.id > 0
      && matchesTransfer(item, item.beneficiary.id));
}

// Compare exact backend amounts only. Never subtract fees or compute FX in the UI.
// Balance storage may contain eight decimal places; numeric JS values are not exact evidence.
export function walletDebitError(debit: string, available: unknown): string {
  const units = (value: unknown) => {
    const normalized = exactDecimal(value);
    if (normalized === null || !/^\d+(\.\d{1,8})?$/.test(normalized)) return null;
    const [whole, fraction = ""] = normalized.split(".");
    return BigInt(whole) * 100000000n + BigInt(fraction.padEnd(8, "0"));
  };
  const balance = units(available);
  const total = units(debit);
  if (balance === null) return "An exact available USD wallet balance is unavailable. Refresh your balances before reviewing.";
  if (total === null || total <= 0n) return "The server did not supply an exact positive USD wallet debit.";
  return total > balance ? "The available USD balance cannot cover the total wallet debit, including applicable fees." : "";
}

export const dynamicStatusLabel: Record<string, string> = {
  queued: "Pending", processing: "Processing", pending_provider_confirmation: "Provider confirmation pending",
  reconciled: "Wallet accounting reconciled — delivery pending", paid: "Completed", failed: "Failed", returned: "Returned",
  requires_attention: "Exception — support review required", cancelled: "Cancelled",
};
