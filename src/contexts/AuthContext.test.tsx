import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, customerAuthStorageKey, customerSessionVersion, parseCustomerSession, useAuth } from "@/contexts/AuthContext";
import { requestApi } from "@/services/apiClient";
import type { AuthAction } from "@/services/customerAuth";

const customerUser = {
  id: 7, email: "customer@example.test", phone: null, full_name: "Customer User",
  status: "active", kyc_status: "approved", profile: null, roles: ["customer"],
};
const mappedUser = { id: "7", email: customerUser.email, name: customerUser.full_name, picture: null, providerId: null };
const capability = "a".repeat(64);
const nextCapability = "b".repeat(64);
const replacementCapability = "c".repeat(64);
const recoveryCodes = Array.from({ length: 10 }, (_, index) => "synthetic-recovery-" + index);
const challenge = (next_action: AuthAction = "totp_required", token = capability, seconds = 300) => ({
  next_action, challenge_token: token, expires_in_seconds: seconds, methods: next_action === "totp_required" ? ["totp", "recovery_code"] : [],
});
const response = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
const storedSession = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  version: customerSessionVersion, created_at: new Date(Date.now() - 1000).toISOString(), token: "customer-token", user: mappedUser, ...overrides,
});
const requests = () => vi.mocked(fetch).mock.calls.map(([url, init]) => ({
  url: String(url), init, body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined,
}));
const mountAuth = async () => {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};
type AuthHook = Awaited<ReturnType<typeof mountAuth>>;
const beginLogin = async (hook: AuthHook) => {
  vi.mocked(fetch).mockResolvedValueOnce(response(challenge()));
  await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
};
const beginEnrollment = async (hook: AuthHook, pending = false) => {
  vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
    .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: pending ? [] : ["operator_grant"], policy_pending: pending }));
  await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
};
const expectNoSession = (hook: AuthHook) => {
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.token).toBeNull();
  expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
  expect(localStorage.getItem(customerAuthStorageKey)).toBeNull();
};

describe("Customer mandatory MFA state and session isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({ user: customerUser }));
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("sends a 32-byte binding with password login and never authenticates a restricted challenge", async () => {
    const hook = await mountAuth();
    await beginLogin(hook);
    expectNoSession(hook);
    const request = requests()[0];
    expect(request.body).toEqual({ email: customerUser.email, password: "synthetic-password", client_binding: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(hook.result.current.ceremony?.challenge.next_action).toBe("totp_required");
    expect(requests().some(item => item.url.includes("resend"))).toBe(false);
    expect(JSON.stringify(sessionStorage)).not.toContain(capability);
  });

  it("preserves a leading-zero TOTP and persists only after completed MFA and GET Customer /me", async () => {
    const hook = await mountAuth();
    await beginLogin(hook);
    let resolveMe!: (value: Response) => void;
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "verified-token", user: customerUser }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveMe = resolve; }));
    let verification!: Promise<void>;
    act(() => { verification = hook.result.current.submitProof("000123"); });
    await waitFor(() => expect(resolveMe).toBeTypeOf("function"));
    expectNoSession(hook);
    const verify = requests().find(item => item.url.endsWith("/login/verify"))!;
    expect(verify.body).toEqual({ challenge_token: capability, totp_code: "000123" });
    expect(verify.init?.headers).toMatchObject({ "X-Auth-Client-Binding": hook.result.current.ceremony?.binding });
    expect(requests().find(item => item.url.endsWith("/me"))?.init).toMatchObject({ method: "GET", headers: { Authorization: "Bearer verified-token" } });
    await act(async () => { resolveMe(response({ user: customerUser })); await verification; });
    expect(hook.result.current.user?.email).toBe(customerUser.email);
    expect(sessionStorage.getItem(customerAuthStorageKey)).toContain("verified-token");
    expect(localStorage.getItem(customerAuthStorageKey)).toBeNull();
    expect(hook.result.current.ceremony).toBeNull();
  });

  it.each([401, 403])("refuses a completed token when Customer /me rejects it with %s", async status => {
    const hook = await mountAuth();
    await beginLogin(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "ineligible-token", user: customerUser }))
      .mockResolvedValueOnce(response({ message: "Denied" }, status));
    await act(async () => hook.result.current.submitProof("123456"));
    expectNoSession(hook);
    expect(requests().some(item => item.url.endsWith("/logout") && (item.init?.headers as Record<string, string>)?.Authorization === "Bearer ineligible-token")).toBe(true);
  });

  it("does not accept a password endpoint response containing a full token as a challenge", async () => {
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge(), token: "unexpected-token", user: customerUser }));
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    expectNoSession(hook);
    expect(hook.result.current.authError).toContain("invalid");
  });

  it("requires backend-approved Customer enrollment authorization before provisioning", async () => {
    const hook = await mountAuth();
    await beginEnrollment(hook, true);
    expectNoSession(hook);
    expect(hook.result.current.ceremony?.policyPending).toBe(true);
    expect(hook.result.current.ceremony?.manualKey).toBeUndefined();
    expect(requests().some(item => item.url.endsWith("/enrollment/setup"))).toBe(false);
    expect(requests().some(item => item.body && "identity_proof" in item.body)).toBe(false);
  });

  it("enrolls using an operator grant, backend QR/key and TOTP, holding codes/token until save acknowledgment", async () => {
    const hook = await mountAuth();
    await beginEnrollment(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", nextCapability)));
    await act(async () => hook.result.current.submitProof("d".repeat(64), true));
    expect(requests().find(item => item.url.endsWith("/identity/verify"))?.body).toEqual({ challenge_token: capability, grant_token: "d".repeat(64) });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("enrollment_ready", nextCapability), qr_svg: "<svg/>", manual_key: "SYNTHETICKEY" }));
    await act(async () => hook.result.current.submitProof(""));
    expect(hook.result.current.ceremony?.manualKey).toBe("SYNTHETICKEY");
    expectNoSession(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "enrolled-token", user: customerUser, recovery_codes: recoveryCodes }))
      .mockResolvedValueOnce(response({ user: customerUser }));
    await act(async () => hook.result.current.submitProof("000123"));
    expectNoSession(hook);
    expect(hook.result.current.ceremony).toBeNull();
    expect(hook.result.current.recoveryCodes).toEqual(recoveryCodes);
    act(() => hook.result.current.acknowledgeCodes());
    expect(hook.result.current.user?.email).toBe(customerUser.email);
    expect(hook.result.current.recoveryCodes).toEqual([]);
    expect(sessionStorage.getItem(customerAuthStorageKey)).not.toContain("SYNTHETICKEY");
    expect(sessionStorage.getItem(customerAuthStorageKey)).not.toContain("synthetic-recovery");
  });

  it.each([false, true])("authorizes replacement only with a recovery code or approved grant (grant=%s)", async grant => {
    const hook = await mountAuth();
    await beginLogin(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("recovery_required", nextCapability)));
    await act(async () => hook.result.current.startRecovery());
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("replacement_required", replacementCapability)));
    await act(async () => hook.result.current.submitProof(grant ? "d".repeat(64) : "synthetic-backup", grant));
    expect(requests().find(item => item.url.endsWith("/recovery/verify"))?.body).toEqual({
      challenge_token: nextCapability, [grant ? "grant_token" : "recovery_code"]: grant ? "d".repeat(64) : "synthetic-backup",
    });
    expectNoSession(hook);
    expect(hook.result.current.ceremony?.challenge.challenge_token).toBe(replacementCapability);
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("replacement_required", replacementCapability), qr_svg: "<svg/>", manual_key: "NEWKEY" }));
    await act(async () => hook.result.current.submitProof(""));
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "replaced-token", user: customerUser, recovery_codes: recoveryCodes }))
      .mockResolvedValueOnce(response({ user: customerUser }));
    await act(async () => hook.result.current.submitProof("000123"));
    expectNoSession(hook);
    expect(hook.result.current.recoveryCodes).toEqual(recoveryCodes);
    act(() => hook.result.current.acknowledgeCodes());
    expect(hook.result.current.token).toBe("replaced-token");
  });

  it.each(["replace_authenticator", "regenerate_recovery_codes"] as const)("binds password/TOTP step-up to the initiating token and intent %s", async intent => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("step_up_required")));
    await act(async () => hook.result.current.startStepUp("synthetic-password", intent));
    const start = requests().find(item => item.url.endsWith("/security/step-up"))!;
    expect(start.body).toMatchObject({ password: "synthetic-password", intent, client_binding: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(start.init?.headers).toMatchObject({ Authorization: "Bearer customer-token" });
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge(intent === "replace_authenticator" ? "replacement_required" : "step_up_complete", nextCapability)));
    await act(async () => hook.result.current.submitProof("000123"));
    const verify = requests().find(item => item.url.endsWith("/step-up/verify"))!;
    expect(verify.init?.headers).toMatchObject({ Authorization: "Bearer customer-token", "X-Auth-Client-Binding": start.body?.client_binding });
    if (intent === "regenerate_recovery_codes") {
      vi.mocked(fetch).mockResolvedValueOnce(response({ recovery_codes: recoveryCodes }));
      await act(async () => hook.result.current.submitProof(""));
      expect(hook.result.current.recoveryCodes).toEqual(recoveryCodes);
      expect(hook.result.current.token).toBe("customer-token");
      expect(requests().find(item => item.url.endsWith("/recovery-codes/regenerate"))?.body).toEqual({ challenge_token: nextCapability });
      act(() => hook.result.current.acknowledgeCodes());
      expect(hook.result.current.recoveryCodes).toEqual([]);
    } else {
      expect(hook.result.current.ceremony?.challenge.next_action).toBe("replacement_required");
    }
  });

  it("records assisted intake without authenticating or claiming approval/ticket creation", async () => {
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Recovery request recorded." }, 202));
    await act(async () => hook.result.current.assistedRecovery("unknown@example.com"));
    expectNoSession(hook);
    expect(hook.result.current.notice).toContain("established Origin Wallet support channel");
    expect(hook.result.current.notice).toContain("does not approve recovery or create a support ticket");
  });

  it("revokes an enrollment completion when its recovery codes are discarded", async () => {
    const hook = await mountAuth();
    await beginEnrollment(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", nextCapability)));
    await act(async () => hook.result.current.submitProof("d".repeat(64), true));
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("enrollment_ready", nextCapability), qr_svg: "<svg/>", manual_key: "SYNTHETICKEY" }));
    await act(async () => hook.result.current.submitProof(""));
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "discarded-token", user: customerUser, recovery_codes: recoveryCodes }))
      .mockResolvedValueOnce(response({ user: customerUser }));
    await act(async () => hook.result.current.submitProof("123456"));
    expect(hook.result.current.recoveryCodes).toHaveLength(10);
    act(() => hook.result.current.cancelCeremony());
    act(() => hook.result.current.acknowledgeCodes());
    expectNoSession(hook);
    expect(hook.result.current.recoveryCodes).toEqual([]);
    expect(requests().some(item => item.url.endsWith("/logout") && (item.init?.headers as Record<string, string>)?.Authorization === "Bearer discarded-token")).toBe(true);
  });

  it("fails closed if activation succeeds but its one-time code response is incomplete", async () => {
    const hook = await mountAuth();
    await beginEnrollment(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", nextCapability)));
    await act(async () => hook.result.current.submitProof("d".repeat(64), true));
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("enrollment_ready", nextCapability), qr_svg: "<svg/>", manual_key: "SYNTHETICKEY" }));
    await act(async () => hook.result.current.submitProof(""));
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "incomplete-token", user: customerUser, recovery_codes: ["only-one"] }))
      .mockResolvedValueOnce(response({ user: customerUser }));
    await act(async () => hook.result.current.submitProof("123456"));
    expectNoSession(hook);
    expect(hook.result.current.authError).toContain("Recovery codes were not received");
    expect(hook.result.current.ceremony).toBeNull();
    expect(hook.result.current.recoveryCodes).toEqual([]);
  });

  it.each([422, 503, 500])("clears sensitive challenge state on %s without displaying raw errors", async status => {
    const hook = await mountAuth();
    await beginLogin(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "synthetic-secret-and-trace", trace: ["private"] }, status));
    await act(async () => hook.result.current.submitProof("123456"));
    expectNoSession(hook);
    expect(hook.result.current.ceremony).toBeNull();
    expect(hook.result.current.authError).not.toContain("synthetic-secret");
    if (status === 503) expect(hook.result.current.authError).toBe("Authentication service is unavailable.");
  });

  it("obeys Retry-After and blocks direct duplicate submissions during the cooldown", async () => {
    const hook = await mountAuth();
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(response({}, 429, { "Retry-After": "30" }));
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    expect(hook.result.current.retryAt).toBe(Date.now() + 30000);
    const count = requests().length;
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    expect(requests()).toHaveLength(count);
    act(() => vi.advanceTimersByTime(30000));
    await beginLogin(hook);
    expect(hook.result.current.ceremony).not.toBeNull();
  });

  it("expires challenges locally, erasing restricted capabilities and setup state", async () => {
    const hook = await mountAuth();
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("totp_required", capability, 1)));
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(hook.result.current.ceremony).toBeNull();
    expect(hook.result.current.authError).toContain("expired");
    expectNoSession(hook);
  });

  it("prevents duplicate requests and revokes a late challenge after cancellation", async () => {
    const hook = await mountAuth();
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let pending!: Promise<void>;
    act(() => { pending = hook.result.current.login(customerUser.email, "synthetic-password"); });
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    expect(requests().filter(item => item.url.endsWith("/login"))).toHaveLength(1);
    act(() => hook.result.current.cancelCeremony());
    await act(async () => { resolve(response(challenge())); await pending; });
    expectNoSession(hook);
    expect(hook.result.current.ceremony).toBeNull();
    expect(requests().some(item => item.url.endsWith("/challenges/cancel") && item.body?.challenge_token === capability)).toBe(true);
  });

  it("does not resurrect a logged-out session from an in-flight MFA completion", async () => {
    const hook = await mountAuth();
    await beginLogin(hook);
    let resolve!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    let pending!: Promise<void>;
    act(() => { pending = hook.result.current.submitProof("123456"); });
    await act(async () => hook.result.current.logout());
    await act(async () => { resolve(response({ token: "late-token", user: customerUser })); await pending; });
    expectNoSession(hook);
    expect(requests().some(item => item.url.endsWith("/logout") && (item.init?.headers as Record<string, string>)?.Authorization === "Bearer late-token")).toBe(true);
  });

  it("restores only after Customer me and retains the current onboarding/provider projections", async () => {
    const providers = [{ id: 1, code: "synthetic", name: "Synthetic provider", status: "active" }];
    const onboarding = { profile_completed: true, selected_provider_code: "synthetic", selected_provider_account_status: "pending", provider_account_statuses: {}, next_action: null, message: "Synthetic state" };
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    vi.mocked(fetch).mockResolvedValueOnce(response({ user: customerUser, onboarding, providers }));
    const hook = await mountAuth();
    expect(hook.result.current.user?.name).toBe(customerUser.full_name);
    expect(hook.result.current.onboarding).toMatchObject(onboarding);
    expect(hook.result.current.providers).toEqual(providers);
    expect(requests()[0].url).toContain("/auth/me");
    expect(requests()[0].init?.headers).toMatchObject({ Authorization: "Bearer customer-token" });
  });

  it.each([{ version: 1 }, { version: 999 }, { created_at: "invalid" }, { created_at: "2999-01-01" }, { token: "" }, { user: { email: customerUser.email } }])("rejects malformed/legacy stored sessions %j", async overrides => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession(overrides));
    const hook = await mountAuth();
    expectNoSession(hook);
    expect(fetch).not.toHaveBeenCalled();
    expect(parseCustomerSession(storedSession(overrides))).toBeNull();
  });

  it("removes legacy localStorage tokens instead of restoring them", async () => {
    localStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    expectNoSession(hook);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears saved sessions, challenges and one-time recovery codes on logout", async () => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("step_up_required")));
    await act(async () => hook.result.current.startStepUp("synthetic-password", "regenerate_recovery_codes"));
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("step_up_complete", nextCapability)));
    await act(async () => hook.result.current.submitProof("123456"));
    vi.mocked(fetch).mockResolvedValueOnce(response({ recovery_codes: recoveryCodes }));
    await act(async () => hook.result.current.submitProof(""));
    await act(async () => hook.result.current.logout());
    expectNoSession(hook);
    expect(hook.result.current.ceremony).toBeNull();
    expect(hook.result.current.recoveryCodes).toEqual([]);
  });

  it.each([401, 403])("clears a revoked session on 401 and preserves ownership-denied 403 (HTTP %s)", async status => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Unauthorized" }, status));
    await act(async () => { await expect(requestApi("/protected-resource", { token: "customer-token" })).rejects.toThrow("Unauthorized"); });
    if (status === 401) expectNoSession(hook);
    else expect(hook.result.current.token).toBe("customer-token");
  });

  it.each(["migration_email_proof", "registration_email_proof"])("uses restricted identity_proof for %s, with no normal-login email fallback", async method => {
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: [method], proof_expires_in_seconds: 120 }));
    await act(async () => hook.result.current.login(customerUser.email, "synthetic-password"));
    expectNoSession(hook);
    expect(hook.result.current.ceremony?.expiresAt).toBeLessThanOrEqual(Date.now() + 120000);
    const proof = method === "registration_email_proof" ? "000123" : "e".repeat(32);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", nextCapability)));
    await act(async () => hook.result.current.submitProof(proof));
    expect(requests().find(item => item.url.endsWith("/identity/verify"))?.body).toEqual({ challenge_token: capability, identity_proof: proof });
    expectNoSession(hook);
    expect(hook.result.current.ceremony?.challenge.next_action).toBe("enrollment_ready");
    expect(requests().some(item => item.url.endsWith("/login/verify") || item.url.endsWith("/login/resend"))).toBe(false);
  });

  it("registers and verifies email without a session, then reuses verified browser binding with fresh credentials", async () => {
    const hook = await mountAuth();
    const version = "11111111-2222-4333-8444-555555555555";
    vi.mocked(fetch).mockResolvedValueOnce(response({ email: customerUser.email, registration_version: version, expires_in_minutes: 15 }, 202));
    await act(async () => hook.result.current.register({ email: customerUser.email, phone: "+84123456789", fullName: customerUser.full_name, password: "synthetic-password", passwordConfirmation: "synthetic-password" }));
    const binding = requests()[0].body?.client_binding;
    expect(binding).toMatch(/^[a-f0-9]{64}$/);
    expectNoSession(hook);
    vi.mocked(fetch).mockResolvedValueOnce(response({ next_action: "credentials_required" }, 201));
    await act(async () => { expect(await hook.result.current.verifyRegister(customerUser.email, "000123")).toBe(true); });
    expectNoSession(hook);
    expect(hook.result.current.registration?.verified).toBe(true);
    expect(requests().find(item => item.url.endsWith("/register/verify"))?.body).toEqual({
      email: customerUser.email, verification_code: "000123", registration_version: version, client_binding: binding,
    });
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response(challenge("enrollment_ready", nextCapability)));
    await act(async () => hook.result.current.login(customerUser.email, "fresh-synthetic-password"));
    expect(requests().find(item => item.url.endsWith("/auth/login"))?.body).toEqual({
      email: customerUser.email, password: "fresh-synthetic-password", client_binding: binding,
    });
    expectNoSession(hook);
    expect(hook.result.current.registration).toBeNull();
    expect(hook.result.current.ceremony?.challenge.next_action).toBe("enrollment_ready");
  });

  it.each(["register", "register/verify"])("rejects unexpected full sessions from %s", async endpoint => {
    const hook = await mountAuth();
    const version = "11111111-2222-4333-8444-555555555555";
    if (endpoint === "register/verify") {
      vi.mocked(fetch).mockResolvedValueOnce(response({ registration_version: version, expires_in_minutes: 15 }));
      await act(async () => hook.result.current.register({ email: customerUser.email, phone: "+84123456789", fullName: "Customer", password: "synthetic-password", passwordConfirmation: "synthetic-password" }));
    }
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "forbidden-token", user: customerUser, registration_version: version, expires_in_minutes: 15, next_action: "credentials_required" }));
    if (endpoint === "register") {
      await act(async () => hook.result.current.register({ email: customerUser.email, phone: "+84123456789", fullName: "Customer", password: "synthetic-password", passwordConfirmation: "synthetic-password" }));
    } else {
      await act(async () => { expect(await hook.result.current.verifyRegister(customerUser.email, "000123")).toBe(false); });
    }
    expectNoSession(hook);
    expect(hook.result.current.registration).toBeNull();
    expect(requests().some(item => item.url.endsWith("/logout"))).toBe(true);
  });

  it("expires registration memory and clears its binding/version on cancellation and logout", async () => {
    const hook = await mountAuth();
    vi.useFakeTimers();
    const begin = async () => {
      vi.mocked(fetch).mockResolvedValueOnce(response({ registration_version: "11111111-2222-4333-8444-555555555555", expires_in_minutes: 15 }));
      await act(async () => hook.result.current.register({ email: customerUser.email, phone: "+84123456789", fullName: "Customer", password: "synthetic-password", passwordConfirmation: "synthetic-password" }));
    };
    await begin();
    act(() => { vi.advanceTimersByTime(15 * 60000); });
    expect(hook.result.current.registration).toBeNull();
    expect(hook.result.current.authError).toContain("Registration verification expired");
    await begin();
    act(() => hook.result.current.cancelCeremony());
    expect(hook.result.current.registration).toBeNull();
    await begin();
    await act(async () => hook.result.current.logout());
    expect(hook.result.current.registration).toBeNull();
    expectNoSession(hook);
  });

  it("preserves password-reset emails and sends string reset code without accepting a session", async () => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ email: customerUser.email }, 202));
    await act(async () => { expect(await hook.result.current.requestPasswordReset(customerUser.email)).toMatchObject({ email: customerUser.email }); });
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Password reset successful." }));
    await act(async () => {
      expect(await hook.result.current.resetPassword({ email: customerUser.email, verificationCode: "000123", password: "new-synthetic-password", passwordConfirmation: "new-synthetic-password" })).toContain("authenticator");
    });
    expectNoSession(hook);
    expect(requests().find(item => item.url.endsWith("/reset-password"))?.body).toEqual({
      email: customerUser.email, verification_code: "000123", password: "new-synthetic-password", password_confirmation: "new-synthetic-password",
    });
    expect(hook.result.current.ceremony).toBeNull();
  });

  it("never accepts a token from password reset or from Google sign-in", async () => {
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "forbidden-reset-token", user: customerUser }));
    await act(async () => { await expect(hook.result.current.resetPassword({ email: customerUser.email, verificationCode: "000123", password: "synthetic-password", passwordConfirmation: "synthetic-password" })).rejects.toThrow(); });
    expectNoSession(hook);
    const before = requests().length;
    await act(async () => { await expect(hook.result.current.signInWithGoogle("synthetic-id-token")).rejects.toMatchObject({ status: 410 }); });
    expect(requests()).toHaveLength(before);
    expectNoSession(hook);
  });

  it("rejects unsupported Settings password changes without inventing an endpoint", async () => {
    const hook = await mountAuth();
    await expect(hook.result.current.updatePassword({ currentPassword: "synthetic-password", newPassword: "new-synthetic-password" })).rejects.toMatchObject({ status: 410 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not clear a newer session for a stale business 401", async () => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    const hook = await mountAuth();
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Unauthorized" }, 401));
    await act(async () => { await expect(requestApi("/protected-resource", { token: "old-token" })).rejects.toThrow(); });
    expect(hook.result.current.token).toBe("customer-token");
  });

  it.each([401, 403, 503])("fails closed restoring an ineligible or unvalidated session (HTTP %s)", async status => {
    sessionStorage.setItem(customerAuthStorageKey, storedSession());
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Denied" }, status));
    const hook = await mountAuth();
    expectNoSession(hook);
  });

});
