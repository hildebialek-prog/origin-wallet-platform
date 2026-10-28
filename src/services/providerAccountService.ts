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
  can_request_virtual_account: boolean;
  virtual_account_eligibility_reason?:
    | "account_missing"
    | "kyb_approval_pending"
    | "account_verification_incomplete"
    | "account_restricted"
    | "account_security_review"
    | "unsupported_provider"
    | null;
  virtual_account_allocation_reason?:
    | "allocation_paused"
    | "allocation_testing_only"
    | "allocation_production_disabled"
    | "allocation_unavailable"
    | "allocation_cutover_required"
    | "unsupported_provider"
    | null;
}

export const virtualAccountAllocationMessage = (reason: ProviderIntegrationItem["virtual_account_allocation_reason"]): string => {
  switch (reason) {
    case "allocation_paused": return "New virtual account requests are paused. Saved requests can still be checked.";
    case "allocation_testing_only": return "New virtual account requests are awaiting Production approval. Saved requests can still be checked.";
    case "allocation_production_disabled": return "New virtual account requests are awaiting Production approval. Saved requests can still be checked.";
    case "allocation_cutover_required": return "New virtual account requests are awaiting operational readiness. Saved requests can still be checked.";
    default: return "New virtual account requests are currently unavailable. Saved requests can still be checked.";
  }
};

export interface LinkResponse {
  message?: string;
  provider_account?: ProviderAccount | null;
  onboarding?: OnboardingState | null;
}

export interface RequestConnectResponse {
  message?: string;
  integration_request?: IntegrationRequest | null;
}

export interface VirtualAccount {
  id: number;
  user_provider_account_id: number;
  provider_payment_id: string | null;
  detail?: {
    account_name?: string | null;
    bank_name?: string | null;
    bank_address?: string | null;
    routing_code_type?: string | null;
    routing_code_value?: string | null;
    routing_code_type_2?: string | null;
    routing_code_value_2?: string | null;
    provider_bank_name?: string | null;
    provider_account_type?: string | null;
    provider_account_category?: string | null;
  } | null;
  enrichment?: {
    status: "pending" | "running" | "complete" | "exhausted" | null;
    next_attempt_at: string | null;
    updated_at: string | null;
  } | null;
  virtual_account_reference: string | null;
  currency: string;
  account_category: string | null;
  account_type: string | null;
  status: string;
  assigned_at?: string | null;
}

export interface RequestVirtualAccountResponse {
  message?: string;
  operation_id: string;
  virtual_account: VirtualAccount | null;
  operation?: VirtualAccountOperationProjection;
}

export type VirtualAccountOperationStatus =
  | "claimed" | "submitting" | "preflight_failed" | "pending"
  | "unknown" | "manual_review" | "failed" | "assigned";

export interface VirtualAccountOperationProjection {
  operation_id: string;
  provider_account_id: number;
  status: VirtualAccountOperationStatus;
  currency: string;
  provider_payment_id: string | null;
  virtual_account_id: number | null;
  updated_at: string | null;
}

// The singular account GET does not expose the index's eligibility flags.
export interface ProviderAccountOperationPage {
  provider: IntegrationProvider;
  provider_account: ProviderAccount | null;
  virtual_account_operations: VirtualAccountOperationProjection[];
  virtual_account_operations_pagination: {
    per_page: number;
    has_more: boolean;
    next_before_id: number | null;
  };
}

export type VirtualAccountCategory =
  | "SELF_FUNDING_ACCOUNT"
  | "COLLECTION_ACCOUNT"
  | "SELF_FUNDING_AND_COLLECTION_ACCOUNT";

export type VirtualAccountType = "LOCAL" | "WIRES" | "LOCAL_AND_WIRES";

type AuthenticatedParams = {
  token: string;
  userId: string | number;
};

export const getProviderAccountOperations = (params: AuthenticatedParams & {
  providerCode: string;
  providerAccountId?: number;
  operationId?: string;
  beforeId?: number;
  unresolvedOnly?: boolean;
}) => {
  const query = new URLSearchParams();
  if (params.providerAccountId !== undefined) query.set("provider_account_id", String(params.providerAccountId));
  if (params.operationId !== undefined) query.set("operation_id", params.operationId);
  if (params.beforeId !== undefined) query.set("operations_before_id", String(params.beforeId));
  if (params.unresolvedOnly) query.set("operations_unresolved_only", "1");
  const suffix = query.toString();
  return requestApi<ProviderAccountOperationPage>(
    `/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}${suffix ? `?${suffix}` : ""}`,
    { token: params.token },
  );
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

export const requestVirtualAccount = (params: AuthenticatedParams & {
  providerCode: string;
  currency: string;
  accountCategory: VirtualAccountCategory;
  accountType: VirtualAccountType;
  operationId: string;
  expectedProviderAccountId?: number;
}) =>
  requestApi<RequestVirtualAccountResponse>(
    `/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}/virtual-account`,
    {
      method: "POST",
      token: params.token,
      headers: {
        "Idempotency-Key": params.operationId,
      },
      body: {
        currency: params.currency,
        account_category: params.accountCategory,
        account_type: params.accountType,
        ...(params.expectedProviderAccountId !== undefined
          ? { expected_provider_account_id: params.expectedProviderAccountId } : {}),
      },
    },
  );

export const getVirtualAccounts = async (params: AuthenticatedParams & { providerCode: string; providerAccountId?: number }) => {
  const payload = await requestApi<{ data: VirtualAccount[] }>(
    `/user/users/${params.userId}/provider-accounts/${encodeURIComponent(params.providerCode)}/virtual-accounts${
      params.providerAccountId === undefined ? "" : `?provider_account_id=${params.providerAccountId}`
    }`,
    {
      token: params.token,
    },
  );

  return Array.isArray(payload?.data) ? payload.data : [];
};

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
