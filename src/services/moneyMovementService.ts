import { requestApi } from "@/services/apiClient";
import type { ProviderSummary } from "@/services/fxOrderService";
import { getProviderDisplayName } from "@/lib/primaryProvider";

export type ApiListPayload<T> = T[] | { data?: T[] };

export interface Balance {
  id: number;
  user_id: number;
  provider_id: number;
  bank_account_id?: number | null;
  external_account_id?: string | null;
  currency: string;
  available_balance: string | number;
  ledger_balance?: string | number | null;
  reserved_balance?: string | number | null;
  as_of?: string | null;
  raw_data?: Record<string, unknown> | null;
}

export interface BankAccount {
  id: number;
  provider_id: number;
  external_account_id?: string | null;
  account_type?: string | null;
  currency: string;
  country_code?: string | null;
  bank_name?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  routing_number?: string | null;
  status: string;
  is_default?: boolean;
  raw_data?: Record<string, unknown> | null;
}

export interface Beneficiary {
  id: number;
  user_id: number;
  provider_id: number;
  external_beneficiary_id?: string | null;
  is_registered?: boolean;
  beneficiary_type: string;
  full_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country_code: string;
  currency: string;
  payout_method?: string | null;
  payout_admission?: {
    allowed: boolean;
    reason: string | null;
    beneficiary_id: number;
    provider_id: number;
    source_currency: string;
    destination_country: string;
    destination_currency: string;
    payout_method: string;
    preparation_allowed?: boolean;
    fx_lock_enabled?: boolean;
  } | null;
  bank_name?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  status: string;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Transfer {
  id: number;
  transfer_no: string;
  user_id: number;
  provider_id: number;
  source_bank_account_id?: number | null;
  beneficiary_id?: number | null;
  external_transfer_id?: string | null;
  external_payment_id?: string | null;
  transfer_type: string;
  source_currency: string;
  target_currency: string;
  source_amount: string | number;
  target_amount?: string | number | null;
  fx_rate?: string | number | null;
  fee_amount?: string | number | null;
  fee_currency?: string | null;
  payout_amounts?: NiumPayoutAmounts | null;
  payout_workflow?: NiumSgdLocalWorkflow | null;
  purpose_code?: string | null;
  reference_text?: string | null;
  client_reference?: string | null;
  status: string;
  failure_code?: string | null;
  failure_reason?: string | null;
  submitted_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  raw_data?: Record<string, unknown> | null;
  beneficiary?: Beneficiary | null;
  source_bank_account?: BankAccount | null;
}

export interface NiumPayoutAmounts {
  source_currency: string;
  destination_currency: string;
  source_amount: string | number;
  total_wallet_debit: string | number | null;
  fx_rate: string | number | null;
  fx_lock_expires_at?: string | null;
  conversion_amount: string | number | null;
  transfer_fee: { amount: string | number; currency: string } | null;
  beneficiary_credit: string | number | null;
  estimated_conversion_amount?: string | null;
  actual_debit?: {
    state: string;
    currency?: string;
    principal_debit?: string;
    observed_charge_debit?: string;
    observed_total_debit?: string;
    charge_completeness?: string;
    pilot_charge_reserve_remaining?: string | null;
    pilot_charge_ceiling_breached?: boolean | null;
    pilot_charge_exposure?: "uncapped" | "funded_reserve";
    pilot_additional_charges_observed?: boolean;
    checked_at?: string;
  } | null;
}

export interface SgdLocalInstruction {
  transfer_id: number;
  source_amount: string;
  source_currency: string;
  destination_currency: string;
  purpose_code: string;
  fx_quote_id: number;
  rate: string;
  expires_at: string;
  receiving_account: { name: string; bank: string | null; last_four: string; sha256: string };
  financial_terms: {
    policy?: string;
    fee_amount: string | null;
    fee_currency: string;
    total_wallet_debit: string | null;
    reservation_amount?: string;
    risk_acknowledgement?: string;
    pilot_reserve?: { amount: string; currency: string } | null;
    expires_at: string;
  };
}

export interface NiumSgdLocalWorkflow {
  submission_token?: string | null;
  customer_instruction?: SgdLocalInstruction | null;
  pilot_policy?: { authorization_id: string; reservation_amount: string; reserve_currency: "USD";
    reserve_amount: string | null; fee_status: "unverified"; total_wallet_debit: null;
    policy?: "funded_reserve" | "one_time_uncapped"; charge_ceiling?: string | null;
    risk_acknowledgement?: string | null } | null;
  business_policy?: { basis: "internal_business_policy"; currency: string; reservation_amount: string;
    expected_principal_debit: string; expected_fee_amount: string | null } | null;
  can_recover_captured_outcome?: boolean;
  can_restart_review?: boolean;
  can_refresh_pricing?: boolean;
  financial_terms_token?: string | null;
  checker_approval_allowed?: boolean;
  dispatch_owner?: "checker_approval";
  recovery_kind?: string | null;
  can_request_recovery_review?: boolean;
  recovery_review_requested_at?: string | null;
  can_reconcile_status?: boolean;
  state: string;
  fx_lock_active: boolean;
  fx_lock_enabled: boolean;
  expected_fee?: { amount: string | null; currency: string; basis: "user_expectation" | "unknown_fees_explicitly_accepted" };
  provider_fee_status?: "unavailable" | "confirmed";
  approval_request_allowed: boolean;
  dispatch_allowed?: boolean;
  blockers: string[];
}

export type SgdLocalWorkflow = NiumSgdLocalWorkflow;

export interface Transaction {
  id: number;
  user_id: number;
  provider_id: number;
  bank_account_id?: number | null;
  transfer_id?: number | null;
  external_transaction_id?: string | null;
  transaction_type: string;
  direction: string;
  currency: string;
  amount: string | number;
  fee_amount?: string | number | null;
  description?: string | null;
  reference_text?: string | null;
  status: string;
  booked_at?: string | null;
  value_date?: string | null;
  wallet_context?: {
    provider_account_id: number;
    virtual_account_id?: number | null;
    virtual_account_reference?: string | null;
    provider_payment_id?: string | null;
    virtual_account_currency?: string | null;
    account_category?: string | null;
    account_type?: string | null;
    virtual_account_status?: string | null;
    balance_after_transaction?: {
      currency: string;
      available_balance: string | number;
      reserved_balance: string | number;
      ledger_balance: string | number;
      source?: string | null;
      entry_type?: string | null;
      posted_at?: string | null;
    } | null;
  } | null;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BeneficiaryPayload {
  provider_id: number;
  beneficiary_type: string;
  full_name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country_code: string;
  currency: string;
  bank_name?: string | null;
  bank_code?: string | null;
  branch_code?: string | null;
  account_number?: string | null;
  iban?: string | null;
  swift_bic?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  raw_data?: Record<string, unknown>;
}

export interface TransferPayload {
  provider_id: number;
  source_bank_account_id?: number | null;
  beneficiary_id: number;
  transfer_type: string;
  source_currency: string;
  target_currency: string;
  source_amount: number;
  target_amount?: number | null;
  fx_rate?: number | null;
  fee_amount?: number | null;
  fee_currency?: string | null;
  purpose_code?: string | null;
  reference_text?: string | null;
  client_reference?: string | null;
  raw_data?: Record<string, unknown>;
}

type AuthenticatedParams = {
  token: string;
  userId: string | number;
};

const normalizeList = <T>(payload: ApiListPayload<T>): T[] => {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
};

export const getBalances = async (params: AuthenticatedParams) =>
  normalizeList(
    await requestApi<ApiListPayload<Balance>>(`/user/users/${params.userId}/balances`, {
      token: params.token,
    }),
  );

export const getBankAccounts = async (params: AuthenticatedParams) =>
  normalizeList(
    await requestApi<ApiListPayload<BankAccount>>(`/user/users/${params.userId}/bank-accounts`, {
      token: params.token,
    }),
  );

export const getBeneficiaries = async (params: AuthenticatedParams) =>
  normalizeList(
    await requestApi<ApiListPayload<Beneficiary>>(`/user/users/${params.userId}/beneficiaries`, {
      token: params.token,
    }),
  );

export const createBeneficiary = (params: AuthenticatedParams & { payload: BeneficiaryPayload }) =>
  requestApi<Beneficiary>(`/user/users/${params.userId}/beneficiaries`, {
    method: "POST",
    token: params.token,
    body: params.payload,
  });

export const updateBeneficiary = (params: AuthenticatedParams & { beneficiaryId: number; payload: Partial<BeneficiaryPayload> }) =>
  requestApi<Beneficiary>(`/user/users/${params.userId}/beneficiaries/${params.beneficiaryId}`, {
    method: "PUT",
    token: params.token,
    body: params.payload,
  });

export const deleteBeneficiary = (params: AuthenticatedParams & { beneficiaryId: number }) =>
  requestApi<null>(`/user/users/${params.userId}/beneficiaries/${params.beneficiaryId}`, {
    method: "DELETE",
    token: params.token,
  });

export const getTransfers = async (params: AuthenticatedParams) =>
  normalizeList(
    await requestApi<ApiListPayload<Transfer>>(`/user/users/${params.userId}/transfers`, {
      token: params.token,
    }),
  );

export const getTransfer = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}`, { token: params.token });

export const prepareSgdLocalPayout = (params: AuthenticatedParams & { payload: {
  provider_id: number; beneficiary_id: number; source_currency: string; target_currency: string;
  source_amount: string; purpose_code: string; purpose_confirmed: true; client_reference: string;
  reference_text?: string | null;
  expected_fee_amount: "0"; expected_fee_currency: string;
} }) => requestApi<Transfer>(`/user/users/${params.userId}/sgd-local-payouts`, {
  method: "POST", token: params.token, body: params.payload,
});

export const requestSgdLocalFxLock = (params: AuthenticatedParams & { transferId: number; requestId: string }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-fx-lock`, {
    method: "POST", token: params.token, body: { request_id: params.requestId, confirm_fx_lock: true },
  });

export const recoverSgdLocalCapturedOutcome = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-recover-captured`, {
    method: "POST", token: params.token,
  });

export const restartSgdLocalReview = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-restart-review`, {
    method: "POST", token: params.token, body: { confirm_new_review: true },
  });

export const requestSgdLocalRecoveryReview = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-recovery-review`, {
    method: "POST", token: params.token,
  });

export const refreshSgdLocalPricing = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-refresh-pricing`, {
    method: "POST", token: params.token,
  });

export const requestSgdLocalApproval = (params: AuthenticatedParams & { transferId: number; financialTermsToken: string }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-request-approval`, {
    method: "POST", token: params.token, body: { financial_terms_token: params.financialTermsToken },
  });

export const createTransfer = (params: AuthenticatedParams & { payload: TransferPayload }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers`, {
    method: "POST",
    token: params.token,
    body: params.payload,
  });

export const submitTransfer = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<{ message?: string; transfer: Transfer }>(`/user/users/${params.userId}/transfers/${params.transferId}/submit`, {
    method: "POST",
    token: params.token,
  });

export const prepareSgdLocal = (params: AuthenticatedParams & { payload: {
  provider_id: number; beneficiary_id: number; source_amount: string; purpose_code: string; client_reference: string;
  reference_text?: string | null;
} }) => prepareSgdLocalPayout({ ...params, payload: { ...params.payload,
  source_currency: "USD", target_currency: "SGD", purpose_confirmed: true,
  expected_fee_amount: "0", expected_fee_currency: "USD",
} });

export const lockSgdLocal = requestSgdLocalFxLock;

export const submitSgdLocal = (params: AuthenticatedParams & { transferId: number; submissionToken: string; acceptUncappedCharges: boolean }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/sgd-local-submit`, {
    method: "POST", token: params.token, body: { submission_token: params.submissionToken,
      accept_payment_terms: true, purpose_confirmed: true, accept_uncapped_charges: params.acceptUncappedCharges },
  });

export const syncTransferStatus = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<{ message?: string; transfer: Transfer }>(
    `/user/users/${params.userId}/transfers/${params.transferId}/sync-status`,
    {
      method: "POST",
      token: params.token,
    },
  );

export const cancelTransfer = (params: AuthenticatedParams & { transferId: number }) =>
  requestApi<Transfer>(`/user/users/${params.userId}/transfers/${params.transferId}/cancel`, {
    method: "POST",
    token: params.token,
  });

export const getTransactions = async (params: AuthenticatedParams) =>
  normalizeList(
    await requestApi<ApiListPayload<Transaction>>(`/user/users/${params.userId}/transactions`, {
      token: params.token,
    }),
  );

export const syncProviderBalances = (params: AuthenticatedParams & { providerCode: string }) =>
  requestApi<{ message?: string; result?: unknown }>(
    `/user/users/${params.userId}/providers/${encodeURIComponent(params.providerCode)}/sync/balances`,
    {
      method: "POST",
      token: params.token,
    },
  );

export const syncProviderTransactions = (params: AuthenticatedParams & { providerCode: string }) =>
  requestApi<{ message?: string; result?: unknown }>(
    `/user/users/${params.userId}/providers/${encodeURIComponent(params.providerCode)}/sync/transactions`,
    {
      method: "POST",
      token: params.token,
    },
  );

export const getProviderName = (providers: ProviderSummary[], providerId?: number | null) =>
  providerId ? getProviderDisplayName(providers.find((provider) => provider.id === providerId)) : "-";

export interface BeneficiaryRequirementField {
  name: string;
  required: boolean;
  type?: string;
  pattern?: string;
  min_length?: number;
  max_length?: number;
  allowed_values?: unknown[];
}

export interface NiumBeneficiaryRequirements {
  dimensions: Record<string, string>;
  routing_code_types: string[];
  fields: BeneficiaryRequirementField[];
}

export interface NiumBeneficiaryPayoutMethods {
  provider_id: number;
  beneficiary_type: string;
  country_code: string;
  currency: string;
  payout_methods: string[];
}

export const getBeneficiaryPayoutMethods = (params: AuthenticatedParams & {
  providerId: string; beneficiaryType: string; countryCode: string; currency: string;
}) => {
  const query = new URLSearchParams({
    provider_id: params.providerId, beneficiary_type: params.beneficiaryType,
    country_code: params.countryCode, currency: params.currency,
  });
  return requestApi<NiumBeneficiaryPayoutMethods>(`/user/users/${params.userId}/beneficiaries/payout-methods?${query}`, { token: params.token });
};

export const getBeneficiaryRequirements = (params: AuthenticatedParams & {
  providerId: string; beneficiaryType: string; countryCode: string; currency: string; payoutMethod: string;
}) => {
  const query = new URLSearchParams({
    provider_id: params.providerId, beneficiary_type: params.beneficiaryType,
    country_code: params.countryCode, currency: params.currency, payout_method: params.payoutMethod,
  });
  return requestApi<NiumBeneficiaryRequirements>(`/user/users/${params.userId}/beneficiaries/requirements?${query}`, { token: params.token });
};
