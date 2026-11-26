import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, customerAuthStorageKey, customerSessionVersion, useAuth } from "@/contexts/AuthContext";
import AccountLayout from "@/components/layout/AccountLayout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AccountSettings from "@/pages/account/AccountSettings";

const user = { id: 7, email: "customer@example.test", phone: null, full_name: "Customer User",
  status: "active", kyc_status: "approved", profile: null, roles: ["customer"] };
const storedUser = { id: "7", email: user.email, name: user.full_name, picture: null, providerId: null };
const capability = "a".repeat(64);
const challenge = (next_action = "totp_required", token = capability) => ({
  next_action, challenge_token: token, expires_in_seconds: 300, methods: next_action === "totp_required" ? ["totp", "recovery_code"] : [],
});
const codes = Array.from({ length: 10 }, (_, index) => "synthetic-code-" + index);
const response = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
function ProtectedContent() {
  const auth = useAuth();
  const location = useLocation();
  return <div data-testid="protected" data-path={location.pathname}>Protected Customer content: {auth.user?.email}</div>;
}
vi.mock("@/contexts/LanguageContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/LanguageContext")>()),
  useLanguage: () => ({ currentLanguage: "en", setLanguage: vi.fn(), isTranslating: false }),
}));
vi.mock("@/components/help/HelpChatbot", () => ({ default: () => null }));

const renderLogin = (path = "/login", state?: Record<string, unknown>) => render(
  <AuthProvider><MemoryRouter initialEntries={[{ pathname: path, state }]}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/account" element={<AccountLayout />}>
        <Route index element={<ProtectedContent />} />
        <Route path="settings/general" element={<ProtectedContent />} />
        <Route path="settings/security" element={<AccountSettings />} />
      </Route>
    </Routes>
  </MemoryRouter></AuthProvider>,
);
const enterCredentials = async () => {
  await screen.findByRole("button", { name: "Sign in" });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
};
const beginTotp = async () => {
  vi.mocked(fetch).mockResolvedValueOnce(response(challenge()));
  renderLogin();
  await enterCredentials();
  await screen.findByLabelText("Google Authenticator code");
};
const verify = async () => {
  fireEvent.change(screen.getByLabelText("Google Authenticator code"), { target: { value: "000123" } });
  fireEvent.click(screen.getByRole("button", { name: "Verify" }));
};

describe("Customer mandatory Google Authenticator UI and route guards", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => response({ user }));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:synthetic-qr") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

  it("uses six-digit TOTP after password without any normal login email OTP or resend fallback", async () => {
    await beginTotp();
    expect(screen.getByLabelText("Google Authenticator code")).toHaveAttribute("maxLength", "6");
    expect(screen.getByLabelText("Google Authenticator code")).toHaveAttribute("inputMode", "numeric");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByText(/sent to your email/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resend|email code|send verification/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "verified-token", user }))
      .mockResolvedValueOnce(response({ user }));
    await verify();
    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toContain("verified-token");
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("resend"))).toBe(false);
  });

  it("resets to credentials with a cleared password/code after a rejected TOTP", async () => {
    await beginTotp();
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Authentication could not be completed." }, 422));
    await verify();
    expect(await screen.findByRole("alert")).toHaveTextContent("challenge may have expired, been used or been revoked");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByLabelText("Google Authenticator code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
  });

  it("cancels an in-flight challenge without restoring restricted material", async () => {
    await beginTotp();
    fireEvent.change(screen.getByLabelText("Google Authenticator code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel and restart" }));
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.queryByLabelText("Google Authenticator code")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/challenges/cancel"))).toBe(true);
  });

  it("shows a support message when email ownership cannot safely be established", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: [], support_required: true }));
    renderLogin();
    await enterCredentials();
    expect(await screen.findByText(/We cannot safely verify an established email ownership channel/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Scan/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("rejects obsolete grant-only enrollment methods without offering an approval input", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: ["operator_grant"] }));
    renderLogin();
    await enterCredentials();
    await screen.findByText(/We cannot safely verify an established email ownership channel/);
    expect(screen.queryByLabelText("Approved operator grant")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Use an approved replacement grant/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("renders backend QR/key and one-time codes, requiring an explicit save acknowledgment before access", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: ["enrollment_email_proof"], support_required: false }));
    renderLogin();
    await enterCredentials();
    await screen.findByLabelText("Enrollment email code");
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", "b".repeat(64))));
    fireEvent.change(screen.getByLabelText("Enrollment email code"), { target: { value: "000123" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByRole("button", { name: "Show authenticator setup" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("enrollment_ready", "b".repeat(64)), qr_svg: "<svg/>", manual_key: "SYNTHETICSETUPKEY" }));
    fireEvent.click(screen.getByRole("button", { name: "Show authenticator setup" }));
    expect(await screen.findByText("SYNTHETICSETUPKEY")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Scan with Google Authenticator" })).toHaveAttribute("src", "blob:synthetic-qr");
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "enrolled-token", user, recovery_codes: codes }))
      .mockResolvedValueOnce(response({ user }));
    await verify();
    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeInTheDocument();
    expect(screen.getAllByText(/^synthetic-code-/)).toHaveLength(10);
    expect(screen.getByRole("region", { name: "Recovery codes" })).toHaveAttribute("translate", "no");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:synthetic-qr");
    fireEvent.click(screen.getByLabelText("I have saved my recovery codes"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(screen.queryByText("synthetic-code-0")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).not.toContain("synthetic-code");
  });

  it("offers replacement through a backup code without granting access after backup verification", async () => {
    await beginTotp();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("recovery_required", "b".repeat(64))));
    fireEvent.click(screen.getByRole("button", { name: "Use a recovery code" }));
    await screen.findByLabelText("Recovery code");
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("replacement_required", "c".repeat(64))));
    fireEvent.change(screen.getByLabelText("Recovery code"), { target: { value: "synthetic-backup" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("button", { name: "Show authenticator setup" })).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
  });

  it("disables login until Retry-After has elapsed", async () => {
    renderLogin();
    await screen.findByRole("button", { name: "Sign in" });
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Too many" }, 429, { "Retry-After": "30" }));
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic-password" } });
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByText("Try again in 30 seconds.")).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows sanitized service-unavailable copy without echoing sensitive error payloads", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "synthetic-secret", trace: ["private"] }, 503));
    renderLogin();
    await enterCredentials();
    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication service is unavailable.");
    expect(document.body).not.toHaveTextContent("synthetic-secret");
    expect(screen.getByLabelText("Password")).toHaveValue("");
  });

  it("rejects unauthenticated protected routes", async () => {
    renderLogin("/account/settings/general");
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
  });

  it("rejects cached sessions when the authoritative Customer identity gate denies /me", async () => {
    sessionStorage.setItem(customerAuthStorageKey, JSON.stringify({ version: customerSessionVersion,
      created_at: new Date().toISOString(), token: "ineligible-token", user: storedUser }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Account access denied" }, 403));
    renderLogin("/account/settings/general");
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
  });

  it.each(["https://outside.example.test/", "/account/../admin", "/account/%2e%2e/admin", "/login?next=account"])("rejects unsafe or login-loop redirect %s", async from => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge()));
    renderLogin("/login", { from });
    await enterCredentials();
    await screen.findByLabelText("Google Authenticator code");
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "verified-token", user }))
      .mockResolvedValueOnce(response({ user }));
    await verify();
    expect(await screen.findByTestId("protected")).toHaveAttribute("data-path", "/account");
  });

  it("returns to a protected Customer destination after MFA", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge()));
    renderLogin("/login", { from: "/account/settings/general" });
    await enterCredentials();
    await screen.findByLabelText("Google Authenticator code");
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "verified-token", user }))
      .mockResolvedValueOnce(response({ user }));
    await verify();
    expect(await screen.findByTestId("protected")).toHaveAttribute("data-path", "/account/settings/general");
  });

  it("shows Customer security status and clears the session on logout", async () => {
    sessionStorage.setItem(customerAuthStorageKey, JSON.stringify({ version: customerSessionVersion,
      created_at: new Date().toISOString(), token: "customer-token", user: storedUser }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response({ mandatory: true, enrolled: true, confirmed_at: "2026-01-01T00:00:00Z", recovery_codes_remaining: 8 }));
    renderLogin("/account/settings/security");
    expect(await screen.findByText(/Recovery codes remaining: 8/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Authenticator security" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
  });

  it("transfers working-authenticator replacement from Session to Login without losing the one-time codes", async () => {
    sessionStorage.setItem(customerAuthStorageKey, JSON.stringify({ version: customerSessionVersion,
      created_at: new Date().toISOString(), token: "customer-token", user: storedUser }));
    vi.mocked(fetch).mockResolvedValueOnce(response({ user }))
      .mockResolvedValueOnce(response({ mandatory: true, enrolled: true, confirmed_at: "2026-01-01T00:00:00Z", recovery_codes_remaining: 8 }));
    renderLogin("/account/settings/security");
    await screen.findByText(/Recovery codes remaining: 8/);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("step_up_required")));
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "synthetic-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue with verification" }));
    await screen.findByLabelText("Google Authenticator code");
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("replacement_required", "b".repeat(64))));
    await verify();
    await screen.findByRole("button", { name: "Show authenticator setup" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("replacement_required", "b".repeat(64)), manual_key: "NEWKEY", qr_svg: "<svg/>" }));
    fireEvent.click(screen.getByRole("button", { name: "Show authenticator setup" }));
    await screen.findByText("NEWKEY");
    let resolveMe!: (value: Response) => void;
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "replaced-token", user, recovery_codes: codes }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveMe = resolve; }));
    await verify();
    await waitFor(() => expect(resolveMe).toBeTypeOf("function"));
    await screen.findByRole("heading", { name: "Welcome back" });
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    await act(async () => { resolveMe(response({ user })); });
    expect(await screen.findByRole("heading", { name: "Save your recovery codes" })).toBeInTheDocument();
    expect(screen.getAllByText(/^synthetic-code-/)).toHaveLength(10);
    fireEvent.click(screen.getByLabelText("I have saved my recovery codes"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Authenticator security" });
    expect(sessionStorage.getItem(customerAuthStorageKey)).toContain("replaced-token");
    expect(screen.queryByText("synthetic-code-0")).not.toBeInTheDocument();
  });
  it.each(["registration_email_proof", "enrollment_email_proof"])("renders %s strictly for enrollment", async method => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(response({ next_action: "enrollment_identity_required", methods: [method], proof_expires_in_seconds: 120 }));
    renderLogin();
    await enterCredentials();
    const label = method === "registration_email_proof" ? "Registration email code" : "Enrollment email code";
    await screen.findByLabelText(label);
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", "b".repeat(64))));
    fireEvent.change(screen.getByLabelText(label), { target: { value: "000123" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("button", { name: "Show authenticator setup" })).toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith("/login/verify") || String(url).endsWith("/login/resend"))).toBe(false);
  });

  it("verifies registration email then directly enrolls with its original browser binding, without entering the account", async () => {
    renderLogin("/register");
    await screen.findByRole("button", { name: "Create account with email" });
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Customer User" } });
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0123456789" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "synthetic-password" } });
    vi.mocked(fetch).mockResolvedValueOnce(response({ registration_version: "11111111-2222-4333-8444-555555555555", expires_in_minutes: 15, email: user.email }, 202));
    fireEvent.click(screen.getByRole("button", { name: "Create account with email" }));
    await screen.findByLabelText("Registration email code");
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge("enrollment_ready", "b".repeat(64)), 201));
    fireEvent.change(screen.getByLabelText("Registration email code"), { target: { value: "000123" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));
    await screen.findByRole("button", { name: "Show authenticator setup" });
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Enrollment email code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    const calls = vi.mocked(fetch).mock.calls;
    const registerBody = JSON.parse(String(calls.find(([url]) => String(url).endsWith("/auth/register"))?.[1]?.body));
    const verifyBody = JSON.parse(String(calls.find(([url]) => String(url).endsWith("/register/verify"))?.[1]?.body));
    expect(verifyBody.client_binding).toBe(registerBody.client_binding);
    expect(calls.some(([url]) => String(url).endsWith("/auth/login") || String(url).includes("/enrollment/identity/"))).toBe(false);
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...challenge("enrollment_ready", "b".repeat(64)), manual_key: "REGISTERKEY", qr_svg: "<svg/>" }));
    fireEvent.click(screen.getByRole("button", { name: "Show authenticator setup" }));
    await screen.findByLabelText("Google Authenticator code");
    const setupBody = vi.mocked(fetch).mock.calls.find(([url]) => String(url).endsWith("/enrollment/setup"))?.[1];
    expect(setupBody?.headers).toMatchObject({ "X-Auth-Client-Binding": registerBody.client_binding });
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValueOnce(response({ token: "registered-token", user, recovery_codes: codes }))
      .mockResolvedValueOnce(response({ user }));
    await verify();
    await screen.findByRole("heading", { name: "Save your recovery codes" });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("I have saved my recovery codes"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toContain("registered-token");
  });

  it("preserves password-reset email/code UI and returns to mandatory-MFA sign-in", async () => {
    renderLogin("/forgot-password");
    await screen.findByRole("button", { name: "Send reset code" });
    vi.mocked(fetch).mockResolvedValueOnce(response({ email: user.email }, 202));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset code" }));
    await screen.findByLabelText("New password");
    fireEvent.change(screen.getByLabelText("Verification code"), { target: { value: "000123" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-synthetic-password" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "new-synthetic-password" } });
    vi.mocked(fetch).mockResolvedValueOnce(response({ message: "Password reset successful." }));
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reset password" })); });
    expect(screen.getByLabelText("New password")).toHaveValue("");
    expect(screen.getByText(/Password reset successful\. Sign in with your new password and authenticator/)).toBeInTheDocument();
    expect(sessionStorage.getItem(customerAuthStorageKey)).toBeNull();
    expect(screen.queryByTestId("protected")).not.toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(1200); });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByText(/Resetting your password does not remove/)).toBeInTheDocument();
  });

  it("keeps the Google entry point inert, without scripts, tokens or success callbacks", () => {
    const success = vi.fn();
    render(<GoogleSignInButton onSuccess={success} onError={vi.fn()} />);
    expect(screen.getByText(/Google sign-in is currently unavailable/)).toBeInTheDocument();
    expect(document.querySelector('script[src="https://accounts.google.com/gsi/client"]')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });

});
