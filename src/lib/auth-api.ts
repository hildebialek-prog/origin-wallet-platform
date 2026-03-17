const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

export interface AuthApiUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthApiSession {
  user: AuthApiUser;
  accessToken?: string;
  refreshToken?: string;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  if (!apiBaseUrl) {
    throw new Error("Set VITE_API_BASE_URL before using email/password auth");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || "Authentication request failed",
    );
  }

  return data as T;
};

export const authApi = {
  loginWithEmail(email: string, password: string) {
    return request<AuthApiSession>("/auth/login", {
      body: { email, password },
    });
  },

  registerWithEmail(name: string, email: string, password: string, phone?: string) {
    return request<AuthApiSession>("/auth/register", {
      body: { name, email, password, phone },
    });
  },

  forgotPassword(email: string) {
    return request<{ message?: string }>("/auth/forgot-password", {
      body: { email },
    });
  },
};
