import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "next-themes";
import { describe, expect, it, vi } from "vitest";
import { customerCspPlugin, customerSecurityHeaders, customerSecurityHeadersFile } from "../../security/customerCsp";
import { customerThemeOptions } from "@/lib/customerTheme";

const env = { VITE_API_BASE_URL: "https://api.auth.example.test:8443/api" };
const directives = () => Object.fromEntries(customerSecurityHeaders(env)["Content-Security-Policy"]
  .split("; ").map(entry => { const [name, ...values] = entry.split(" "); return [name, values]; }));

describe("Customer production document policy source", () => {
  it("admits only local executable assets and the exact existing trusted theme bootstrap", () => {
    const policy = directives();
    const markup = renderToStaticMarkup(createElement(ThemeProvider, { ...customerThemeOptions, children: null }));
    const script = new DOMParser().parseFromString(markup, "text/html").querySelector("script")!;
    const hash = `'sha256-${createHash("sha256").update(script.textContent ?? "").digest("base64")}'`;
    expect(policy["script-src"]).toEqual(["'self'", hash]);
    expect(policy["script-src-attr"]).toEqual(["'none'"]);
    expect(policy["script-src"]).not.toContain("'unsafe-inline'");
    expect(policy["script-src"]).not.toContain("'unsafe-eval'");
    expect(policy["script-src"].join(" ")).not.toMatch(/google|https:|data:|blob:|\*/);
    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["base-uri"]).toEqual(["'none'"]);
    expect(policy["frame-src"]).toEqual(["'none'"]);
    expect(policy["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("permits the configured API, existing public rates GET and local QR images without connection wildcards", () => {
    const policy = directives();
    expect(policy["connect-src"]).toEqual(["https://api.auth.example.test:8443", "https://api.coinbase.com/v2/exchange-rates"]);
    expect(policy["img-src"]).toContain("blob:");
    expect(policy["img-src"]).toContain("https://api.auth.example.test:8443");
    expect(policy["connect-src"].join(" ")).not.toMatch(/google|analytics|\*|wss?:/);
    expect(customerSecurityHeaders(env)["Referrer-Policy"]).toBe("no-referrer");
    expect(customerSecurityHeaders(env)["X-Frame-Options"]).toBe("DENY");
  });

  it.each([undefined, "", "http://localhost:8080/api", "https://user:secret@example.test/api",
    "https://*.example.test/api", "https://api.example.test/api?x=1", "https://api.example.test/api#x",
    "https://api.example.test/api\nscript-src *"])("fails closed for an absent or unsafe published API URL (%s)", value => {
    expect(() => customerSecurityHeaders({ VITE_API_BASE_URL: value })).toThrow(/approved HTTPS/);
  });

  it("preserves relative and same-API overrides and refuses a new auth destination", () => {
    expect(() => customerSecurityHeaders({ ...env, VITE_AUTH_LOGIN_PATH: "/auth/login",
      VITE_AUTH_ME_PATH: "https://api.auth.example.test:8443/api/auth/me" })).not.toThrow();
    for (const value of ["https://another.example.test/api/auth/login", "//another.example.test/login", "javascript:alert(1)"]) {
      expect(() => customerSecurityHeaders({ ...env, VITE_AUTH_LOGIN_PATH: value })).toThrow();
    }
  });

  it("emits enforcing HTTP headers for every Netlify path through the build plugin", () => {
    const plugin = customerCspPlugin(env);
    const emitFile = vi.fn();
    const generateBundle = plugin.generateBundle;
    const hook = typeof generateBundle === "function"
      ? generateBundle
      : generateBundle?.handler;

    if (typeof hook !== "function") {
      throw new Error("Expected generateBundle hook");
    }

    Reflect.apply(hook, { emitFile }, [{}, {}, false]);
    expect(plugin.apply).toBe("build");
    expect(emitFile).toHaveBeenCalledWith({ type: "asset", fileName: "_headers", source: customerSecurityHeadersFile(env) });
    expect(customerSecurityHeadersFile(env)).toMatch(/^\/\*\n  Content-Security-Policy:/);
    expect(customerSecurityHeadersFile(env)).not.toContain("Content-Security-Policy-Report-Only");
    const netlify = readFileSync(resolve(process.cwd(), "netlify.toml"), "utf8");
    expect(netlify).toContain('publish = "dist"');
  });

  it("has no external executable or inline executable script in the source HTML", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const document = new DOMParser().parseFromString(html, "text/html");
    const scripts = [...document.querySelectorAll("script")].filter(script => script.type !== "application/ld+json");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].type).toBe("module");
    expect(scripts[0].getAttribute("src")).toBe("/src/main.tsx");
    expect(scripts[0].textContent?.trim()).toBe("");
    expect(document.documentElement.lang).toBe("en");
    expect(html).not.toMatch(/translate\.google|googleTranslateElementInit|google_translate_element/);
    const language = readFileSync(resolve(process.cwd(), "src/contexts/LanguageContext.tsx"), "utf8");
    expect(language).not.toMatch(/createElement|fetch\(|XMLHttpRequest|document\.cookie|\.goog-te-combo|googleTranslateElementInit/);
    expect(readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8")).not.toContain("setupRuntimeProtection");
  });
});
