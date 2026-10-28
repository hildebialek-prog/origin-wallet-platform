import {
  test, expect, checkStatus, confirm, createPending, expectReadOnlyRecovery, openRequest, savedScope, statusPanel,
} from "./va-browser";
import {
  ACCOUNT_ID, CREATE_PATH, LIST_PAGE, VA_ID, bankDetails, virtualAccount,
} from "./va-fixtures";

for (const mode of ["pending", "assigned"] as const) {
  test(`native tabs converge on one persisted identity and one POST (${mode}) [1,2,3]`, async ({ page, context, backend }) => {
    backend.createMode = mode;
    const other = await context.newPage();
    await Promise.all([openRequest(page), openRequest(other)]);
    const release = mode === "pending" ? backend.holdNextPost() : () => undefined;
    backend.synchronizeSubmissions(2);

    await Promise.all([confirm(page).click(), confirm(other).click()]);
    await expect.poll(() => backend.assignments.length).toBe(1);
    await expect.poll(() => backend.persistedBeforePost.length).toBe(1);
    const key = backend.assignments[0].key!;
    const snapshots = backend.persistedBeforePost[0];
    expect(snapshots).toHaveLength(2);
    for (const scope of snapshots) {
      expect(scope.operations).toHaveLength(1);
      expect(scope.operations[0]).toMatchObject({ providerAccountId: ACCOUNT_ID, operationId: key, submission: "dispatching",
        request: { providerCode: "nium", currency: "USD", accountCategory: "SELF_FUNDING_ACCOUNT", accountType: "WIRES" } });
    }
    release();
    for (const tab of [page, other]) {
      await expect(statusPanel(tab)).toContainText(key);
      await expect.poll(async () => (await savedScope(tab))?.operations[0].server?.status).toBe(mode);
      const scope = await savedScope(tab);
      expect(scope?.operations).toHaveLength(1);
      expect(scope?.operations[0]).toMatchObject({ providerAccountId: ACCOUNT_ID, operationId: key });
    }
    const start = backend.lifecycleRequests.length;
    await checkStatus(other, backend);
    await expectReadOnlyRecovery(backend, start, 1);
    expect(new Set(backend.assignments.map((request) => request.key)).size).toBe(1);
    expect(backend.assignments[0].body?.expected_provider_account_id).toBe(ACCOUNT_ID);
  });
}

test("reload and navigation retain a pending key and account without POST recovery [4,18]", async ({ page, backend }) => {
  const key = await createPending(page, backend);
  const before = await savedScope(page);
  const start = backend.lifecycleRequests.length;
  await page.reload();
  await expect(statusPanel(page)).toContainText(key);
  await expect(confirm(page)).toBeDisabled();
  await page.getByRole("link", { name: "View accounts", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Virtual accounts", exact: true })).toBeVisible();
  await expect(statusPanel(page)).toContainText(key);
  await page.getByRole("link", { name: "Request", exact: true }).click();
  await expect(statusPanel(page)).toContainText("Assignment pending");
  expect((await savedScope(page))?.operations[0]).toMatchObject({ operationId: key, providerAccountId: ACCOUNT_ID,
    request: before?.operations[0].request });
  expect((await savedScope(page))?.generation).toBe(before?.generation);
  await expectReadOnlyRecovery(backend, start, 1);
});

test("HTTP 202 keeps nullable VA and polls GET with bounded backoff [5,18]", async ({ page, backend }) => {
  await page.clock.install();
  const key = await createPending(page, backend, true);
  expect(backend.assignments[0].responseStatus).toBe(202);
  expect(backend.accounts).toEqual([]);
  expect((await savedScope(page))?.operations[0].virtualAccountId).toBeNull();
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  const start = backend.lifecycleRequests.length;
  // Each jump fires the next scheduled check once. Wait for its network-backed
  // refresh to finish before moving to the following backoff boundary.
  for (const delay of [2000, 4000, 8000, 15000, 30000, 60000, 60000, 60000]) {
    const reads = backend.operationReads.length;
    await page.clock.runFor(delay);
    await expect.poll(() => backend.operationReads.length).toBeGreaterThan(reads);
    await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  }
  await expect(statusPanel(page)).toContainText("Automatic status checks paused");
  const reads = backend.operationReads.length;
  await page.clock.runFor(120000);
  expect(backend.operationReads).toHaveLength(reads);
  await expect(confirm(page)).toBeDisabled();
  expect((await savedScope(page))?.operations[0].operationId).toBe(key);
  await expectReadOnlyRecovery(backend, start, 1);
});

test("HTTP 201 legacy pending VA never appears assigned [6]", async ({ page, backend }) => {
  backend.createMode = "legacy";
  await openRequest(page);
  const response = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname.endsWith(CREATE_PATH));
  await confirm(page).click();
  const received = await response;
  expect(received.status()).toBe(201);
  expect((await received.json()).virtual_account.status).toBe("pending");
  await expect(statusPanel(page)).toContainText("Assignment pending");
  await expect(page.getByText("Virtual account assigned", { exact: true })).not.toBeVisible();
  await expect(confirm(page)).toBeDisabled();
  await page.getByRole("link", { name: "View accounts", exact: true }).click();
  await page.getByRole("link", { name: "Pending", exact: true }).click();
  await page.getByRole("button", { name: `View banking details for USD account ${VA_ID}`, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Enrichment tracking unavailable");
  await expect(statusPanel(page)).not.toContainText("Assigned.");
  expect(backend.assignments).toHaveLength(1);
});

test("elapsed POST timeout and absent exact lookup retain intent through reload [7,8,18]", async ({ page, backend }) => {
  backend.createMode = "timeout";
  await openRequest(page);
  await confirm(page).click();
  await expect.poll(() => backend.persistedBeforePost.length).toBe(1);
  const key = backend.assignments[0].key!;
  // Use the real 30-second application deadline, not merely an aborted request.
  await expect.poll(async () => (await savedScope(page))?.operations[0].submission, { timeout: 40000 }).toBe("uncertain");
  await expect(page.getByRole("alert").filter({ hasText: "timed out" }).first()).toBeVisible();
  const start = backend.lifecycleRequests.length;
  await checkStatus(page, backend);
  expect(backend.rows).toEqual([]);
  expect(backend.operationReads.some((request) => request.query.provider_account_id === String(ACCOUNT_ID) && request.query.operation_id === key)).toBe(true);
  await expect(statusPanel(page)).toContainText("missing server record does not prove");
  await expect(confirm(page)).toBeDisabled();
  await page.reload();
  await expect(statusPanel(page)).toContainText(key);
  await expect(confirm(page)).toBeDisabled();
  expect((await savedScope(page))?.operations[0]).toMatchObject({ operationId: key, providerAccountId: ACCOUNT_ID, submission: "uncertain", server: null });
  await expectReadOnlyRecovery(backend, start, 1);
});

test("interrupted response and native offline/reconnect retain the original intent [7,18]", async ({ page, backend }) => {
  await page.clock.install();
  backend.createMode = "interrupted";
  await openRequest(page);
  await confirm(page).click();
  // Preflight can leave a valid empty scope before the durable reservation exists.
  await expect.poll(async () => (await savedScope(page))?.operations[0]?.submission).toBe("uncertain");
  const key = backend.assignments[0].key!;
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  await backend.setOffline(true);
  await page.clock.runFor(1);
  await expect(statusPanel(page)).toContainText("paused while offline");
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  const reads = backend.operationReads.length;
  await page.clock.runFor(60000);
  expect(backend.operationReads).toHaveLength(reads);
  const start = backend.lifecycleRequests.length;
  await backend.setOffline(false);
  await page.clock.runFor(1);
  await expect.poll(() => backend.operationReads.length).toBeGreaterThan(reads);
  await expect(confirm(page)).toBeDisabled();
  expect((await savedScope(page))?.operations).toEqual([
    expect.objectContaining({ operationId: key, providerAccountId: ACCOUNT_ID, submission: "uncertain", server: null }),
  ]);
  await expectReadOnlyRecovery(backend, start, 1);
});

for (const status of ["unknown", "manual_review", "failed"] as const) {
  test(`${status} stays unresolved after GET reconciliation and reload [9,18]`, async ({ page, backend }) => {
    const key = await createPending(page, backend);
    const start = backend.lifecycleRequests.length;
    backend.setOperation(key, status);
    await checkStatus(page, backend);
    await expect.poll(async () => (await savedScope(page))?.operations[0].server?.status).toBe(status);
    await page.reload();
    await expect(statusPanel(page)).toContainText(key);
    await expect(confirm(page)).toBeDisabled();
    if (status === "failed") await expect(statusPanel(page)).toContainText("Provider rejection is not established");
    if (status === "unknown") await expect(statusPanel(page)).toContainText("Assignment outcome unknown");
    if (status === "manual_review") await expect(statusPanel(page)).toContainText("Manual review required");
    expect((await savedScope(page))?.operations).toHaveLength(1);
    await expectReadOnlyRecovery(backend, start, 1);
  });
}

test("assignment and banking enrichment refresh the list and already-open modal [10,11,12,13,18]", async ({ page, backend }) => {
  await page.clock.install();
  const key = await createPending(page, backend);
  await page.getByRole("link", { name: "View accounts", exact: true }).click();
  await expect(statusPanel(page)).toContainText("Assignment pending");
  await expect(page.getByText("No virtual accounts in this view", { exact: true })).toBeVisible();
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  const start = backend.lifecycleRequests.length;
  backend.setOperation(key, "assigned");
  backend.accounts = [virtualAccount()];
  await page.clock.fastForward(61000);
  const details = page.getByRole("button", { name: `View banking details for USD account ${VA_ID}`, exact: true });
  await expect(details).toBeVisible();
  await expect(page.getByText("assigned", { exact: true })).toBeVisible();
  await expect.poll(async () => (await savedScope(page))?.operations[0].virtualAccountId).toBe(VA_ID);
  await details.click();
  const dialog = page.getByRole("dialog", { name: "Receiving account details" });
  await expect(dialog).toContainText("Banking details pending.");
  await expect(dialog.getByText("Browser Fixture Bank", { exact: true })).not.toBeVisible();

  backend.accounts = [{ ...virtualAccount("assigned", "running"), detail: { account_name: "Browser Fixture Account" } }];
  await page.clock.fastForward(61000);
  await expect(dialog).toContainText("Banking details are updating.");
  await expect(dialog).toContainText("Browser Fixture Account");
  await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
  backend.accounts = [{ ...virtualAccount("assigned", "complete"), detail: bankDetails() }];
  await page.clock.fastForward(61000);
  await expect(dialog).toContainText("Banking details complete.");
  for (const value of ["Browser Fixture Bank", "1 Fixture Street", "SWIFT TESTUS00", "ACH 000000001", "GLOBAL"]) {
    await expect(dialog.getByText(value, { exact: true })).toBeVisible();
  }
  await expect(dialog).not.toContainText("WIRES");
  await expect(dialog).not.toContainText("Intermediary");
  // No close/reopen occurs between the pending and complete assertions.
  await expect(page.getByText("assigned", { exact: true })).toBeVisible();
  await expectReadOnlyRecovery(backend, start, 1);
});

test("exhausted enrichment and legacy metadata remain readable without assignment [11,12]", async ({ page, backend }) => {
  backend.accounts = [{ ...virtualAccount("assigned", "exhausted"), detail: bankDetails() }];
  await page.goto(LIST_PAGE);
  await page.getByRole("button", { name: `View banking details for USD account ${VA_ID}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("could not be completed automatically");
  await expect(dialog).toContainText("a new VA assignment is not needed");
  await expect(dialog).toContainText("Browser Fixture Bank");
  await page.getByRole("button", { name: "Close banking details", exact: true }).click();
  backend.accounts = [{ ...backend.accounts[0], enrichment: null }];
  await checkStatus(page, backend);
  await page.getByRole("button", { name: `View banking details for USD account ${VA_ID}`, exact: true }).click();
  await expect(dialog).toContainText("Enrichment tracking unavailable");
  await expect(dialog).toContainText("SWIFT TESTUS00");
  expect(backend.assignments).toHaveLength(0);
});

test("account mismatch stays blocked through reload and later assigned projection [14]", async ({ page, backend }) => {
  backend.createMode = "mismatch";
  await openRequest(page);
  await confirm(page).click();
  await expect.poll(async () => (await savedScope(page))?.operations[0]?.submission).toBe("account_mismatch");
  const key = backend.assignments[0].key!;
  expect(backend.assignments[0].responseStatus).toBe(409);
  await page.reload();
  await expect(statusPanel(page)).toContainText("Account identity changed");
  backend.setOperation(key, "assigned");
  backend.accounts = [virtualAccount()];
  const start = backend.lifecycleRequests.length;
  await checkStatus(page, backend);
  await expect.poll(async () => (await savedScope(page))?.operations[0].server?.status).toBe("assigned");
  await expect(confirm(page)).toBeDisabled();
  expect((await savedScope(page))?.operations).toEqual([
    expect.objectContaining({ operationId: key, providerAccountId: ACCOUNT_ID, submission: "account_mismatch" }),
  ]);
  await expectReadOnlyRecovery(backend, start, 1);
});

for (const code of [401, 403] as const) {
  test(`HTTP ${code} on GET suspends polling until an explicit authorized check [15,18]`, async ({ page, backend }) => {
    await page.clock.install();
    backend.setOperation("existing-operation", "pending");
    await openRequest(page, false);
    await expect(statusPanel(page)).toContainText("Assignment pending");
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await expect(statusPanel(page).getByRole("button", { name: "Check status", exact: true })).toBeEnabled();
    backend.lifecycleAuthStatus = code;
    await checkStatus(page, backend);
    await page.clock.runFor(1);
    await expect(statusPanel(page)).toContainText("Sign in with the authorized account");
    expect(backend.operationReads.at(-1)?.responseStatus).toBe(code);
    const reads = backend.operationReads.length;
    await backend.setOffline(true);
    await backend.setOffline(false);
    await page.clock.runFor(120000);
    expect(backend.operationReads).toHaveLength(reads);
    expect(backend.assignments).toHaveLength(0);
    backend.lifecycleAuthStatus = null;
    await checkStatus(page, backend);
    await page.clock.runFor(1);
    await expect(statusPanel(page)).not.toContainText("Sign in with the authorized account");
    await expect(statusPanel(page)).toContainText("Assignment pending");
    expect(backend.lifecycleRequests.every((request) => request.method === "GET")).toBe(true);
  });

  test(`HTTP ${code} on POST saves the same intent and prevents retries [15]`, async ({ page, backend }) => {
    backend.createMode = code === 401 ? "auth401" : "auth403";
    await openRequest(page);
    await confirm(page).click();
    await expect.poll(async () => (await savedScope(page))?.operations[0]?.submission).toBe("auth_blocked");
    const key = backend.assignments[0].key!;
    expect(backend.assignments[0].responseStatus).toBe(code);
    await expect(confirm(page)).toBeDisabled();
    const start = backend.lifecycleRequests.length;
    await checkStatus(page, backend);
    expect((await savedScope(page))?.operations).toEqual([
      expect.objectContaining({ operationId: key, providerAccountId: ACCOUNT_ID, submission: "auth_blocked" }),
    ]);
    await expect(confirm(page)).toBeDisabled();
    await expectReadOnlyRecovery(backend, start, 1);
  });
}

test("native storage quota failure at reservation blocks POST and preserves auth [16]", async ({ page, context, backend }) => {
  let rejectedReservations = 0;
  await context.exposeBinding("reportVaReservationQuotaFailure", () => { rejectedReservations++; });
  await context.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key.startsWith("origin-wallet:va-lifecycle:v2:")
        && JSON.parse(value).operations.some((operation: { submission: string }) => operation.submission === "dispatching")) {
        const report = (window as unknown as { reportVaReservationQuotaFailure: () => Promise<void> }).reportVaReservationQuotaFailure;
        void report();
        throw new DOMException("Fixture lifecycle quota exceeded", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  });
  await openRequest(page);
  expect(backend.operationReads.length).toBeGreaterThan(0);
  const originalAuth = await page.evaluate(() => localStorage.getItem("origin-wallet-auth-session"));
  expect(originalAuth).not.toBeNull();
  const attemptWithoutStorage = async (expectedFailures: number) => {
    await confirm(page).click();
    // Count actual rejected writes so a stale error cannot satisfy a later click.
    await expect.poll(() => rejectedReservations).toBe(expectedFailures);
    await expect(page.getByRole("alert").filter({ hasText: "Reliable shared request storage is unavailable" }).last()).toBeVisible();
    // GET refresh may clear the lifecycle error and re-enable the form. Every
    // subsequent manual click must still fail its own durable reservation.
    await checkStatus(page, backend);
    await expect(confirm(page)).toBeEnabled();
    expect(rejectedReservations).toBe(expectedFailures);
    expect(backend.assignments).toHaveLength(0);
    expect(backend.persistedBeforePost).toHaveLength(0);
    expect(backend.requests.every((request) => request.method === "GET")).toBe(true);
    expect((await savedScope(page))?.operations).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("origin-wallet-auth-session"))).toBe(originalAuth);
  };
  await attemptWithoutStorage(1);
  await attemptWithoutStorage(2);
  await page.reload();
  await expect(confirm(page)).toBeEnabled();
  expect(rejectedReservations).toBe(2);
  expect(backend.assignments).toHaveLength(0);
  await attemptWithoutStorage(3);
  await attemptWithoutStorage(4);
});

test("incomplete discovery truthfully exposes more than 20 pages and blocks POST [17]", async ({ page, backend }) => {
  for (let row = 1; row <= 1050; row++) backend.setOperation(`retained-${row.toString().padStart(4, "0")}`, "pending");
  await openRequest(page, false);
  await expect(statusPanel(page)).toContainText("Discovery reached its safety limit");
  await expect(confirm(page)).toBeDisabled();
  const firstTraversal = backend.operationReads.slice(0, 20);
  expect(firstTraversal).toHaveLength(20);
  expect(firstTraversal[0].query.operations_before_id).toBeUndefined();
  const cursors = firstTraversal.slice(1).map((request) => Number(request.query.operations_before_id));
  expect(cursors.every((cursor, index) => cursor > 0 && (index === 0 || cursor < cursors[index - 1]))).toBe(true);
  expect((await savedScope(page))?.operations).toHaveLength(1000);
  expect(backend.assignments).toHaveLength(0);
  expect(backend.lifecycleRequests.every((request) => request.method === "GET")).toBe(true);
});

test("complete pagination follows immutable cursors and recovers account-scoped keys [18]", async ({ page, backend }) => {
  for (let row = 1; row <= 55; row++) backend.setOperation(`page-operation-${row}`, "pending");
  await openRequest(page, false);
  await expect(statusPanel(page)).toContainText("page-operation-1 · Account 7");
  await expect.poll(async () => (await savedScope(page))?.operations.length).toBe(55);
  const first = backend.operationReads[0];
  const second = backend.operationReads[1];
  expect(first.query).toEqual({ operations_unresolved_only: "1" });
  expect(second.query).toEqual({ operations_before_id: "6", operations_unresolved_only: "1" });
  await expect(confirm(page)).toBeDisabled();
  await page.reload();
  await expect(statusPanel(page)).toContainText("page-operation-55 · Account 7");
  expect(backend.assignments).toHaveLength(0);
  expect(backend.lifecycleRequests.every((request) => request.method === "GET")).toBe(true);
});
