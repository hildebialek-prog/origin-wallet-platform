import { describe, expect, it } from "vitest";
import { amountError, instructionError, matchesQuote, matchesReview, matchesTransfer, quoteOptionsAvailable, matchesTransferPage, walletDebitError } from "./dynamicPaymentTerms";
import type { DynamicCustomerPricing, DynamicOptions, DynamicQuote, DynamicReview, DynamicTransfer } from "@/services/niumDynamicService";

const scales = { USD: 2, GBP: 2 };
const pricing: DynamicCustomerPricing = { version: "origin-nium-contracted-local-usd-inclusive-v3", funding: "USD", country: "GB", destination: "GBP", method: "LOCAL",
  margin_percent: "0.13", fee: "20", fee_currency: "USD", origin_service_fee_usd: "20", fee_payer: "SENDER",
  fee_treatment: "INCLUDED_IN_TOTAL_USD_DEBIT", rate_treatment: "PRESERVE_NIUM_QUOTED_RATE_NO_ADDITIONAL_MARGIN",
  provider_settlement: "INDEPENDENT_AUTHENTICATED_RECONCILIATION" };
const quote: DynamicQuote = { status: "QUOTE_REFERENCE_ONLY", dynamic_quote_id: "quote-local", provider_quote_id: "provider-quote",
  beneficiary_id: 4, amount_mode: "SOURCE_AMOUNT", entered_amount: "1000", source_currency: "USD", destination_currency: "GBP",
  quote_expires_at: "2035-01-01T00:00:00Z", quoted_principal: { currency: "USD", amount: "980" },
  planned_included_fee: { currency: "USD", amount: "20" }, planned_total_usd_debit: "1000",
  quoted_destination_amount: { currency: "GBP", amount: "784" }, nium_quoted_fx_rate: "0.8",
  payout_rail: "LOCAL", customer_pricing: pricing, origin_service_fee: { currency: "USD", amount: "20" },
  pricing_status: "CONTRACTUAL_CUSTOMER_TERMS", financial_verification: "CUSTOMER_PRICING_AUTHORIZED_PROVIDER_SETTLEMENT_UNVERIFIED" };
const instruction = { purpose_code: "IR005", source_of_funds: "Salary", comment: "Invoice" };
const review: DynamicReview = { status: "READY", review_id: "a".repeat(64), accepted_fingerprint: "a".repeat(64),
  customer_pricing: pricing, origin_service_fee: quote.origin_service_fee, payout_rail: quote.payout_rail,
  provider_quote_id: quote.provider_quote_id, nium_quoted_fx_rate: quote.nium_quoted_fx_rate,
  dynamic_quote_id: quote.dynamic_quote_id, beneficiary_id: 4, provider_account_id: 2, balance_id: 3,
  amount_mode: "SOURCE_AMOUNT", entered_amount: "1000", review_expires_at: quote.quote_expires_at, quote_expires_at: quote.quote_expires_at,
  principal: quote.quoted_principal, included_fee: quote.planned_included_fee, total_usd_debit: "1000.00000000",
  destination_amount: quote.quoted_destination_amount, instruction, reason_codes: [] };

describe("Dynamic payment consent comparisons", () => {
  it.each([undefined, "provider-other"])("rejects a missing or changed provider quote ID at Review: %s", (id) => {
    expect(matchesReview({ ...review, provider_quote_id: id }, quote, instruction)).toBe(false);
  });
  it.each([undefined, "0.81", "0"])("rejects a missing or changed quoted rate at Review: %s", (rate) => {
    expect(matchesReview({ ...review, nium_quoted_fx_rate: rate }, quote, instruction)).toBe(false);
  });
  it("requires the accepted fingerprint to identify the exact Review and rejects an expired READY response", () => {
    expect(matchesReview({ ...review, review_id: "different-review" }, quote, instruction)).toBe(false);
    expect(matchesReview({ ...review, review_expires_at: new Date(Date.now() - 1).toISOString() }, quote, instruction)).toBe(false);
  });
  it.each([{ customer_pricing: undefined }, { customer_pricing: null }, { origin_service_fee: undefined }, { financial_verification: undefined },
    { provider_quote_id: undefined }, { provider_quote_id: null }, { provider_quote_id: "quote\n" }, { provider_quote_id: "q".repeat(101) }, { dynamic_quote_id: undefined },
    { customer_pricing: { ...pricing, origin_service_fee_usd: "0" } }, { origin_service_fee: { currency: "USD", amount: "0" } }])("refuses incomplete or inconsistent fee authority without inventing provider fees: %j", (change) => {
    expect(matchesQuote({ ...quote, ...change }, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
  });
  it("uses only authoritative precision and leaves destination-to-USD pricing to the quote", () => {
    expect(amountError("DESTINATION_AMOUNT", "784.01", 0)).toContain("0 decimal places");
    expect(amountError("DESTINATION_AMOUNT", "784", undefined)).toContain("precision is unavailable");
    expect(amountError("DESTINATION_AMOUNT", "784.00", 0)).toBe("");
    const destination: DynamicQuote = { ...quote, amount_mode: "DESTINATION_AMOUNT", entered_amount: "784",
      quoted_principal: { currency: "USD", amount: "1999.37" }, planned_total_usd_debit: "2019.37" };
    expect(matchesQuote(destination, 4, "GBP", "DESTINATION_AMOUNT", "784", { USD: 2, GBP: 0 })).toBe(true);
    expect(matchesQuote({ ...destination, quoted_destination_amount: { currency: "GBP", amount: "784.01" } }, 4, "GBP", "DESTINATION_AMOUNT", "784.01", { USD: 2, GBP: 0 })).toBe(false);
  });
  it("uses matching supported quote modes while Options explicitly grants no executable mode", () => {
    const options: DynamicOptions = { beneficiary: { id: 4, name: "Payee", country_code: "GB", currency: "GBP" },
      dynamic_available: true, status: "QUOTE_REFERENCE_ONLY", source_currency: "USD", reason_codes: [],
      provider_listing: { status: "LISTED", reason_codes: ["dynamic_customer_corridor_authorization_unverified"] },
      customer_entitlement: "VERIFIED", financial_authorization: "CUSTOMER_PRICING_AUTHORIZED", currency_scales: scales,
      supported_amount_modes: ["DESTINATION_AMOUNT"], executable_amount_modes: [], requires_instruction_validation: true,
      eligible_payout_rails: ["LOCAL"], quote_availability: { status: "QUOTE_REFERENCE_ONLY", reason_codes: [],
        supported_amount_modes: ["DESTINATION_AMOUNT"], destination_currencies: ["GBP"], payout_rail: "LOCAL" } };
    expect(quoteOptionsAvailable(options, 4)).toBe(true);
    expect(quoteOptionsAvailable({ ...options, supported_amount_modes: ["SOURCE_AMOUNT"] }, 4)).toBe(false);
    expect(quoteOptionsAvailable({ ...options, executable_amount_modes: ["DESTINATION_AMOUNT"] }, 4)).toBe(false);
    expect(quoteOptionsAvailable({ ...options, requires_instruction_validation: undefined }, 4)).toBe(false);
  });
  it("rejects inconsistent recovery pagination instead of interpreting it as no existing payment", () => {
    const page = { data: [], page: 1, per_page: 20, has_more: false, next_page: null };
    expect(matchesTransferPage(page, 1)).toBe(true);
    expect(matchesTransferPage({ ...page, next_page: 2 }, 1)).toBe(false);
    expect(matchesTransferPage({ ...page, per_page: 51 }, 1)).toBe(false);
    expect(matchesTransferPage({ ...page, data: undefined }, 1)).toBe(false);
  });
  it.each([undefined, "", "invalid", "2035-01-01T00:00:01Z"])("refuses missing or invalid Review authority expiry: %s", (expiry) => {
    expect(matchesReview({ ...review, review_expires_at: expiry }, quote, instruction)).toBe(false);
  });
  it.each([" Invoice", "Invoice ", "Invoice\n", "a".repeat(256), "ก".repeat(86)])("matches backend instruction byte and whitespace limits", (comment) => {
    expect(instructionError({ ...instruction, comment })).not.toBe("");
  });
  it("accepts a UTF-8 instruction within the backend byte limit", () => {
    expect(instructionError({ ...instruction, comment: "ก".repeat(85) })).toBe("");
  });
  it("requires complete transfer amounts and the reviewed identity before displaying a submission as confirmed", () => {
    const transfer: DynamicTransfer = { id: "intent-id", beneficiary: { id: 4, country_code: "GB" }, source_currency: "USD",
      destination_currency: "GBP", amount_mode: "SOURCE_AMOUNT", total_usd_debit: "1000", principal: review.principal,
      included_fee: review.included_fee, destination_amount: review.destination_amount, quote_expires_at: review.quote_expires_at,
      status: "processing", financial_reconciled: false, message: "The transfer is being processed." };
    expect(matchesTransfer(transfer, 4, review)).toBe(true);
    for (const change of [{ total_usd_debit: "1020" }, { beneficiary: { id: 5, country_code: "GB" } },
      { destination_amount: { currency: "EUR", amount: "784" } }, { amount_mode: "DESTINATION_AMOUNT" },
      { principal: undefined }, { status: "paid", financial_reconciled: false }, { status: "unknown" }]) {
      expect(matchesTransfer({ ...transfer, ...change } as DynamicTransfer, 4, review)).toBe(false);
    }
    expect(matchesTransfer({ ...transfer, status: "paid", financial_reconciled: true }, 4, review)).toBe(true);
  });
  it.each(["0", "-100", "1e3", "1000.001", "", "1,000", " 100", "100\n"])("rejects invalid inclusive SOURCE_AMOUNT %s", (value) => {
    expect(amountError("SOURCE_AMOUNT", value, 2)).not.toBe("");
  });
  it.each(["0.01", "19.99", "20", "20.00"])("leaves fee policy to the backend for positive input %s", (value) => {
    expect(amountError("SOURCE_AMOUNT", value, 2)).toBe("");
  });
  it.each(["0", "7.25", "20"])("checks the server-provided fee %s without inventing a pricing policy", (fee) => {
    const total = fee === "0" ? "980" : fee === "7.25" ? "987.25" : "1000";
    const quoted = { ...quote, entered_amount: total, planned_included_fee: { currency: "USD", amount: fee }, planned_total_usd_debit: total,
      customer_pricing: { ...pricing, fee, origin_service_fee_usd: fee }, origin_service_fee: { currency: "USD", amount: fee } };
    expect(matchesQuote(quoted, 4, "GBP", "SOURCE_AMOUNT", total, scales)).toBe(true);
    expect(matchesReview({ ...review, customer_pricing: quoted.customer_pricing, origin_service_fee: quoted.origin_service_fee,
      entered_amount: total, included_fee: quoted.planned_included_fee, total_usd_debit: total }, quoted, instruction)).toBe(true);
    expect(matchesReview({ ...review, entered_amount: total, total_usd_debit: total, included_fee: { currency: "USD", amount: "999" } }, quoted, instruction)).toBe(false);
  });
  it("compares the exact total debit rather than principal, including sub-cent balance storage", () => {
    expect(walletDebitError("1000", "1000.00000000")).toBe("");
    expect(walletDebitError("1000", "999.99999999")).toContain("cannot cover");
    expect(walletDebitError("1000", "980")).toContain("cannot cover");
    expect(walletDebitError("9007199254740993.01", "9007199254740993.00999999")).toContain("cannot cover");
    expect(walletDebitError("9007199254740993.01", "9007199254740993.01000000")).toBe("");
  });
  it.each([undefined, null, 1000, "1e3", "-1", "1000.000000001"])("does not infer an exact balance from %s", (balance) => {
    expect(walletDebitError("1000", balance)).toContain("unavailable");
  });
  it("preserves principal plus one fee and does not calculate a new FX amount", () => {
    expect(matchesQuote(quote, 4, "GBP", "SOURCE_AMOUNT", "1000.00", scales)).toBe(true);
    expect(matchesQuote({ ...quote, planned_total_usd_debit: "1020" }, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
    const destination = { ...quote, amount_mode: "DESTINATION_AMOUNT" as const, entered_amount: "784" };
    expect(matchesQuote(destination, 4, "GBP", "DESTINATION_AMOUNT", "784", scales)).toBe(true);
    expect(matchesQuote({ ...destination, quoted_destination_amount: { currency: "GBP", amount: "783.99" } }, 4, "GBP", "DESTINATION_AMOUNT", "784", scales)).toBe(false);
  });
  it("requires authoritative Review to match quote, beneficiary, amounts and instruction", () => {
    expect(matchesReview(review, quote, instruction)).toBe(true);
    for (const change of [{ total_usd_debit: "1020" }, { beneficiary_id: 5 }, { dynamic_quote_id: "other" },
      { instruction: { ...instruction, comment: "Changed" } }, { status: "UNAVAILABLE" as const },
      { reason_codes: ["dynamic_customer_corridor_response_contract_unavailable"] },
      { accepted_fingerprint: "" }, { included_fee: { currency: "USD", amount: "40" } }]) {
      expect(matchesReview({ ...review, ...change }, quote, instruction)).toBe(false);
    }
  });
  it("binds the returned customer schedule, service fee and rail through Review", () => {
    const pricedQuote = { ...quote, customer_pricing: pricing, origin_service_fee: { currency: "USD", amount: "20" }, payout_rail: "LOCAL" };
    const pricedReview = { ...review, customer_pricing: { ...pricing }, origin_service_fee: { currency: "USD", amount: "20.00" }, payout_rail: "LOCAL" };
    expect(matchesReview(pricedReview, pricedQuote, instruction)).toBe(true);
    for (const change of [{ customer_pricing: undefined }, { customer_pricing: null }, { customer_pricing: { ...pricing, margin_percent: "0.30" } },
      { customer_pricing: { ...pricing, version: "other" } }, { origin_service_fee: undefined },
      { origin_service_fee: { currency: "USD", amount: "1" } }, { payout_rail: "SWIFT" }]) {
      expect(matchesReview({ ...pricedReview, ...change }, pricedQuote, instruction)).toBe(false);
    }
  });
  it("refuses malformed HTTP money fields without comparing two invalid amounts as equal", () => {
    expect(matchesQuote({ ...quote, status: "UNAVAILABLE" }, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
    expect(matchesQuote({ ...quote, entered_amount: null } as unknown as DynamicQuote, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
    expect(matchesQuote({ ...quote, quoted_principal: undefined } as unknown as DynamicQuote, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
    expect(matchesReview({ ...review, principal: undefined } as unknown as DynamicReview, quote, instruction)).toBe(false);
    expect(matchesReview({ ...review, total_usd_debit: 1000 } as unknown as DynamicReview, quote, instruction)).toBe(false);
    expect(matchesQuote({ ...quote, planned_total_usd_debit: "1000\n" }, 4, "GBP", "SOURCE_AMOUNT", "1000", scales)).toBe(false);
  });
});
