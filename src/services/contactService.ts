import { ApiRequestError, requestApi } from "@/services/apiClient";

export interface ContactFormRequest {
  name: string;
  email: string;
  company?: string;
  subject: string;
  message: string;
}

export interface ContactFormSuccessResponse {
  message: string;
  data: {
    id: number;
    submitted_at: string;
  };
}

export interface ContactValidationErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export class ContactSubmissionError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ContactSubmissionError";
    this.status = status;
    this.errors = errors;
  }
}

export const submitContactMessage = async (
  payload: ContactFormRequest,
): Promise<ContactFormSuccessResponse> => {
  try {
    return await requestApi<ContactFormSuccessResponse>("/contact", {
      method: "POST",
      body: payload as unknown as Record<string, unknown>,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ContactSubmissionError(
        error.message || "Send message failed, please try again.",
        error.status,
        error.errors,
      );
    }

    throw error;
  }
};
