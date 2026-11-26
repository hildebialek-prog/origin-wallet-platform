import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { customerUnauthorizedEvent, requestApi } from "@/services/apiClient";
import { AuthFailure, newClientBinding, readChallenge, readRecoveryCodes, requestCustomerAuth,
  type AuthAction, type AuthChallenge, type AuthResult, type AuthResponse, type SecurityStatus } from "@/services/customerAuth";
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  providerId: string | null;
  status?: string | null;
  kycStatus?: string | null;
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
  logo_url?: string | null;
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
  internal_kyc_verified?: boolean;
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

interface EmailChallenge { message: string; email: string; expiresInMinutes?: number | null }

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


interface SessionData {
  user: AuthUser;
  token?: string | null;
  onboarding?: OnboardingState | null;
  providers?: ProviderCapability[];
}
interface Registration {
  email: string;
  binding: string;
  version: string;
  expiresAt: number;
  verified: boolean;
}
type JsonRecord = Record<string, unknown>;
const endpointConfig = {
  profile: import.meta.env.VITE_AUTH_PROFILE_PATH || "/auth/profile",
};



export const customerAuthStorageKey = "origin-wallet-auth-session";
export const customerSessionVersion = 2;
interface StoredSession extends SessionData { version: number; created_at: string; token: string }
export type SecurityIntent = "replace_authenticator" | "regenerate_recovery_codes";
export interface Ceremony {
  binding: string;
  challenge: AuthChallenge;
  expiresAt: number;
  qrSvg?: string;
  manualKey?: string;
  supportRequired?: boolean;
  resendAt?: number;
  intent?: SecurityIntent;
}
interface AuthContextType {
  onboarding: OnboardingState | null;
  providers: ProviderCapability[];
  registration: Registration | null;
  register: (payload: RegisterPayload) => Promise<void>;
  verifyRegister: (email: string, verificationCode: string) => Promise<boolean>;
  leaveRegistration: () => void;
  requestPasswordReset: (email: string) => Promise<EmailChallenge>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  signInWithGoogle: (idToken?: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  authError: string | null;
  notice: string;
  busy: boolean;
  retryAt: number;
  ceremony: Ceremony | null;
  recoveryCodes: string[];
  clearAuthError: () => void;
  login: (email: string, password: string) => Promise<void>;
  submitProof: (proof: string) => Promise<void>;
  resendIdentity: () => Promise<void>;
  startRecovery: () => Promise<void>;
  assistedRecovery: (email: string) => Promise<void>;
  cancelCeremony: () => void;
  leaveSecurity: () => void;
  acknowledgeCodes: () => void;
  startStepUp: (password: string, intent: SecurityIntent) => Promise<void>;
  getSecurity: () => Promise<SecurityStatus>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const isCustomerUser = (value: unknown): value is AuthUser => {
  if (!value || typeof value !== "object") return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === "string" && !!user.id.trim() && typeof user.email === "string"
    && !!user.email.trim() && (typeof user.name === "string" || user.name === null);
};
export const parseCustomerSession = (value: string | null): StoredSession | null => {
  try {
    const session = JSON.parse(value ?? "null") as StoredSession | null;
    const created = Date.parse(session?.created_at ?? "");
    return session?.version === customerSessionVersion && Number.isFinite(created) && created <= Date.now()
      && typeof session.token === "string" && !!session.token.trim() && isCustomerUser(session.user) ? session : null;
  } catch { return null; }
};
const clearStoredSession = () => {
  localStorage.removeItem(customerAuthStorageKey);
  sessionStorage.removeItem(customerAuthStorageKey);
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
    status: (sourceRecord.status as string | null | undefined) ?? null,
    kycStatus:
      (sourceRecord.kyc_status as string | null | undefined) ??
      (sourceRecord.kycStatus as string | null | undefined) ??
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

const extractOnboarding = (source: unknown): OnboardingState | null => {
  const sourceRecord = asRecord(source);
  const onboarding = sourceRecord.onboarding;
  if (!onboarding) {
    return null;
  }

  const onboardingRecord = asRecord(onboarding);

  return {
    profile_completed: Boolean(onboardingRecord.profile_completed),
    internal_kyc_verified: Boolean(onboardingRecord.internal_kyc_verified),
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

const extractSession = (payload: unknown): SessionData => {
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


const makeSession = (payload: AuthResponse, token: string): StoredSession => {
  const wire = asRecord(payload.user);
  if (!Number.isInteger(wire.id) || Number(wire.id) <= 0 || typeof wire.email !== "string"
    || !wire.email.trim() || typeof wire.full_name !== "string" || !token.trim()) {
    throw new AuthFailure(401, "Account session validation failed. Sign in again.");
  }
  return { ...extractSession(payload), version: customerSessionVersion, created_at: new Date().toISOString(), token };
};
const discardResult = (result: AuthResult, binding: string) => {
  if (result.token) void requestCustomerAuth("logout", { token: result.token, body: {} }).catch(() => undefined);
  if (result.challenge_token) void requestCustomerAuth("challenges/cancel", {
    binding, body: { challenge_token: result.challenge_token },
  }).catch(() => undefined);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const registrationRef = useRef<Registration | null>(null);
  const changeRegistration = useCallback((value: Registration | null) => {
    registrationRef.current = value;
    setRegistration(value);
  }, []);
  const [session, setSession] = useState<StoredSession | null>(null);
  const sessionRef = useRef<StoredSession | null>(null);
  const user = session?.user ?? null;
  const token = session?.token ?? null;
  const providers = session?.providers ?? [];
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const retryRef = useRef(0);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  const ceremonyRef = useRef<Ceremony | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const pendingSession = useRef<StoredSession | null>(null);
  const generation = useRef(0);
  const flight = useRef<object | null>(null);

  const changeCeremony = useCallback((value: Ceremony | null) => {
    ceremonyRef.current = value;
    setCeremony(value);
  }, []);
  const applySession = useCallback((value: StoredSession | null) => {
    clearStoredSession();
    if (value) sessionStorage.setItem(customerAuthStorageKey, JSON.stringify(value));
    sessionRef.current = value;
    setSession(value);
  }, []);
  const cancelCeremony = useCallback(() => {
    generation.current++;
    changeRegistration(null);
    const old = ceremonyRef.current;
    const pending = pendingSession.current;
    changeCeremony(null);
    pendingSession.current = null;
    setRecoveryCodes([]);
    flight.current = null;
    setBusy(false);
    setAuthError(null);
    setNotice("");
    if (old) discardResult(old.challenge, old.binding);
    if (pending) discardResult({ token: pending.token }, "");
  }, [changeCeremony, changeRegistration]);
  const clearAll = useCallback(() => {
    cancelCeremony();
    applySession(null);
  }, [applySession, cancelCeremony]);
  const leaveSecurity = useCallback(() => {
    // Read synchronous refs: a route guard can remove Security before the child
    // renders the new context. Preserve only a completion transferring to Login.
    if (!sessionRef.current && pendingSession.current) return;
    cancelCeremony();
  }, [cancelCeremony]);
  const leaveRegistration = useCallback(() => {
    if (!registrationRef.current?.verified) cancelCeremony();
  }, [cancelCeremony]);
  const clearAuthError = useCallback(() => setAuthError(null), []);

  // Single flight and a generation check at every network boundary prevent stale
  // completions from authenticating after cancel, logout, expiry or unmount.
  const run = useCallback(async <T,>(task: (call: (path: string, body?: Record<string, unknown>,
    binding?: string, token?: string) => Promise<AuthResult>) => Promise<T>) => {
    if (flight.current || loading || Date.now() < retryRef.current) return;
    const owner = {};
    flight.current = owner;
    const epoch = generation.current;
    setBusy(true);
    setAuthError(null);
    setNotice("");
    const call = async (path: string, body?: Record<string, unknown>, binding = "", token?: string) => {
      if (generation.current !== epoch) throw new Error("cancelled");
      const result = await requestCustomerAuth(path, { body, binding, token, method: path === "me" ? "GET" : "POST" });
      if (generation.current !== epoch) {
        discardResult(result, binding);
        throw new Error("cancelled");
      }
      return result;
    };
    try { return await task(call); }
    catch (error) {
      if (generation.current !== epoch) return;
      // Backend 422 intentionally does not distinguish bad proof from a
      // consumed/revoked challenge. Require a fresh ceremony in either case.
      const failure = error instanceof AuthFailure ? error : new AuthFailure(0, "Authentication could not be completed. Restart sign-in.");
      cancelCeremony();
      if ([401, 403].includes(failure.status)) applySession(null);
      setAuthError(failure.message);
      if (failure.retryAt) { retryRef.current = failure.retryAt; setRetryAt(failure.retryAt); }
    } finally {
      if (flight.current === owner) { flight.current = null; setBusy(false); }
    }
  }, [applySession, cancelCeremony, loading]);

  const acceptChallenge = useCallback((result: AuthResult, binding: string, allowed: AuthAction[], intent?: SecurityIntent) => {
    try {
      const challenge = readChallenge(result);
      if (!allowed.includes(challenge.next_action)) throw new AuthFailure(422, "The authentication transition is invalid. Restart sign-in.");
      changeCeremony({ binding, challenge, expiresAt: Date.now() + challenge.expires_in_seconds * 1000, intent });
    } catch (error) { discardResult(result, binding); throw error; }
  }, [changeCeremony]);

  const login = useCallback(async (email: string, password: string) => {
    await run(async call => {
      const verified = registrationRef.current;
      const binding = verified?.verified && verified.email === email && verified.expiresAt > Date.now()
        ? verified.binding : newClientBinding();
      const result = await call("login", { email, password, client_binding: binding }, binding);
      acceptChallenge(result, binding, ["totp_required", "enrollment_identity_required"]);
      changeRegistration(null);
      if (result.next_action === "enrollment_identity_required") {
        const methods = await call("enrollment/identity/request", { challenge_token: result.challenge_token }, binding);
        if (methods.challenge_token) acceptChallenge(methods, binding, ["enrollment_ready"]);
        else {
          if (methods.token || methods.next_action !== "enrollment_identity_required" || !Array.isArray(methods.methods)
            || !methods.methods.every(method => typeof method === "string")) {
            discardResult(methods, binding);
            throw new AuthFailure(422, "The enrollment authorization response is invalid. Restart sign-in.");
          }
          changeCeremony({ ...ceremonyRef.current!, supportRequired: methods.support_required,
            resendAt: Date.now() + (methods.resend_after_seconds ?? 120) * 1000,
            expiresAt: Math.min(ceremonyRef.current!.expiresAt, Date.now() + (methods.proof_expires_in_seconds ?? Number.POSITIVE_INFINITY) * 1000),
            challenge: { ...ceremonyRef.current!.challenge, methods: methods.methods } });
        }
      }
    });
  }, [acceptChallenge, changeCeremony, changeRegistration, run]);

  const startRecovery = useCallback(async () => {
    await run(async call => {
      const current = ceremonyRef.current;
      if (!current || current.challenge.next_action !== "totp_required") return;
      acceptChallenge(await call("recovery/start", { challenge_token: current.challenge.challenge_token }, current.binding), current.binding, ["recovery_required"]);
    });
  }, [acceptChallenge, run]);

  const resendIdentity = useCallback(async () => {
    await run(async call => {
      const current = ceremonyRef.current;
      if (!current || current.challenge.next_action !== "enrollment_identity_required"
        || current.supportRequired || !current.challenge.methods.includes("enrollment_email_proof")
        || Date.now() < (current.resendAt ?? 0)) return;
      const result = await call("enrollment/identity/request", { challenge_token: current.challenge.challenge_token }, current.binding);
      if (result.token || result.challenge_token || result.next_action !== "enrollment_identity_required"
        || !result.methods?.includes("enrollment_email_proof")) {
        discardResult(result, current.binding);
        throw new AuthFailure(422, "Email ownership verification is unavailable. Restart sign-in or contact support.");
      }
      changeCeremony({ ...current, resendAt: Date.now() + (result.resend_after_seconds ?? 120) * 1000 });
    });
  }, [changeCeremony, run]);

  const submitProof = useCallback(async (proof: string) => {
    await run(async call => {
      const current = ceremonyRef.current;
      if (!current || current.expiresAt <= Date.now()) throw new AuthFailure(422, "Authentication challenge expired. Restart sign-in.");
      const { challenge, binding, intent } = current;
      const bound = { challenge_token: challenge.challenge_token };
      const action = challenge.next_action;
      if (["totp_required", "step_up_required"].includes(action) || current.manualKey) {
        if (!/^\d{6}$/.test(proof)) throw new AuthFailure(422, "Enter a six-digit authenticator code.");
      }
      if (action === "enrollment_identity_required" || action === "recovery_required") {
        const path = action === "recovery_required" ? "recovery/verify" : "enrollment/identity/verify";
        acceptChallenge(await call(path, { ...bound, [action === "enrollment_identity_required" ? "identity_proof" : "recovery_code"]: proof }, binding), binding,
          [action === "recovery_required" ? "replacement_required" : "enrollment_ready"]);
        return;
      }
      if (action === "step_up_required") {
        acceptChallenge(await call("security/step-up/verify", { ...bound, totp_code: proof }, binding, sessionRef.current?.token), binding,
          [intent === "replace_authenticator" ? "replacement_required" : "step_up_complete"], intent);
        return;
      }
      if (action === "step_up_complete") {
        const result = await call("recovery-codes/regenerate", bound, binding, sessionRef.current?.token);
        const codes = readRecoveryCodes(result);
        changeCeremony(null);
        setRecoveryCodes(codes);
        return;
      }
      if ((action === "enrollment_ready" || action === "replacement_required") && !current.manualKey) {
        const result = await call(action === "enrollment_ready" ? "enrollment/setup" : "totp/replacement/setup", bound, binding);
        const next = readChallenge(result);
        if (next.next_action !== action || next.challenge_token !== challenge.challenge_token || !result.manual_key || !result.qr_svg) {
          discardResult(result, binding);
          throw new AuthFailure(0, "Authenticator setup is unavailable. Restart sign-in.");
        }
        changeCeremony({ ...current, challenge: next, expiresAt: Math.min(current.expiresAt, Date.now() + next.expires_in_seconds * 1000),
          manualKey: result.manual_key, qrSvg: result.qr_svg });
        return;
      }
      const path = action === "totp_required" ? "login/verify" : action === "enrollment_ready" ? "enrollment/confirm" : "totp/replacement/confirm";
      const result = await call(path, { ...bound, totp_code: proof }, binding);
      if (!result.token || result.next_action) throw new AuthFailure(401, "A full Account session was not returned. Restart sign-in.");
      // Track immediately so cancellation or failed /me validation can revoke it.
      pendingSession.current = { version: customerSessionVersion, created_at: new Date().toISOString(), token: result.token, user: toAuthUser(result.user, result) };
      if (action === "replacement_required") applySession(null);
      const me = await call("me", undefined, "", result.token);
      const validated = makeSession(me as AuthResponse, result.token);
      changeCeremony(null);
      if (action !== "totp_required") {
        const codes = readRecoveryCodes(result);
        pendingSession.current = validated;
        setRecoveryCodes(codes);
      } else {
        pendingSession.current = null;
        applySession(validated);
      }
    });
  }, [acceptChallenge, applySession, changeCeremony, run]);

  const acknowledgeCodes = useCallback(() => {
    if (!recoveryCodes.length) return;
    const pending = pendingSession.current;
    pendingSession.current = null;
    setRecoveryCodes([]);
    if (pending) applySession(pending);
  }, [applySession, recoveryCodes]);
  const assistedRecovery = useCallback(async (email: string) => {
    await run(async call => {
      await call("recovery/request", { email });
      setNotice("Contact your established Origin Wallet support channel. Automatic recovery is unavailable. This does not approve recovery or create a support ticket.");
    });
  }, [run]);
  const startStepUp = useCallback(async (password: string, intent: SecurityIntent) => {
    await run(async call => {
      const binding = newClientBinding();
      acceptChallenge(await call("security/step-up", { password, intent, client_binding: binding }, binding, sessionRef.current?.token), binding, ["step_up_required"], intent);
    });
  }, [acceptChallenge, run]);
  const getSecurity = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) throw new AuthFailure(401, "Sign in again to view security status.");
    try {
      return await requestCustomerAuth<SecurityStatus>("security", { method: "GET", token: current.token });
    } catch (error) {
      if (error instanceof AuthFailure && [401, 403].includes(error.status) && sessionRef.current?.token === current.token) clearAll();
      if (error instanceof AuthFailure && error.retryAt && sessionRef.current?.token === current.token) {
        retryRef.current = error.retryAt;
        setRetryAt(error.retryAt);
      }
      throw error;
    }
  }, [clearAll]);
  const refreshSession = useCallback(async () => {
    const current = sessionRef.current;
    const epoch = generation.current;
    if (!current) return;
    try {
      const payload = await requestCustomerAuth<AuthResponse>("me", { method: "GET", token: current.token });
      if (generation.current === epoch && sessionRef.current?.token === current.token) applySession(makeSession(payload, current.token));
    } catch {
      if (generation.current === epoch && sessionRef.current?.token === current.token) { clearAll(); setAuthError("Your Account session could not be validated. Sign in again."); }
    }
  }, [applySession, clearAll]);
  const logout = useCallback(async () => {
    const previous = sessionRef.current?.token;
    clearAll();
    if (previous) await requestCustomerAuth("logout", { token: previous, body: {} }).catch(() => undefined);
  }, [clearAll]);


  const register = useCallback(async ({ email, phone, fullName, password, passwordConfirmation }: RegisterPayload) => {
    await run(async call => {
      const binding = newClientBinding();
      const result = await call("register", { email, phone, full_name: fullName, password,
        password_confirmation: passwordConfirmation, client_binding: binding }, binding);
      if (result.token || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(result.registration_version ?? "")
        || !Number.isFinite(result.expires_in_minutes) || Number(result.expires_in_minutes) <= 0) {
        discardResult(result, binding);
        throw new AuthFailure(422, "Registration could not be started. Try again.");
      }
      changeRegistration({ email, binding, version: result.registration_version!, verified: false,
        expiresAt: Date.now() + Number(result.expires_in_minutes) * 60000 });
      setNotice("If registration can proceed, check your verification email.");
    });
  }, [changeRegistration, run]);

  const verifyRegister = useCallback(async (email: string, verificationCode: string) => {
    const completed = await run(async call => {
      const current = registrationRef.current;
      if (!current || current.email !== email || current.verified || current.expiresAt <= Date.now() || !/^\d{6}$/.test(verificationCode)) {
        throw new AuthFailure(422, "Registration verification is unavailable or expired. Restart registration.");
      }
      const result = await call("register/verify", { email, verification_code: verificationCode,
        registration_version: current.version, client_binding: current.binding }, current.binding);
      // Only a restricted, original-browser enrollment capability is accepted.
      acceptChallenge(result, current.binding, ["enrollment_ready"]);
      changeRegistration(null);
      setNotice("Email verified. Set up Google Authenticator to complete registration.");
      return true;
    });
    return completed === true;
  }, [acceptChallenge, changeRegistration, run]);

  const requestPasswordReset = useCallback(async (email: string): Promise<EmailChallenge> => {
    const result = await run(async call => {
      const payload = await call("forgot-password", { email });
      if (payload.token) {
        discardResult(payload, "");
        throw new AuthFailure(422, "Password reset cannot create a session. Return to sign in.");
      }
      return { email, message: "If the account is eligible, check your email for a password reset code." };
    });
    if (!result) throw new AuthFailure(0, "Password reset request was not completed.");
    return result;
  }, [run]);

  const resetPassword = useCallback(async ({ email, verificationCode, password, passwordConfirmation }: ResetPasswordPayload) => {
    const result = await run(async call => {
      const payload = await call("reset-password", { email, verification_code: verificationCode,
        password, password_confirmation: passwordConfirmation });
      clearAll();
      if (payload.token) {
        discardResult(payload, "");
        throw new AuthFailure(422, "Password reset cannot create a session. Return to sign in.");
      }
      return "Password reset successful. Sign in with your new password and authenticator.";
    });
    if (!result) throw new AuthFailure(0, "Password reset was not completed.");
    return result;
  }, [clearAll, run]);

  const signInWithGoogle = useCallback(async (_idToken?: string): Promise<void> => {
    const failure = new AuthFailure(410, "Google sign-in is currently unavailable. Use email and password, then your authenticator.");
    setAuthError(failure.message);
    throw failure;
  }, []);

  const updatePassword = async (_payload: UpdatePasswordPayload): Promise<void> => {
    throw new AuthFailure(410, "Password changes in Settings are unavailable. Use password reset by email; your authenticator remains required.");
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

      if (sessionRef.current?.token !== token) return;
      const session = extractSession(payload);
      applySession({
        ...sessionRef.current!,
        user: {
          ...user,
          ...session.user,
          email: session.user.email ?? (email.trim() || user.email),
        },
        token: sessionRef.current!.token,
        onboarding: session.onboarding,
        providers: session.providers?.length ? session.providers : providers,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update profile";
      setAuthError(message);
      throw error;
    }
  };


  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      const rejectedToken = (event as CustomEvent<{ token?: string }>).detail?.token;
      if (rejectedToken && rejectedToken === sessionRef.current?.token) {
        clearAll();
        setAuthError("Your account session is no longer eligible. Sign in again.");
      }
    };
    window.addEventListener(customerUnauthorizedEvent, handleUnauthorized);
    return () => window.removeEventListener(customerUnauthorizedEvent, handleUnauthorized);
  }, [clearAll]);
  useEffect(() => {
    let active = true;
    const epoch = generation.current;
    localStorage.removeItem(customerAuthStorageKey);
    const stored = parseCustomerSession(sessionStorage.getItem(customerAuthStorageKey));
    clearStoredSession();
    void (async () => {
      try {
        if (stored) {
          const payload = await requestCustomerAuth<AuthResponse>("me", { method: "GET", token: stored.token });
          if (active && generation.current === epoch) applySession(makeSession(payload, stored.token));
        }
      } catch { if (active && generation.current === epoch) clearAll(); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; cancelCeremony(); };
  }, [applySession, cancelCeremony, clearAll]);
  useEffect(() => {
    if (!ceremony) return;
    const timer = window.setTimeout(() => {
      cancelCeremony();
      setAuthError("Authentication challenge expired. Restart sign-in.");
    }, Math.max(0, ceremony.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [cancelCeremony, ceremony]);

  useEffect(() => {
    if (!registration) return;
    const timer = window.setTimeout(() => {
      cancelCeremony();
      setAuthError("Registration verification expired. Restart registration or sign in for the supported enrollment options.");
    }, Math.max(0, registration.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [cancelCeremony, registration]);

  const value = useMemo(() => ({ onboarding: session?.onboarding ?? null, providers: session?.providers ?? [], registration,
    register, verifyRegister, leaveRegistration, requestPasswordReset, resetPassword, signInWithGoogle, updateProfile, updatePassword, user: session?.user ?? null, token: session?.token ?? null, loading,
    authError, notice, busy, retryAt, ceremony, recoveryCodes, clearAuthError, login, submitProof,
    startRecovery, resendIdentity, assistedRecovery, cancelCeremony, leaveSecurity, acknowledgeCodes, startStepUp, getSecurity, logout, refreshSession }),
  [session, registration, register, verifyRegister, leaveRegistration, requestPasswordReset, resetPassword, signInWithGoogle, updateProfile, updatePassword, loading, authError, notice, busy, retryAt, ceremony, recoveryCodes, clearAuthError, login, submitProof,
    startRecovery, resendIdentity, assistedRecovery, cancelCeremony, leaveSecurity, acknowledgeCodes, startStepUp, getSecurity, logout, refreshSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
