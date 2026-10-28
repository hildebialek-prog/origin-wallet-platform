import { test as base, expect, type Page } from "@playwright/test";
import { VABackend } from "./va-backend";
import { ACCOUNT_PATH, CREATE_PATH, REQUEST_PAGE, STORE_KEY, initialStorage, type SavedScope } from "./va-fixtures";

export const test = base.extend<{ backend: VABackend }>({
  storageState: initialStorage(),
  backend: [async ({ context }, use, testInfo) => {
    const backend = new VABackend(context);
    await backend.install();
    try { await use(backend); }
    finally {
      backend.dispose();
      // Preserve only synthetic fixture traffic; no external credentials are used.
      await testInfo.attach("va-network-ledger", { body: JSON.stringify(backend.requests, null, 2), contentType: "application/json" });
      await testInfo.attach("va-isolation-issues", { body: JSON.stringify(backend.issues, null, 2), contentType: "application/json" });
      expect(backend.issues, "No unexpected API, external traffic, CSP violations or page errors").toEqual([]);
    }
  }, { auto: true }],
});
export { expect };

export const statusPanel = (page: Page) => page.getByRole("region", { name: "Virtual account request status" });
export const confirm = (page: Page) => page.getByRole("button", { name: "Confirm and request", exact: true });
export const savedScope = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as SavedScope | null, STORE_KEY);

export async function openRequest(page: Page, readyToCreate = true) {
  await page.goto(REQUEST_PAGE);
  await expect(page.getByRole("heading", { name: "Request virtual account", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.isSecureContext && typeof navigator.locks?.request === "function")).toBe(true);
  expect(await page.evaluate(() => document.visibilityState)).toBe("visible");
  if (readyToCreate) await expect(confirm(page)).toBeEnabled();
}

export async function checkStatus(page: Page, backend: VABackend) {
  const before = backend.operationReads.length;
  await statusPanel(page).getByRole("button", { name: "Check status", exact: true }).click();
  await expect.poll(() => backend.operationReads.length).toBeGreaterThan(before);
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
}

export async function createPending(page: Page, backend: VABackend, pauseClockBeforeSubmit = false) {
  await openRequest(page);
  if (pauseClockBeforeSubmit) await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  const response = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(CREATE_PATH));
  await confirm(page).click();
  const received = await response;
  expect(received.status()).toBe(202);
  expect((await received.json()).virtual_account).toBeNull();
  await expect(statusPanel(page)).toContainText("Assignment pending");
  await expect(confirm(page)).toBeDisabled();
  await expect.poll(async () => (await savedScope(page))?.operations[0].submission).toBe("acknowledged");
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  if (pauseClockBeforeSubmit) {
    // Flush the hook's initial post-submit GET while time is paused, so none of
    // the following eight scheduled checks depends on machine/rendering speed.
    await page.clock.runFor(1);
    await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  }
  expect(backend.assignments).toHaveLength(1);
  return backend.assignments[0].key!;
}

export async function expectReadOnlyRecovery(backend: VABackend, from: number, expectedPosts: number) {
  expect(backend.assignments).toHaveLength(expectedPosts);
  expect(backend.lifecycleRequests.slice(from).length).toBeGreaterThan(0);
  expect(backend.lifecycleRequests.slice(from).every((request) => request.method === "GET")).toBe(true);
  for (const request of backend.operationReads.filter((request) => request.query.operation_id)) {
    expect(request.path).toBe(ACCOUNT_PATH);
    expect(request.query.provider_account_id).toBe("7");
  }
}
