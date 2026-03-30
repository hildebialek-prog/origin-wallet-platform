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

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const buildApiUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
};

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
  let response: Response;

  try {
    response = await fetch(buildApiUrl("/contact"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ContactSubmissionError("Send message failed, please try again.", 0);
    }

    throw error;
  }

  if (!response.ok) {
    let errorPayload: ContactValidationErrorResponse | null = null;

    try {
      errorPayload = (await response.json()) as ContactValidationErrorResponse;
    } catch {
      errorPayload = null;
    }

    throw new ContactSubmissionError(
      errorPayload?.message || "Send message failed, please try again.",
      response.status,
      errorPayload?.errors,
    );
  }

  return (await response.json()) as ContactFormSuccessResponse;
};
