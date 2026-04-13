import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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

export interface ProviderCapability {
  id: number;
  code: string;
  name: string;
  status: string;
  is_available_for_onboarding?: boolean;
  supports_beneficiaries?: boolean;
  supports_data_sync?: boolean;
  supports_quotes?: boolean;
  supports_transfers?: boolean;
  supports_webhooks?: boolean;
  is_configured?: boolean;
}

export interface OnboardingState {
  profile_completed: boolean;
  selected_provider_code: string | null;
  selected_provider_account_status: string | null;
  provider_account_statuses: Record<string, unknown>;
  next_action: string | null;
  message: string | null;
  redirect_url?: string | null;
  status?: string | null;
  action_type?: string | null;
  metadata?: Record<string, unknown> | null;
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
  onboarding?: OnboardingState | null;
  providers?: ProviderCapability[];
}

type JsonRecord = Record<string, unknown>;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  token: string | null;
  onboarding: OnboardingState | null;
  providers: ProviderCapability[];
  clearAuthError: () => void;
  refreshSession: () => Promise<void>;
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

const asRecord = (value: unknown): JsonRecord => ((typeof value === "object" && value !== null ? value : {}) as JsonRecord);

const toAuthUser = (source: unknown, payload?: unknown): AuthUser => {
  const sourceRecord = asRecord(source);
  const payloadRecord = asRecord(payload);
  const sourceProfile = asRecord(sourceRecord.profile);
  const payloadOnboarding = asRecord(payloadRecord.onboarding);
  const payloadProviders = Array.isArray(payloadRecord.providers) ? payloadRecord.providers : [];
  const firstProvider = asRecord(payloadProviders[0]);

  return {
    id: String(
      sourceRecord.id ??
        sourceRecord._id ??
        sourceRecord.userId ??
        sourceRecord.sub ??
        sourceRecord.email ??
        "",
    ),
    email: (sourceRecord.email as string | null | undefined) ?? null,
    name:
      (sourceRecord.full_name as string | null | undefined) ??
      (sourceRecord.fullName as string | null | undefined) ??
      (sourceRecord.name as string | null | undefined) ??
      (sourceRecord.displayName as string | null | undefined) ??
      null,
    picture:
      (sourceRecord.picture as string | null | undefined) ??
      (sourceRecord.avatar as string | null | undefined) ??
      (sourceRecord.photoURL as string | null | undefined) ??
      null,
    providerId:
      (sourceRecord.providerId as string | null | undefined) ??
      (sourceRecord.provider as string | null | undefined) ??
      null,
    phone:
      (sourceRecord.phone as string | null | undefined) ??
      (sourceRecord.phoneNumber as string | null | undefined) ??
      null,
    company:
      (sourceRecord.company as string | null | undefined) ??
      (sourceRecord.companyName as string | null | undefined) ??
      (sourceProfile.company_name as string | null | undefined) ??
      (sourceProfile.companyName as string | null | undefined) ??
      null,
    country:
      (sourceRecord.country as string | null | undefined) ??
      (sourceProfile.country_code as string | null | undefined) ??
      (sourceProfile.countryCode as string | null | undefined) ??
      null,
    providerCode:
      (payloadOnboarding.selected_provider_code as string | null | undefined) ??
      (firstProvider.code as string | null | undefined) ??
      (sourceRecord.provider_code as string | null | undefined) ??
      null,
    profile: sourceProfile,
  };
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

const extractChallenge = (payload: unknown): AuthChallenge => {
  const record = asRecord(payload);

  return {
    message: (record.message as string | undefined) ?? "Verification code sent.",
    email: (record.email as string | undefined) ?? "",
    expiresInMinutes:
      (record.expires_in_minutes as number | null | undefined) ??
      (record.expiresInMinutes as number | null | undefined) ??
      null,
  };
};

const extractOnboarding = (source: unknown): OnboardingState | null => {
  const sourceRecord = asRecord(source);
  const onboarding = sourceRecord.onboarding;
  if (!onboarding) {
    return null;
  }

  const onboardingRecord = asRecord(onboarding);

  return {
    profile_completed: Boolean(onboardingRecord.profile_completed),
    selected_provider_code: (onboardingRecord.selected_provider_code as string | null | undefined) ?? null,
    selected_provider_account_status:
      (onboardingRecord.selected_provider_account_status as string | null | undefined) ?? null,
    provider_account_statuses:
      (onboardingRecord.provider_account_statuses as Record<string, unknown> | undefined) ?? {},
    next_action: (onboardingRecord.next_action as string | null | undefined) ?? null,
    message: (onboardingRecord.message as string | null | undefined) ?? null,
    redirect_url: (onboardingRecord.redirect_url as string | null | undefined) ?? null,
    status: (onboardingRecord.status as string | null | undefined) ?? null,
    action_type: (onboardingRecord.action_type as string | null | undefined) ?? null,
    metadata: (onboardingRecord.metadata as Record<string, unknown> | null | undefined) ?? null,
  };
};

const extractProviders = (source: unknown): ProviderCapability[] => {
  const sourceRecord = asRecord(source);
  const providers = sourceRecord.providers;
  return Array.isArray(providers) ? (providers as ProviderCapability[]) : [];
};

const extractSession = (payload: unknown): StoredSession => {
  const payloadRecord = asRecord(payload);
  const body = asRecord(payloadRecord.data ?? payloadRecord);
  const userSource = body.user ?? body.profile ?? body;
  const token =
    (body.token as string | null | undefined) ??
    (body.accessToken as string | null | undefined) ??
    (body.access_token as string | null | undefined) ??
    (body.jwt as string | null | undefined) ??
    (asRecord(body.data).token as string | null | undefined) ??
    null;

  const user = toAuthUser(userSource, body);

  if (!user.id) {
    throw new Error("Auth API response is missing user data");
  }

  return {
    user,
    token,
    onboarding: extractOnboarding(body),
    providers: extractProviders(body),
  };
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

  if (window.google?.accounts?.id) {
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
    const googleId = window.google?.accounts?.id;
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
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null);
  const [providers, setProviders] = useState<ProviderCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const applySession = (session: StoredSession) => {
    saveSession(session);
    setUser(session.user);
    setToken(session.token ?? null);
    setOnboarding(session.onboarding ?? null);
    setProviders(session.providers ?? []);
    setAuthError(null);
  };

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!token) {
      return;
    }

    const payload = await requestApi(endpointConfig.me, { method: "GET", token });
    const refreshed = extractSession(payload);
    applySession({
      user: refreshed.user,
      token: refreshed.token ?? token,
      onboarding: refreshed.onboarding,
      providers: refreshed.providers,
    });
  }, [token]);

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
            onboarding: refreshed.onboarding ?? parsed.onboarding ?? null,
            providers: refreshed.providers?.length ? refreshed.providers : parsed.providers ?? [],
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
        onboarding: session.onboarding,
        providers: session.providers?.length ? session.providers : providers,
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
    setOnboarding(null);
    setProviders([]);
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
        onboarding,
        providers,
        clearAuthError,
        refreshSession,
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
