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
  fx_quote_id?: number | null;
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
  fx_quote_id?: number | null;
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

export interface FxQuote {
  id: number;
  source_currency: string;
  target_currency: string;
  source_amount: string | number;
  target_amount: string | number;
  net_rate?: string | number | null;
  fee_amount?: string | number | null;
  expires_at?: string | null;
}

export const createFxQuote = (params: AuthenticatedParams & { payload: {
  provider_id: number;
  source_currency: string;
  target_currency: string;
  source_amount: number;
} }) => requestApi<FxQuote>(`/user/users/${params.userId}/fx-quotes`, {
  method: "POST",
  token: params.token,
  body: params.payload,
});

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
