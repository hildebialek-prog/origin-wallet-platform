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
  rejection_reason?: string | null;
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
  | "proof_of_business_address"
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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
};

const getResponseError = async (response: Response) => {
  try {
    const data = await response.json();
    const fieldErrors = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    return data?.message || fieldErrors || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const requestKycApi = async <TResponse>(
  path: string,
  {
    method = "GET",
    body,
    token,
  }: {
    method?: "GET" | "POST" | "PUT";
    body?: Record<string, unknown>;
    token: string;
  },
): Promise<TResponse> => {
  const response = await fetch(buildApiUrl(path), {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  return response.json() as Promise<TResponse>;
};

export const getKycProfile = (params: { token: string; userId: string | number }) =>
  requestKycApi<KycSubmissionResponse>(`/user/users/${params.userId}/kyc-profile`, {
    token: params.token,
  });

export const submitKycProfile = (params: {
  token: string;
  userId: string | number;
  payload: KycSubmissionPayload;
}) =>
  requestKycApi<KycSubmissionResponse>(`/user/users/${params.userId}/kyc-profile`, {
    method: "PUT",
    token: params.token,
    body: params.payload as unknown as Record<string, unknown>,
  });

export const startIdentityVerificationSession = (params: {
  token: string;
  userId: string | number;
  subjectType: IdentityVerificationSubject;
}) =>
  requestKycApi<IdentityVerificationSessionResponse>(
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
}): Promise<IdentityVerificationUploadResponse> => {
  const formData = new FormData();
  formData.append("capture_type", params.captureType);
  formData.append("file", params.file);

  const response = await fetch(
    buildApiUrl(`/user/users/${params.userId}/identity-verification-sessions/${params.sessionId}/uploads`),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${params.token}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  return response.json() as Promise<IdentityVerificationUploadResponse>;
};

export const completeIdentityVerificationSession = (params: {
  token: string;
  userId: string | number;
  sessionId: string | number;
  payload?: Record<string, unknown>;
}) =>
  requestKycApi<IdentityVerificationSessionResponse>(
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
