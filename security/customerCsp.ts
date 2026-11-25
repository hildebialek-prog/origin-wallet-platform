import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "next-themes";
import type { Plugin } from "vite";
import { customerThemeOptions } from "../src/lib/customerTheme";

// Only this dependency's reviewed, deterministic local theme bootstrap may run inline.
export function themeBootstrapHash(): string {
  const markup = renderToStaticMarkup(createElement(ThemeProvider, { ...customerThemeOptions, children: null }));
  const scripts = [...markup.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw new Error("Review the Customer theme bootstrap before building CSP.");
  return `'sha256-${createHash("sha256").update(scripts[0][1]).digest("base64")}'`;
}

export function customerSecurityHeaders(env: Record<string, string | undefined>): Record<string, string> {
  const invalid = () => new Error("Customer CSP requires an approved HTTPS VITE_API_BASE_URL and same-API authentication paths.");
  const base = env.VITE_API_BASE_URL;
  if (!base || /[\s\\]/.test(base)) throw invalid();
  let api: URL;
  try { api = new URL(base); } catch { throw invalid(); }
  if (api.protocol !== "https:" || api.username || api.password || api.search || api.hash
    || !/^https:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d+)?$/i.test(api.origin)) throw invalid();

  // Existing absolute auth overrides must not silently widen the connection allowlist.
  for (const [name, value] of Object.entries(env)) {
    if (!/^VITE_AUTH_.*_PATH$/.test(name) || !value) continue;
    if (value.startsWith("/") && !value.startsWith("//") && !/[\s\\]/.test(value)) continue;
    let endpoint: URL;
    try { endpoint = new URL(value); } catch { throw invalid(); }
    if (endpoint.origin !== api.origin || endpoint.username || endpoint.password
      || endpoint.hash || /[\s\\]/.test(value)) throw invalid();
  }

  const policy = [
    "default-src 'none'",
    `script-src 'self' ${themeBootstrapHash()}`,
    "script-src-attr 'none'",
    // Existing React/Radix styles and prerendered fallback markup require inline CSS only.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${api.origin} https://images.unsplash.com`,
    "media-src 'self' blob:",
    // Preserve the existing public rates GET; no authentication material belongs there.
    `connect-src ${api.origin} https://api.coinbase.com/v2/exchange-rates`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");
  return {
    "Content-Security-Policy": policy,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export function customerSecurityHeadersFile(env: Record<string, string | undefined>): string {
  return "/*\n" + Object.entries(customerSecurityHeaders(env))
    .map(([name, value]) => `  ${name}: ${value}\n`).join("");
}

export function customerCspPlugin(env: Record<string, string | undefined>): Plugin {
  const source = customerSecurityHeadersFile(env);
  return {
    name: "customer-document-security-headers",
    apply: "build",
    generateBundle() {
      // Netlify reads this from the existing dist publish directory for all paths,
      // including prerendered public pages and SPA rewrites/direct account entry.
      this.emitFile({ type: "asset", fileName: "_headers", source });
    },
  };
}
