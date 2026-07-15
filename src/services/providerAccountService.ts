import { requestApi } from "@/services/apiClient";
import type { OnboardingState, ProviderCapability } from "@/contexts/AuthContext";
import { filterPrimaryProviders, isPrimaryProvider } from "@/lib/primaryProvider";

export interface IntegrationProvider {
  id: number;
  code: string;
  name: string;
  logo_url?: string | null;
  status: string;
}

export interface ProviderAccount {
  id: number;
  status: string;
  provider_status?: string | null;
  provider_sub_status?: string | null;
  compliance_status?: string | null;
  rfi_status?: string | null;
  odd_status?: string | null;
  external_customer_id?: string | null;
  external_account_id?: string | null;
  account_name?: string | null;
}

export interface IntegrationLink {
  id: number;
  link_url: string;
  link_label?: string | null;
  is_active: boolean;
}

export interface IntegrationRequest {
  id: number;
  status: string;
  note?: string | null;
  requested_at?: string | null;
}

export interface ProviderIntegrationItem {
  provider: IntegrationProvider;
  provider_account: ProviderAccount | null;
  integration_link: IntegrationLink | null;
  integration_request: IntegrationRequest | null;
  internal_kyc_verified?: boolean;
  provider_submission_approved?: boolean;
  link_available: boolean;
  can_connect: boolean;
  can_request_connect: boolean;
  request_pending: boolean;
}

export interface LinkResponse {
  message?: string;
  provider_account?: ProviderAccount | null;
  onboarding?: OnboardingState | null;
}

export interface RequestConnectResponse {
  message?: string;
  integration_request?: IntegrationRequest | null;
}

type AuthenticatedParams = {
  token: string;
  userId: string | number;
};

export const getProviderReference = async (params: { token: string }) => {
  const payload = await requestApi<{ data: ProviderCapability[] }>("/providers", {
    token: params.token,
  });

  return filterPrimaryProviders(Array.isArray(payload?.data) ? payload.data : []);
};

export const getProviderIntegrations = async (params: AuthenticatedParams) => {
  const payload = await requestApi<{ data: ProviderIntegrationItem[] }>(`/user/users/${params.userId}/provider-accounts`, {
    token: params.token,
  });

  return (Array.isArray(payload?.data) ? payload.data : []).filter((item) => isPrimaryProvider(item.provider));
};

export const linkProviderAccount = (params: AuthenticatedParams & { providerCode: string; force?: boolean }) =>
  requestApi<LinkResponse>(`/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}/link`, {
    method: "POST",
    token: params.token,
    body: {
      force: params.force ?? false,
    },
  });

export const requestProviderConnect = (params: AuthenticatedParams & { providerCode: string; note?: string }) =>
  requestApi<RequestConnectResponse>(
    `/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}/request-connect`,
    {
      method: "POST",
      token: params.token,
      body: {
        note: params.note ?? "",
      },
    },
  );

export const completeProviderAccount = (params: AuthenticatedParams & {
  providerCode: string;
  status?: string | null;
  externalCustomerId?: string | null;
  externalAccountId?: string | null;
  accountName?: string | null;
}) => {
  if (
    params.providerCode.toLowerCase() === "nium" &&
    (params.status || params.externalCustomerId || params.externalAccountId)
  ) {
    return Promise.reject(new Error("Nium status and provider IDs can only be updated by the backend."));
  }

  return requestApi<LinkResponse>(
    `/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}/complete`,
    {
      method: "POST",
      token: params.token,
      body: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.externalCustomerId ? { external_customer_id: params.externalCustomerId } : {}),
        ...(params.externalAccountId ? { external_account_id: params.externalAccountId } : {}),
        ...(params.accountName ? { account_name: params.accountName } : {}),
      },
    },
  );
};
