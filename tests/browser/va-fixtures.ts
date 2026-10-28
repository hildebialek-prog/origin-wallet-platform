import { API_BASE, TEST_ORIGIN } from "./test-origin.mjs";

export const USER_ID = "41";
export const ACCOUNT_ID = 7;
export const VA_ID = 87;
export const FAKE_TOKEN = "va-browser-fake-token-not-a-credential";
export const ACCOUNT_PATH = `/user/users/${USER_ID}/provider-accounts/nium`;
export const INTEGRATIONS_PATH = `/user/users/${USER_ID}/provider-accounts`;
export const CREATE_PATH = `${ACCOUNT_PATH}/virtual-account`;
export const VA_LIST_PATH = `${ACCOUNT_PATH}/virtual-accounts`;
export const REQUEST_PAGE = "/account/virtual-accounts/request";
export const LIST_PAGE = "/account/virtual-accounts";
export const STORE_KEY = `origin-wallet:va-lifecycle:v2:${JSON.stringify([API_BASE, USER_ID, "nium"])}`;

export type OperationStatus = "claimed" | "submitting" | "preflight_failed" | "pending" | "unknown" | "manual_review" | "failed" | "assigned";
export type EnrichmentStatus = "pending" | "running" | "complete" | "exhausted";
export interface Projection {
  operation_id: string;
  provider_account_id: number;
  status: OperationStatus;
  currency: string;
  provider_payment_id: string | null;
  virtual_account_id: number | null;
  updated_at: string;
}
export interface BankingDetails {
  account_name?: string | null;
  bank_name?: string | null;
  bank_address?: string | null;
  routing_code_type?: string | null;
  routing_code_value?: string | null;
  routing_code_type_2?: string | null;
  routing_code_value_2?: string | null;
  provider_account_type?: string | null;
  provider_account_category?: string | null;
}
export interface BrowserVA {
  id: number;
  user_provider_account_id: number;
  provider_payment_id: string | null;
  virtual_account_reference: string;
  currency: string;
  account_category: string;
  account_type: string;
  status: string;
  detail: BankingDetails | null;
  enrichment: { status: EnrichmentStatus | null; next_attempt_at: string | null; updated_at: string | null } | null;
}
export interface SavedOperation {
  providerAccountId: number;
  operationId: string;
  request: { providerCode: string; currency: string; accountCategory: string; accountType: string } | null;
  submission: string;
  server: Omit<Projection, "provider_payment_id"> | null;
  virtualAccountId: number | null;
}
export interface SavedScope {
  version: number;
  generation: number;
  environment: string;
  userId: string;
  providerCode: string;
  operations: SavedOperation[];
  legacy: unknown[];
}

export const provider = { id: 1, code: "nium", name: "Browser fixture provider", status: "active" };
export const providerAccount = { id: ACCOUNT_ID, status: "active" };
export const integration = {
  provider, provider_account: providerAccount, integration_link: null, integration_request: null,
  link_available: true, can_connect: false, can_request_connect: false, request_pending: false,
  can_request_virtual_account: true, virtual_account_eligibility_reason: null,
};
export const session = {
  user: { id: USER_ID, name: "VA Browser User", email: "va-browser@example.test", picture: null, providerId: null, kycStatus: "verified" },
  token: FAKE_TOKEN,
  providers: [provider],
  onboarding: { profile_completed: true, internal_kyc_verified: true, selected_provider_code: "nium",
    selected_provider_account_status: "active", provider_account_statuses: { nium: "active" }, next_action: null, message: null },
};
export const initialStorage = () => ({
  cookies: [],
  origins: [{ origin: TEST_ORIGIN, localStorage: [
    { name: "origin-wallet-auth-session", value: JSON.stringify(session) },
    { name: "website_language", value: "en" },
  ] }],
});
export const projection = (key: string, status: OperationStatus = "pending"): Projection => ({
  operation_id: key, provider_account_id: ACCOUNT_ID, status, currency: "USD",
  provider_payment_id: status === "assigned" ? "TEST-VA-0001" : null,
  virtual_account_id: status === "assigned" ? VA_ID : null,
  updated_at: "2026-10-28T00:00:00Z",
});
export const bankDetails = (): BankingDetails => ({
  account_name: "Browser Fixture Account", bank_name: "Browser Fixture Bank", bank_address: "1 Fixture Street",
  routing_code_type: "SWIFT", routing_code_value: "TESTUS00", routing_code_type_2: "ACH", routing_code_value_2: "000000001",
  provider_account_type: "GLOBAL", provider_account_category: "SELF_FUNDING_ACCOUNT",
});
export const virtualAccount = (status = "assigned", enrichment: EnrichmentStatus | null = "pending"): BrowserVA => ({
  id: VA_ID, user_provider_account_id: ACCOUNT_ID,
  provider_payment_id: status === "assigned" ? "TEST-VA-0001" : null,
  virtual_account_reference: "test-reference-0001", currency: "USD", account_category: "SELF_FUNDING_ACCOUNT",
  account_type: "LOCAL", status, detail: null,
  enrichment: { status: enrichment, next_attempt_at: enrichment === "pending" ? "2026-10-28T00:01:00Z" : null,
    updated_at: "2026-10-28T00:00:00Z" },
});
