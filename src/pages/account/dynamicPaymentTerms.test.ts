import { describe, expect, it } from "vitest";
import { amountError, matchesQuote, matchesReview } from "./dynamicPaymentTerms";
import type { DynamicQuote, DynamicReview } from "@/services/niumDynamicService";

const quote: DynamicQuote = { status: "QUOTE_REFERENCE_ONLY", dynamic_quote_id: "quote-local", provider_quote_id: "provider-quote",
  beneficiary_id: 4, amount_mode: "SOURCE_AMOUNT", entered_amount: "1000", source_currency: "USD", destination_currency: "GBP",
  quote_expires_at: "2035-01-01T00:00:00Z", quoted_principal: { currency: "USD", amount: "980" },
  planned_included_fee: { currency: "USD", amount: "20" }, planned_total_usd_debit: "1000",
  quoted_destination_amount: { currency: "GBP", amount: "784" }, nium_quoted_fx_rate: "0.8" };
const instruction = { purpose_code: "IR005", source_of_funds: "Salary", comment: "Invoice" };
const review: DynamicReview = { status: "READY", review_id: "server-review", accepted_fingerprint: "a".repeat(64),
  dynamic_quote_id: quote.dynamic_quote_id, beneficiary_id: 4, provider_account_id: 2, balance_id: 3,
  amount_mode: "SOURCE_AMOUNT", entered_amount: "1000", quote_expires_at: quote.quote_expires_at,
  principal: quote.quoted_principal, included_fee: quote.planned_included_fee, total_usd_debit: "1000.00000000",
  destination_amount: quote.quoted_destination_amount, instruction, reason_codes: [] };

describe("Dynamic payment consent comparisons", () => {
  it.each(["0", "19.99", "20", "20.00", "-100", "1e3", "1000.001"])("rejects invalid inclusive SOURCE_AMOUNT %s", (value) => {
    expect(amountError("SOURCE_AMOUNT", value)).not.toBe("");
  });
  it("preserves principal plus one fee and does not calculate a new FX amount", () => {
    expect(matchesQuote(quote, 4, "GBP", "SOURCE_AMOUNT", "1000.00")).toBe(true);
    expect(matchesQuote({ ...quote, planned_total_usd_debit: "1020" }, 4, "GBP", "SOURCE_AMOUNT", "1000")).toBe(false);
    const destination = { ...quote, amount_mode: "DESTINATION_AMOUNT" as const, entered_amount: "784" };
    expect(matchesQuote(destination, 4, "GBP", "DESTINATION_AMOUNT", "784")).toBe(true);
    expect(matchesQuote({ ...destination, quoted_destination_amount: { currency: "GBP", amount: "783.99" } }, 4, "GBP", "DESTINATION_AMOUNT", "784")).toBe(false);
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
  it("refuses malformed HTTP money fields without comparing two invalid amounts as equal", () => {
    expect(matchesQuote({ ...quote, entered_amount: null } as unknown as DynamicQuote, 4, "GBP", "SOURCE_AMOUNT", "1000")).toBe(false);
    expect(matchesQuote({ ...quote, quoted_principal: undefined } as unknown as DynamicQuote, 4, "GBP", "SOURCE_AMOUNT", "1000")).toBe(false);
    expect(matchesReview({ ...review, principal: undefined } as unknown as DynamicReview, quote, instruction)).toBe(false);
    expect(matchesReview({ ...review, total_usd_debit: 1000 } as unknown as DynamicReview, quote, instruction)).toBe(false);
  });
});
