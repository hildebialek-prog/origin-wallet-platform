import { requestApi } from "@/services/apiClient";

export interface CustomerRfiDocument { id: number; original_name?: string | null; mime_type?: string | null; file_size?: number | null; status?: string | null }
export interface CustomerRfiCase {
  id: number;
  status: string;
  submission_state: string;
  contract_gate: string;
  evidence?: { remarks?: string | null; template?: { name?: string; documentType?: string; requiredFields?: Array<{ fieldLabel?: string; fieldValue?: string; type?: string }> } };
  user_explanation?: string | null;
  revision_reason?: string | null;
  documents?: CustomerRfiDocument[];
  history?: Array<{ event_type: string; from_state?: string | null; to_state?: string | null; created_at?: string | null }>;
}

export const getCustomerRfis = (userId: string | number, token: string) =>
  requestApi<{ data: CustomerRfiCase[] }>(`/user/users/${userId}/nium-rfi-cases`, { token });

export const uploadCustomerRfiDocument = async (userId: string | number, token: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return requestApi<{ document: CustomerRfiDocument }>(`/user/users/${userId}/nium-rfi-documents`, { method: "POST", token, body: form });
};

export const saveCustomerRfiDraft = (userId: string | number, caseId: number, token: string, documentIds: number[], explanation: string) =>
  requestApi<CustomerRfiCase>(`/user/users/${userId}/nium-rfi-cases/${caseId}/draft`, { method: "PUT", token, body: { document_ids: documentIds, explanation } });

export const submitCustomerRfi = (userId: string | number, caseId: number, token: string) =>
  requestApi<CustomerRfiCase>(`/user/users/${userId}/nium-rfi-cases/${caseId}/submit`, { method: "POST", token, body: {} });
