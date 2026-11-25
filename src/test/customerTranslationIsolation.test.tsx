import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "@/App";
import LanguageSelector from "@/components/LanguageSelector";
import { LANGUAGES, LanguageProvider, TRANSLATION_NOTICE } from "@/contexts/LanguageContext";
import { customerAuthStorageKey, customerSessionVersion } from "@/contexts/AuthContext";

const user = { id: 7, email: "customer@example.test", full_name: "Synthetic Customer", phone: null,
  status: "active", kyc_status: "approved", profile: null, roles: ["customer"] };
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200,
  headers: { "Content-Type": "application/json" } });
const challenge = (next_action: string) => ({ next_action, challenge_token: "a".repeat(64),
  expires_in_seconds: 300, methods: [] });
const enter = (path: string) => {
  window.history.replaceState(null, "", path);
  return render(<App />);
};
const assertLocalScriptInventory = () => {
  // JSDOM DOM observation only. HTTP CSP/execution/network enforcement needs a browser.
  expect([...document.scripts].filter(script => script.src && new URL(script.src).origin !== location.origin)).toEqual([]);
  expect(document.querySelector('script[src*="translate"], script[src*="analytics"], .goog-te-combo')).toBeNull();
  expect(screen.getByRole("status", { name: "Translation availability" })).toHaveTextContent(TRANSLATION_NOTICE);
};

describe("Customer sensitive routes with translation suspended", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.stubGlobal("IntersectionObserver", class {
      root = null; rootMargin = ""; thresholds = [];
      observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (!url.startsWith("https://api.auth.example.test/api/auth/")) throw new Error("Unexpected test destination");
      return url.endsWith("/security")
        ? json({ mandatory: true, enrolled: true, confirmed_at: "2026-11-25T00:00:00Z", recovery_codes_remaining: 10 })
        : json({ user });
    });
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:synthetic-qr") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
  });
  afterEach(() => {
    cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
  });

  it.each([
    ["/login", "Welcome back"], ["/register", "Create your account"], ["/forgot-password", "Forgot password"],
  ])("keeps the notice and clean script inventory on direct %s entry", async (path, heading) => {
    localStorage.setItem("website_language", "vi");
    enter(path);
    expect(await screen.findByText(heading)).toBeInTheDocument();
    assertLocalScriptInventory();
    expect(localStorage.getItem("website_language")).toBe("vi");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("covers direct authenticated Account Security entry without translation execution", async () => {
    localStorage.setItem("website_language", "zh-CN");
    sessionStorage.setItem(customerAuthStorageKey, JSON.stringify({ version: customerSessionVersion,
      created_at: new Date().toISOString(), token: "synthetic-session", user: {
        id: "7", email: user.email, name: user.full_name, picture: null, providerId: null,
      } }));
    enter("/account/settings/security");
    expect(await screen.findByText("Authenticator security")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Recovery codes remaining: 10/)).toBeInTheDocument());
    assertLocalScriptInventory();
    expect(localStorage.getItem("website_language")).toBe("zh-CN");
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).startsWith("https://api.auth.example.test/api/auth/"))).toBe(true);
  });

  it("retains a public language choice across navigation into Login", async () => {
    enter("/security");
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("button", { name: /JP Japanese/ }));
    expect(localStorage.getItem("website_language")).toBe("ja");
    expect(localStorage.getItem("google_translate_language")).toBe("ja");
    fireEvent.click(screen.getAllByRole("link", { name: "Sign in" })[0]);
    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
    assertLocalScriptInventory();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(LANGUAGES)("preserves the saved $code preference without translating content", language => {
    localStorage.setItem("website_language", language.code);
    localStorage.setItem("google_translate_language", language.googleCode);
    render(<LanguageProvider><LanguageSelector compact /></LanguageProvider>);
    expect(screen.getByRole("button")).toHaveTextContent(language.code.toUpperCase());
    expect(localStorage.getItem("website_language")).toBe(language.code);
    expect(localStorage.getItem("google_translate_language")).toBe(language.googleCode);
    assertLocalScriptInventory();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("retains the legacy preference fallback and URL selection without discarding saved preferences", () => {
    localStorage.setItem("google_translate_language", "vi");
    const first = render(<LanguageProvider><LanguageSelector compact /></LanguageProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("VI");
    first.unmount();
    window.history.replaceState(null, "", "/login?tl=ja");
    render(<LanguageProvider><LanguageSelector compact /></LanguageProvider>);
    expect(screen.getByRole("button")).toHaveTextContent("JA");
    expect(localStorage.getItem("google_translate_language")).toBe("vi");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders the synthetic backend QR as a Blob and revokes it when setup is left", async () => {
    localStorage.setItem("website_language", "vi");
    vi.mocked(fetch).mockResolvedValueOnce(json(challenge("enrollment_identity_required")))
      .mockResolvedValueOnce(json(challenge("enrollment_ready")));
    enter("/login");
    await screen.findByRole("button", { name: "Sign in" });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: user.email } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "synthetic-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("button", { name: "Show authenticator setup" });
    vi.mocked(fetch).mockResolvedValueOnce(json({ ...challenge("enrollment_ready"),
      qr_svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Synthetic QR</text></svg>', manual_key: "SYNTHETICKEY" }));
    fireEvent.click(screen.getByRole("button", { name: "Show authenticator setup" }));
    expect(await screen.findByRole("img", { name: "Scan with Google Authenticator" })).toHaveAttribute("src", "blob:synthetic-qr");
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(document.querySelector("svg text")).toBeNull();
    assertLocalScriptInventory();
    fireEvent.click(screen.getByRole("button", { name: "Cancel and restart" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:synthetic-qr");
    expect(screen.queryByText("SYNTHETICKEY")).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.every(([url]) => String(url).startsWith("https://api.auth.example.test/api/auth/"))).toBe(true);
  });
});
