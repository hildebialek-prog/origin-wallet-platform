import { requestApi } from "./apiClient";

export type DynamicMode = "SOURCE_AMOUNT" | "DESTINATION_AMOUNT";
export type DynamicMoney = { currency: string; amount: string };
export type DynamicInstruction = { purpose_code: string; source_of_funds: string; comment: string };
export type DynamicCustomerPricing = {
  version: string; funding: string; country: string; destination: string; method: string;
  margin_percent: string; fee: string; fee_currency: string; origin_service_fee_usd: string;
  fee_payer: string; fee_treatment: string; rate_treatment: string; provider_settlement: string;
};
export type DynamicOptions = {
  beneficiary: { id: number; name: string; currency: string; country_code: string };
  status: string; reason_codes: string[];
  dynamic_available?: boolean;
  source_currency?: string;
  provider_listing?: { status: string; reason_codes: string[] } | null;
  customer_entitlement?: string;
  financial_authorization?: string;
  executable_amount_modes?: DynamicMode[];
  supported_amount_modes?: DynamicMode[];
  currency_scales?: Record<string, number>;
  requires_instruction_validation?: boolean;
  eligible_payout_rails?: string[];
  quote_availability: { status: string; destination_currencies: string[]; reason_codes: string[]; supported_amount_modes?: DynamicMode[]; payout_rail?: string | null };
};
export type DynamicQuote = {
  status: string; dynamic_quote_id: string; provider_quote_id: string; beneficiary_id: number;
  amount_mode: DynamicMode; entered_amount: string; source_currency: "USD"; destination_currency: string;
  quote_expires_at: string; quoted_principal: DynamicMoney; planned_included_fee: DynamicMoney;
  planned_total_usd_debit: string; quoted_destination_amount: DynamicMoney; nium_quoted_fx_rate: string;
  pricing_status?: string; financial_verification?: string;
  customer_pricing?: DynamicCustomerPricing; origin_service_fee?: DynamicMoney; payout_rail?: string;
};
export type DynamicReview = {
  status: "READY" | "UNAVAILABLE"; review_id: string; accepted_fingerprint?: string;
  dynamic_quote_id: string; beneficiary_id: number; provider_account_id: number; balance_id: number;
  amount_mode: DynamicMode; entered_amount: string; quote_expires_at: string;
  review_expires_at: string;
  provider_quote_id: string; nium_quoted_fx_rate: string;
  principal: DynamicMoney; included_fee: DynamicMoney; total_usd_debit: string;
  destination_amount: DynamicMoney; instruction: DynamicInstruction; reason_codes: string[];
  customer_pricing?: DynamicCustomerPricing; origin_service_fee?: DynamicMoney; payout_rail?: string;
};
export type DynamicSubmission = {
  provider_account_id: number; beneficiary_id: number; balance_id: number;
  client_reference: string; accepted_fingerprint: string;
};
export type DynamicTransfer = {
  id: string; beneficiary: { id: number; country_code: string }; source_currency: string;
  destination_currency: string; amount_mode: DynamicMode; total_usd_debit: string;
  principal: DynamicMoney; included_fee: DynamicMoney; destination_amount: DynamicMoney;
  status: "queued" | "processing" | "pending_provider_confirmation" | "reconciled" | "paid" | "failed" | "returned" | "requires_attention" | "cancelled";
  financial_reconciled: boolean; message: string; quote_expires_at: string;
  created_at?: string; consented_at?: string; submission_started_at?: string | null; reconciled_at?: string | null;
};
export type DynamicTransferPage = {
  data: DynamicTransfer[]; page: number; per_page: number; has_more: boolean; next_page: number | null;
};
type Auth = { userId: string; token: string };
const path = (userId: string) => `/user/users/${encodeURIComponent(userId)}/nium/dynamic-payouts`;
export const dynamicOptions = (auth: Auth, beneficiaryId: number) =>
  requestApi<DynamicOptions>(`${path(auth.userId)}/options?beneficiary_id=${beneficiaryId}`, { token: auth.token });
export const dynamicQuote = (auth: Auth, body: { beneficiary_id: number; destination_currency: string; amount_mode: DynamicMode; entered_amount: string }) =>
  requestApi<DynamicQuote>(`${path(auth.userId)}/quotes`, { method: "POST", token: auth.token, body });
export const dynamicReview = (auth: Auth, body: { beneficiary_id: number; dynamic_quote_id: string; instruction: DynamicInstruction }) =>
  requestApi<DynamicReview>(`${path(auth.userId)}/reviews`, { method: "POST", token: auth.token, body });
export const dynamicSubmit = (auth: Auth, body: DynamicSubmission) =>
  requestApi<DynamicTransfer>(path(auth.userId), { method: "POST", token: auth.token, body });
export const dynamicStatus = (auth: Auth, id: string) =>
  requestApi<DynamicTransfer>(`${path(auth.userId)}/${encodeURIComponent(id)}`, { token: auth.token });
export const dynamicTransfers = (auth: Auth, query: { client_reference?: string; page?: number; per_page?: number } = {}) => {
  const params = new URLSearchParams();
  if (query.client_reference !== undefined) params.set("client_reference", query.client_reference);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.per_page !== undefined) params.set("per_page", String(query.per_page));
  const serialized = params.toString();
  return requestApi<DynamicTransferPage>(`${path(auth.userId)}${serialized ? `?${serialized}` : ""}`, { token: auth.token });
};
