import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "ui-polish.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  forbidOnly: true,
  outputDir: "test-results/ui-polish",
  reporter: [["list"]],
  use: { headless: true, serviceWorkers: "block", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [1440, 768, 390].map((width) => ({ name: `${width}px`, use: { browserName: "chromium", viewport: { width, height: 1000 } } })),
  webServer: [
    { command: "node tests/browser/local-server.mjs", url: "http://127.0.0.1:4179/__va_browser_health", reuseExistingServer: false },
    { command: "node tests/browser/ui-admin-server.mjs", url: "http://127.0.0.1:4181/admin/login", reuseExistingServer: false },
  ],
});
