import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { HEALTH_PATH, TEST_ORIGIN } from "./tests/browser/test-origin.mjs";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.e2e.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  outputDir: "test-results/va-browser",
  reporter: [["list"], ["html", { outputFolder: "playwright-report/va-browser", open: "never" }]],
  use: {
    baseURL: TEST_ORIGIN,
    headless: true,
    serviceWorkers: "block",
    locale: "en-US",
    timezoneId: "UTC",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], browserName: "chromium" } }],
  webServer: {
    command: "node tests/browser/local-server.mjs",
    cwd: fileURLToPath(new URL(".", import.meta.url)),
    url: `${TEST_ORIGIN}${HEALTH_PATH}`,
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
