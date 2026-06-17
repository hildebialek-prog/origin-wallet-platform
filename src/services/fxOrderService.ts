import { requestApi } from "@/services/apiClient";

export interface ProviderSummary {
  id: number;
  code: string;
  name: string;
  logo_url?: string | null;
  status: string;
  is_available_for_onboarding?: boolean;
  supports_beneficiaries?: boolean;
  supports_data_sync?: boolean;
  supports_quotes?: boolean;
  supports_transfers?: boolean;
  supports_webhooks?: boolean;
  is_configured?: boolean;
}

export interface FxOrder {
  id: number;
  order_no: string;
  user_id: number;
  provider_id: number;
  provider?: ProviderSummary | null;
  source_currency: string;
  target_currency: string;
  source_amount: string | number;
  target_amount?: string | number | null;
  fx_rate?: string | number | null;
  fee_amount?: string | number | null;
  fee_currency?: string | null;
  status: string;
  customer_snapshot?: Record<string, unknown> | null;
  raw_data?: Record<string, unknown> | null;
  admin_note?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FxOrderResponse {
  message?: string;
  order: FxOrder;
}

export interface ProviderRate {
  provider: ProviderSummary;
  quote_status: "ready" | "managed" | "reference" | "unavailable" | "error" | string;
  quote: {
    source_currency: string;
    target_currency: string;
    source_amount: number | null;
    target_amount: number | null;
    mid_rate: number | null;
    net_rate: number | null;
    fee_amount: number;
    buy_rate?: number | null;
    sell_rate?: number | null;
    expires_at?: string | null;
    quoted_at?: string | null;
  } | null;
  message?: string | null;
}

export interface ProviderRateResponse {
  data: ProviderRate[];
  meta?: {
    source_currency: string;
    target_currency: string;
    source_amount: number;
    refreshed_at: string;
  };
}

export const getProviders = () => requestApi<{ data: ProviderSummary[] }>("/providers");

export const getProviderRates = (params: {
  token: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
}) => {
  const query = new URLSearchParams({
    source_currency: params.sourceCurrency.toUpperCase(),
    target_currency: params.targetCurrency.toUpperCase(),
    source_amount: String(params.sourceAmount),
  });

  return requestApi<ProviderRateResponse>(`/member/provider-rates?${query.toString()}`, {
    token: params.token,
  });
};

export const getFxOrders = (params: { token: string; userId: string | number; page?: number }) =>
  requestApi<FxOrder[]>(`/user/users/${params.userId}/fx-orders?page=${params.page ?? 1}`, {
    token: params.token,
  });

export const createFxOrder = (params: {
  token: string;
  userId: string | number;
  providerId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount?: number | null;
  fxRate?: number | null;
  feeAmount?: number | null;
  feeCurrency?: string | null;
  rawData?: Record<string, unknown>;
}) =>
  requestApi<FxOrderResponse>(`/user/users/${params.userId}/fx-orders`, {
    method: "POST",
    token: params.token,
    body: {
      provider_id: params.providerId,
      source_currency: params.sourceCurrency.toUpperCase(),
      target_currency: params.targetCurrency.toUpperCase(),
      source_amount: params.sourceAmount,
      target_amount: params.targetAmount ?? null,
      fx_rate: params.fxRate ?? null,
      fee_amount: params.feeAmount ?? 0,
      fee_currency: params.feeCurrency?.toUpperCase() ?? params.targetCurrency.toUpperCase(),
      raw_data: params.rawData ?? {},
    },
  });
