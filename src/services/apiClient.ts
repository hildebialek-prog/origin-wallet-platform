export type ApiValidationErrors = Record<string, string[]>;

export type ApiErrorPayload = {
  message?: string;
  errors?: ApiValidationErrors;
  [key: string]: unknown;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  token?: string | null;
  body?: Record<string, unknown> | FormData | null;
  headers?: HeadersInit;
};

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export class ApiRequestError extends Error {
  status: number;
  errors?: ApiValidationErrors;
  payload?: ApiErrorPayload | null;

  constructor(message: string, status: number, errors?: ApiValidationErrors, payload?: ApiErrorPayload | null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }
}

export const buildApiUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
};

const normalizeFieldErrors = (errors?: ApiValidationErrors) =>
  errors
    ? Object.values(errors)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    : [];

export const getResponseError = async (response: Response) => {
  let payload: ApiErrorPayload | null = null;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = null;
  }

  const fieldErrors = normalizeFieldErrors(payload?.errors).join(" ");
  const message =
    fieldErrors ||
    (typeof payload?.message === "string" ? payload.message : "") ||
    `Request failed with status ${response.status}`;

  return {
    message,
    payload,
    errors: payload?.errors,
  };
};

export const requestApi = async <TResponse>(
  path: string,
  { method = "GET", body, token, headers }: ApiRequestOptions = {},
): Promise<TResponse> => {
  const url = buildApiUrl(path);
  const isFormData = body instanceof FormData;
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiRequestError(`Cannot connect to API at ${url}`, 0);
    }

    throw error;
  }

  if (!response.ok) {
    const error = await getResponseError(response);
    throw new ApiRequestError(error.message, response.status, error.errors, error.payload);
  }

  if (response.status === 204) {
    return null as TResponse;
  }

  return response.json() as Promise<TResponse>;
};
