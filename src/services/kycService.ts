import { requestApi } from "@/services/apiClient";

export interface KycDocumentPayload {
  type: string;
  file_url: string;
  storage_disk?: string | null;
  file_path?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  file_hash?: string | null;
  side?: string | null;
  document_number?: string | null;
  issuing_country_code?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown>;
}

export interface KycRelatedPersonPayload {
  relationship_type: string;
  legal_name: string;
  date_of_birth?: string | null;
  nationality_country_code?: string | null;
  residence_country_code?: string | null;
  ownership_percentage?: number | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country_code?: string | null;
  metadata?: Record<string, unknown>;
  documents?: KycDocumentPayload[];
}

export interface KycSubmissionPayload {
  applicant_type: "individual" | "business";
  legal_name: string;
  date_of_birth?: string | null;
  nationality_country_code?: string | null;
  residence_country_code?: string | null;
  business_name?: string | null;
  business_registration_number?: string | null;
  tax_id?: string | null;
  registered_country_code?: string | null;
  address_line1: string;
  city: string;
  state?: string | null;
  postal_code?: string | null;
  country_code: string;
  documents?: KycDocumentPayload[];
  related_persons?: KycRelatedPersonPayload[];
  metadata?: Record<string, unknown>;
}

export interface KycRequirement {
  id: number;
  key: string;
  label: string;
  category: string;
  status: string;
  requirement_type: string;
  subject_type?: string | null;
  subject_id?: number | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface KycProfile extends KycSubmissionPayload {
  id: number;
  status: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  rejection_reason?: string | null;
  documents?: Array<KycDocumentPayload & { id: number; status: string }>;
  related_persons?: Array<KycRelatedPersonPayload & { id: number; status: string }>;
  requirements?: KycRequirement[];
}

export interface KycSubmissionResponse {
  message?: string;
  kyc_status: string;
  kyc_profile: KycProfile | null;
  kyc_submission?: KycProfile | null;
}

export type KycDocumentSubjectType =
  | "applicant"
  | "business"
  | "authorized_representative"
  | "beneficial_owner"
  | "agent";

export interface KycDocumentUploadResponse {
  message?: string;
  document: KycDocumentPayload;
}

export type IdentityVerificationSubject =
  | "applicant"
  | "business"
  | "authorized_representative"
  | "beneficial_owner";

export type IdentityCaptureType =
  | "identity_front"
  | "identity_back"
  | "proof_of_address"
  | "selfie_liveness"
  | "business_registration"
  | "certificate_of_incorporation"
  | "proof_of_business_address"
  | "account_opening_application_form"
  | "ownership_structure";

export interface IdentityVerificationSession {
  id: number;
  provider: string;
  external_session_id: string;
  subject_type: IdentityVerificationSubject;
  status: string;
  liveness_score?: string | number | null;
  face_match_score?: string | number | null;
  document_ocr?: Record<string, unknown> | null;
  checks?: Record<string, unknown> | null;
  expires_at?: string | null;
  completed_at?: string | null;
}

export interface IdentityVerificationArtifact {
  capture_type: IdentityCaptureType;
  file_url: string;
  storage_disk?: string | null;
  file_path: string;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  file_hash?: string | null;
  metadata?: Record<string, unknown>;
  uploaded_at?: string;
}

export interface IdentityVerificationSessionResponse {
  session: IdentityVerificationSession;
  required_captures?: IdentityCaptureType[];
}

export interface IdentityVerificationUploadResponse {
  session: IdentityVerificationSession;
  artifact: IdentityVerificationArtifact;
}

export type BusinessRegistryVerificationStatus = "verified" | "invalid" | "unavailable" | "error";

export interface BusinessRegistryVerificationResult {
  status: BusinessRegistryVerificationStatus;
  source: string;
  message: string;
  checked_at: string;
  identifier?: string | null;
  business_name?: string | null;
  registry_status?: string | null;
  address?: string | null;
  name_match?: boolean | null;
  source_url?: string | null;
  registration_url?: string | null;
  raw?: Record<string, unknown> | null;
}

export interface BusinessRegistryVerificationResponse {
  data: BusinessRegistryVerificationResult;
}

export const getKycProfile = (params: { token: string; userId: string | number }) =>
  requestApi<KycSubmissionResponse>(`/user/users/${params.userId}/kyc-profile`, {
    token: params.token,
  });

export const submitKycProfile = (params: {
  token: string;
  userId: string | number;
  payload: KycSubmissionPayload;
}) =>
  requestApi<KycSubmissionResponse>(`/user/users/${params.userId}/kyc-profile`, {
    method: "PUT",
    token: params.token,
    body: params.payload as unknown as Record<string, unknown>,
  });

export const resubmitKycRequirement = (params: {
  token: string;
  userId: string | number;
  requirementId: number;
  payload: {
    note?: string | null;
    profile?: Partial<KycSubmissionPayload>;
    related_person?: Partial<KycRelatedPersonPayload>;
    document?: KycDocumentPayload;
    metadata?: Record<string, unknown>;
  };
}) =>
  requestApi<KycSubmissionResponse>(`/user/users/${params.userId}/kyc-profile/requirements/${params.requirementId}/resubmit`, {
    method: "POST",
    token: params.token,
    body: params.payload as unknown as Record<string, unknown>,
  });

export const uploadKycDocument = async (params: {
  token: string;
  userId: string | number;
  type: string;
  file: File;
  subjectType?: KycDocumentSubjectType;
  side?: string | null;
  issuingCountryCode?: string | null;
  documentNumber?: string | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<KycDocumentUploadResponse> => {
  const formData = new FormData();
  const issuingCountryCode = String(params.issuingCountryCode ?? "").trim().toUpperCase();
  formData.append("type", params.type);
  formData.append("file", params.file);

  if (params.subjectType) formData.append("subject_type", params.subjectType);
  if (params.side) formData.append("side", params.side);
  if (/^[A-Z]{2}$/.test(issuingCountryCode)) formData.append("issuing_country_code", issuingCountryCode);
  if (params.documentNumber) formData.append("document_number", params.documentNumber);
  if (params.issuedAt) formData.append("issued_at", params.issuedAt);
  if (params.expiresAt) formData.append("expires_at", params.expiresAt);

  Object.entries(params.metadata ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    formData.append(`metadata[${key}]`, typeof value === "object" ? JSON.stringify(value) : String(value));
  });

  return requestApi<KycDocumentUploadResponse>(`/user/users/${params.userId}/kyc-profile/documents`, {
    method: "POST",
    token: params.token,
    body: formData,
  });
};

export const verifyBusinessRegistry = (params: {
  token: string;
  userId: string | number;
  countryCode: string;
  businessRegistrationNumber?: string | null;
  taxId?: string | null;
  businessName?: string | null;
}) =>
  requestApi<BusinessRegistryVerificationResponse>(`/user/users/${params.userId}/kyc-profile/business-registry/verify`, {
    method: "POST",
    token: params.token,
    body: {
      country_code: params.countryCode.toUpperCase(),
      business_registration_number: params.businessRegistrationNumber ?? null,
      tax_id: params.taxId ?? null,
      business_name: params.businessName ?? null,
    },
  });

export const startIdentityVerificationSession = (params: {
  token: string;
  userId: string | number;
  subjectType: IdentityVerificationSubject;
}) =>
  requestApi<IdentityVerificationSessionResponse>(
    `/user/users/${params.userId}/identity-verification-sessions`,
    {
      method: "POST",
      token: params.token,
      body: {
        subject_type: params.subjectType,
      },
    },
  );

export const uploadIdentityVerificationFile = async (params: {
  token: string;
  userId: string | number;
  sessionId: string | number;
  captureType: IdentityCaptureType;
  file: File;
  metadata?: Record<string, unknown>;
}): Promise<IdentityVerificationUploadResponse> => {
  const formData = new FormData();
  formData.append("capture_type", params.captureType);
  formData.append("file", params.file);

  Object.entries(params.metadata ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    formData.append(`metadata[${key}]`, typeof value === "object" ? JSON.stringify(value) : String(value));
  });

  return requestApi<IdentityVerificationUploadResponse>(
    `/user/users/${params.userId}/identity-verification-sessions/${params.sessionId}/uploads`,
    {
      method: "POST",
      token: params.token,
      body: formData,
    },
  );
};

export const completeIdentityVerificationSession = (params: {
  token: string;
  userId: string | number;
  sessionId: string | number;
  payload?: Record<string, unknown>;
}) =>
  requestApi<IdentityVerificationSessionResponse>(
    `/user/users/${params.userId}/identity-verification-sessions/${params.sessionId}/complete`,
    {
      method: "POST",
      token: params.token,
      body: params.payload ?? {
        checks: {
          session: "completed",
        },
      },
    },
  );
