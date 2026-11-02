import type { Beneficiary, NiumPayoutAmounts, TransferReview } from "@/services/moneyMovementService";
import type { transferFormFromTransfer } from "./transferForm";

// In-memory binding only. Changes to the instruction or receiving account invalidate display evidence.
export const sgdFinancialKey = (form: ReturnType<typeof transferFormFromTransfer>, beneficiary: Beneficiary | null) =>
  JSON.stringify([form.providerId, form.beneficiaryId, form.transferType, form.sourceCurrency,
    form.targetCurrency, form.sourceAmount, form.purposeCode, form.referenceText,
    beneficiary?.id, beneficiary?.provider_id, beneficiary?.full_name, beneficiary?.company_name,
    beneficiary?.currency, beneficiary?.country_code, beneficiary?.payout_method, beneficiary?.status,
    beneficiary?.account_number, beneficiary?.iban, beneficiary?.bank_name, beneficiary?.bank_code,
    beneficiary?.branch_code, beneficiary?.swift_bic, beneficiary?.edit_fields]);

// Map server-confirmed terms only. Never compute SGD proceeds or infer fees from stored placeholders.
export const reviewPayoutAmounts = (review: TransferReview): NiumPayoutAmounts => review.payout_amounts ?? ({
  source_currency: review.source_currency, destination_currency: review.destination_currency,
  source_amount: review.source_amount, fx_rate: review.fx_rate, fx_lock_expires_at: review.fx_expires_at,
  transfer_fee: { amount: review.terms.fee_amount, currency: review.terms.currency },
  total_wallet_debit: review.terms.total_wallet_debit, conversion_amount: review.conversion_amount,
  beneficiary_credit: null,
});
