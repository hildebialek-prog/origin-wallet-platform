import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "251785792812-mpjegenufvk3ujl1tsq4sjd1n0k1bf0l.apps.googleusercontent.com";
const authStorageKey = "origin-wallet-auth-session";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const endpointConfig = {
  login: import.meta.env.VITE_AUTH_LOGIN_PATH || "/auth/login",
  loginVerify: import.meta.env.VITE_AUTH_LOGIN_VERIFY_PATH || "/auth/login/verify",
  register: import.meta.env.VITE_AUTH_REGISTER_PATH || "/auth/register",
  registerVerify: import.meta.env.VITE_AUTH_REGISTER_VERIFY_PATH || "/auth/register/verify",
  forgotPassword: import.meta.env.VITE_AUTH_FORGOT_PASSWORD_PATH || "/auth/forgot-password",
  resetPassword: import.meta.env.VITE_AUTH_RESET_PASSWORD_PATH || "/auth/reset-password",
  google: import.meta.env.VITE_AUTH_GOOGLE_PATH || "/auth/google",
  logout: import.meta.env.VITE_AUTH_LOGOUT_PATH || "/auth/logout",
  me: import.meta.env.VITE_AUTH_ME_PATH || "/auth/me",
  profile: import.meta.env.VITE_AUTH_PROFILE_PATH || "/auth/profile",
  updatePassword: import.meta.env.VITE_AUTH_UPDATE_PASSWORD_PATH || "/auth/update-password",
};

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  providerId: string | null;
  phone?: string | null;
  company?: string | null;
  country?: string | null;
  providerCode?: string | null;
  profile?: Record<string, unknown> | null;
}

interface RegisterPayload {
  email: string;
  phone: string;
  fullName: string;
  password: string;
  passwordConfirmation: string;
}

interface AuthChallenge {
  message: string;
  email: string;
  expiresInMinutes?: number | null;
}

interface UpdateProfilePayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  country?: string;
}

interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

interface ResetPasswordPayload {
  email: string;
  verificationCode: string;
  password: string;
  passwordConfirmation: string;
}

interface StoredSession {
  user: AuthUser;
  token?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  token: string | null;
  login: (email: string, password: string) => Promise<AuthChallenge>;
  verifyLogin: (email: string, verificationCode: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<AuthChallenge>;
  verifyRegister: (email: string, verificationCode: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
  signInWithGoogle: (idToken?: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthChallenge>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let googleScriptPromise: Promise<void> | null = null;

const buildApiUrl = (path: string) => {
  if (!apiBaseUrl) {
    throw new Error("Missing VITE_API_BASE_URL");
  }

  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
};

const toAuthUser = (source: any, payload?: any): AuthUser => ({
  id: String(source?.id ?? source?._id ?? source?.userId ?? source?.sub ?? source?.email ?? ""),
  email: source?.email ?? null,
  name: source?.full_name ?? source?.fullName ?? source?.name ?? source?.displayName ?? null,
  picture: source?.picture ?? source?.avatar ?? source?.photoURL ?? null,
  providerId: source?.providerId ?? source?.provider ?? null,
  phone: source?.phone ?? source?.phoneNumber ?? null,
  company:
    source?.company ??
    source?.companyName ??
    source?.profile?.company_name ??
    source?.profile?.companyName ??
    null,
  country: source?.country ?? source?.profile?.country_code ?? source?.profile?.countryCode ?? null,
  providerCode:
    payload?.onboarding?.selected_provider_code ?? payload?.providers?.[0]?.code ?? source?.provider_code ?? null,
  profile: source?.profile ?? null,
});

const getResponseError = async (response: Response) => {
  try {
    const data = await response.json();
    const fieldErrors = data?.errors ? Object.values(data.errors).flat().join(" ") : "";
    return data?.message || fieldErrors || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

const extractChallenge = (payload: any): AuthChallenge => ({
  message: payload?.message ?? "Verification code sent.",
  email: payload?.email ?? "",
  expiresInMinutes: payload?.expires_in_minutes ?? payload?.expiresInMinutes ?? null,
});

const extractSession = (payload: any): StoredSession => {
  const body = payload?.data ?? payload;
  const userSource = body?.user ?? body?.profile ?? body;
  const token =
    body?.token ?? body?.accessToken ?? body?.access_token ?? body?.jwt ?? body?.data?.token ?? null;

  const user = toAuthUser(userSource, body);

  if (!user.id) {
    throw new Error("Auth API response is missing user data");
  }

  return { user, token };
};

const saveSession = (session: StoredSession) => {
  localStorage.setItem(authStorageKey, JSON.stringify(session));
};

const clearSession = () => {
  localStorage.removeItem(authStorageKey);
};

const loadGoogleIdentityScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser"));
  }

  if ((window.google?.accounts as any)?.id) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
};

const requestGoogleIdToken = async () => {
  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const googleId = (window.google?.accounts as any)?.id;
    if (!googleId) {
      reject(new Error("Google sign-in is not available"));
      return;
    }

    let settled = false;
    const finish = (handler: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      handler();
    };

    googleId.cancel?.();
    googleId.initialize({
      client_id: googleClientId,
      callback: (response) => {
        finish(() => {
          if (!response.credential) {
            reject(new Error("Google did not return an ID token"));
            return;
          }
          resolve(response.credential);
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    googleId.prompt((notification) => {
      if (settled) {
        return;
      }

      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        finish(() => reject(new Error("Google sign-in is unavailable right now")));
      }
    });
  });
};

const requestApi = async (
  path: string,
  {
    method = "POST",
    body,
    token,
  }: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: Record<string, unknown>;
    token?: string | null;
  } = {},
) => {
  const url = buildApiUrl(path);
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot connect to auth API at ${url}`);
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const applySession = (session: StoredSession) => {
    saveSession(session);
    setUser(session.user);
    setToken(session.token ?? null);
    setAuthError(null);
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = localStorage.getItem(authStorageKey);
        if (!savedSession) {
          return;
        }

        const parsed = JSON.parse(savedSession) as StoredSession;
        if (!parsed.token) {
          applySession(parsed);
          return;
        }

        try {
          const payload = await requestApi(endpointConfig.me, { method: "GET", token: parsed.token });
          const refreshed = extractSession(payload);
          applySession({
            user: refreshed.user,
            token: refreshed.token ?? parsed.token,
          });
        } catch {
          applySession(parsed);
        }
      } catch (error) {
        console.error("Error restoring auth session:", error);
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const payload = await requestApi(endpointConfig.login, {
        body: {
          email,
          password,
        },
      });
      return extractChallenge(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to log in";
      setAuthError(message);
      throw error;
    }
  };

  const verifyLogin = async (email: string, verificationCode: string) => {
    try {
      const payload = await requestApi(endpointConfig.loginVerify, {
        body: {
          email,
          verification_code: verificationCode,
        },
      });
      applySession(extractSession(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify login";
      setAuthError(message);
      throw error;
    }
  };

  const register = async ({ email, phone, fullName, password, passwordConfirmation }: RegisterPayload) => {
    try {
      const payload = await requestApi(endpointConfig.register, {
        body: {
          email,
          phone,
          full_name: fullName,
          password,
          password_confirmation: passwordConfirmation,
        },
      });
      return extractChallenge(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register";
      setAuthError(message);
      throw error;
    }
  };

  const verifyRegister = async (email: string, verificationCode: string) => {
    try {
      const payload = await requestApi(endpointConfig.registerVerify, {
        body: {
          email,
          verification_code: verificationCode,
        },
      });
      applySession(extractSession(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify registration";
      setAuthError(message);
      throw error;
    }
  };

  const updateProfile = async ({ name, email, phone, company, country }: UpdateProfilePayload) => {
    if (!user) {
      throw new Error("No active user session");
    }

    try {
      const profilePayload: Record<string, unknown> = {
        user_type: company?.trim() ? "business" : "individual",
      };

      if (country?.trim()) {
        profilePayload.country_code = country.trim().slice(0, 2).toUpperCase();
      }

      if (company?.trim()) {
        profilePayload.company_name = company.trim();
      }

      const payload = await requestApi(endpointConfig.profile, {
        method: "PUT",
        token,
        body: {
          phone: phone?.trim() || "",
          full_name: name.trim(),
          ...(user.providerCode ? { provider_code: user.providerCode } : {}),
          profile: profilePayload,
        },
      });

      const session = extractSession(payload);
      applySession({
        user: {
          ...user,
          ...session.user,
          email: session.user.email ?? (email.trim() || user.email),
        },
        token: session.token ?? token,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile";
      setAuthError(message);
      throw error;
    }
  };

  const updatePassword = async ({ currentPassword, newPassword }: UpdatePasswordPayload) => {
    if (!user) {
      throw new Error("No active user session");
    }

    if (!currentPassword.trim()) {
      throw new Error("Current password is required");
    }

    if (newPassword.trim().length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    await requestApi(endpointConfig.updatePassword, {
      method: "PUT",
      token,
      body: {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      },
    });
  };

  const signInWithGoogle = async (providedIdToken?: string) => {
    try {
      const idToken = providedIdToken ?? (await requestGoogleIdToken());
      const payload = await requestApi(endpointConfig.google, {
        body: {
          id_token: idToken,
        },
      });
      applySession(extractSession(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in with Google";
      setAuthError(message);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const payload = await requestApi(endpointConfig.forgotPassword, {
        body: {
          email,
        },
      });
      return extractChallenge(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request password reset";
      setAuthError(message);
      throw error;
    }
  };

  const resetPassword = async ({ email, verificationCode, password, passwordConfirmation }: ResetPasswordPayload) => {
    try {
      const payload = await requestApi(endpointConfig.resetPassword, {
        body: {
          email,
          verification_code: verificationCode,
          password,
          password_confirmation: passwordConfirmation,
        },
      });
      setAuthError(null);
      return payload?.message ?? "Password reset successful.";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password";
      setAuthError(message);
      throw error;
    }
  };

  const logout = async () => {
    const currentToken = token;

    clearSession();
    setUser(null);
    setToken(null);
    setAuthError(null);

    if (!currentToken || !apiBaseUrl) {
      return;
    }

    try {
      await requestApi(endpointConfig.logout, { body: {}, token: currentToken });
    } catch (error) {
      console.warn("Logout API request failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        token,
        login,
        verifyLogin,
        register,
        verifyRegister,
        updateProfile,
        updatePassword,
        signInWithGoogle,
        requestPasswordReset,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
