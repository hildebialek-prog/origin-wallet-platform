import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { session as baseSession } from "./va-fixtures";

// Synthetic browser fixtures only. Every API call is intercepted locally and all
// mutation requests are blocked; no test can contact a backend or NIUM.
const longName = "UI Fixture International Technology and Sustainable Infrastructure Trading Company Limited";
const provider = { id: 1, code: "nium", name: "Nium", status: "active", supports_transfers: true, supports_beneficiaries: true, supports_data_sync: true };
const session = { ...baseSession, user: { ...baseSession.user, name: longName }, providers: [provider] };
const beneficiary = { id: 1, user_id: 41, provider_id: 1, full_name: longName, beneficiary_type: "business", country_code: "HK", currency: "USD", payout_method: "SWIFT", status: "active", bank_name: "UI Fixture International Bank", account_number: "****1234", updated_at: "2026-10-28T12:00:00Z" };
const balance = { id: 1, user_id: 41, provider_id: 1, currency: "USD", available_balance: "75.00", ledger_balance: "80.00", reserved_balance: "5.00", external_account_id: "wallet-reference-".repeat(8), as_of: "2026-10-28T12:00:00Z" };
const transfers = ["approval_required", "pending", "completed", "failed", "submission_unknown"].map((status, index) => ({ id: index + 1, user_id: 41, provider_id: 1, transfer_no: `UI-FIXTURE-TRANSFER-${index}`, source_currency: "USD", target_currency: "USD", source_amount: "5.00", target_amount: null, status, transfer_type: "payout", beneficiary_id: 1, beneficiary, provider, user: { email: "fixture@example.test", full_name: longName }, created_at: "2026-10-28T12:00:00Z", approvals: [] }));
const cases = ["new", "sent_to_user", "user_submitted", "reconciled"].map((submission_state, index) => ({ id: index + 1, customer_id: 41, business_name: longName, scope: "customer", origin: "authoritative_fetch", status: "requested", provider_status: "RFI_REQUESTED", submission_state, template_name: "Corporate document request", provider_remarks: "Provide the current company documents and explain the source of funds. " + "LongProviderReference".repeat(16), required_document_count: 2, created_at: "2026-10-28T12:00:00Z", customer_submitted_at: null, admin_approved_at: null, provider_responded_at: null }));
const adminUser = { id: 1, email: "admin-ui@example.test", full_name: "UI Fixture Administrator", status: "active", kyc_status: "verified", roles: ["admin"] };
const pageResponse = (data: unknown[]) => ({ data, current_page: 1, last_page: 1, total: data.length });

async function installMocks(page: Page, admin = false) {
  const origin = admin ? "http://127.0.0.1:4181" : "http://127.0.0.1:4179";
  const prefix = admin ? "/__ui_mock_api" : "/__va_mock_api";
  const issues: string[] = [];
  page.on("pageerror", (error) => issues.push(error.message));
  await page.addInitScript(({ admin, session, adminUser }) => {
    localStorage.setItem("website_language", "en");
    if (admin) sessionStorage.setItem("origin_wallet_admin_token", JSON.stringify({ version: 1, created_at: new Date().toISOString(), token: "ui-test-token", user: adminUser }));
    else localStorage.setItem("origin-wallet-auth-session", JSON.stringify(session));
  }, { admin, session, adminUser });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      issues.push(`External request blocked: ${url.origin}`);
      return route.abort();
    }
    if (!url.pathname.startsWith(prefix)) return route.continue();
    if (request.method() !== "GET") {
      issues.push(`Mutation blocked: ${request.method()} ${url.pathname}`);
      return route.abort();
    }
    const path = url.pathname.slice(prefix.length);
    let body: unknown;
    if (path === "/auth/me") body = session;
    else if (path === "/admin/auth/me") body = { user: adminUser };
    else if (path === "/providers") body = { data: [provider] };
    else if (path.endsWith("/balances")) body = [balance, { ...balance, id: 2, currency: "EUR", available_balance: "20.00" }];
    else if (path.endsWith("/beneficiaries")) body = [beneficiary];
    else if (path === "/admin/transfers") body = pageResponse(transfers);
    else if (path === "/admin/nium-rfi-cases") body = pageResponse(cases);
    else if (path.endsWith("/transfers")) body = transfers;
    else if (path.endsWith("/transactions")) body = ["credit", "debit"].map((direction, index) => ({ id: index + 1, provider_id: 1, currency: "USD", amount: "5.00", fee_amount: "0.50", direction, status: "completed", transaction_type: "payout", description: longName, reference_text: "fixture-reference-".repeat(8), booked_at: "2026-10-28T12:00:00Z" }));
    else if (path.endsWith("/kyc-profile")) body = { kyc_profile: { status: "verified", applicant_type: "business", business_name: longName, documents: [] } };
    else if (path.endsWith("/virtual-accounts")) body = { data: [{ id: 1, currency: "USD", status: "assigned", provider_payment_id: "UI-FIXTURE-VA", virtual_account_reference: "fixture-va-reference", account_type: "LOCAL", account_category: "CORPORATE" }] };
    else if (path.endsWith("/nium-purpose-codes")) body = { data: [{ code: "IR01811", label: "General goods" }] };
    else { issues.push(`Unexpected API: ${path}`); return route.fulfill({ status: 503, body: "Unmocked API" }); }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  return { origin, issues };
}

async function checkLayout(page: Page, info: TestInfo, name: string) {
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll(".wallet-ui, .wallet-ui *")).filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width > 0 && (box.left < 0 || box.right > innerWidth) && !el.closest(".wallet-table-scroll");
  }).map((el) => ({ tag: el.tagName, className: el.className, width: el.getBoundingClientRect().width })).slice(0, 12));
  expect(overflow, `Uncontained overflow on ${name}`).toEqual([]);
  const pageSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, viewport: innerWidth,
    overflow: Array.from(document.querySelectorAll("body *")).filter((el) => el.getBoundingClientRect().right > innerWidth && !el.closest(".wallet-table-scroll")).map((el) => ({ tag: el.tagName, classes: String(el.className), right: el.getBoundingClientRect().right })).slice(0, 15),
  }));
  expect(pageSize.width, `${name}: ${JSON.stringify(pageSize)}`).toBeLessThanOrEqual(pageSize.viewport);
  await expect(page.locator(".wallet-ui")).toBeVisible();
  const bounds = await page.locator(".wallet-ui").boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true });
}

async function contrast(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const values = (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((value) => { const n = value / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; });
      return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    };
    const a = luminance(style.color), b = luminance(style.backgroundColor);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
}

test("customer wallet screens and guarded payment wizard", async ({ page }, info) => {
  const { origin, issues } = await installMocks(page);
  for (const [path, marker] of [["/account", "Account overview"], ["/account/balances", "Balances by currency"], ["/account/transactions", "Transactions"], ["/account/beneficiaries", "Beneficiaries"], ["/account/transfers", "Move funds"]]) {
    await page.goto(origin + path);
    await expect(page.locator(".wallet-ui")).toContainText(marker);
    await expect(page.locator(".currency-avatar").first()).toBeVisible();
    await checkLayout(page, info, path.split("/").pop() || "dashboard");
    if (path === "/account") await expect(page.getByText("UI-FIXTURE-VA", { exact: true })).toBeVisible();
    if (path.endsWith("balances")) {
      await expect(page.getByLabel("Displayed balance summary")).not.toContainText("95.00");
      await page.getByRole("textbox", { name: "Search balances" }).fill("USD");
      await expect(page.getByLabel("Displayed balance summary")).toContainText("USD 75.00");
    }
    if (path.endsWith("transactions")) {
      await expect(page.locator(".wallet-ui")).toContainText("credit");
      await expect(page.locator(".wallet-ui")).toContainText("debit");
    }
  }
  // Creating/approving/submitting a transfer is intentionally never invoked.
  await expect(page.getByRole("button", { name: "Submit payment", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sync", exact: true }).first()).toBeDisabled();
  await page.getByRole("button", { name: new RegExp(longName) }).first().click();
  await expect(page.getByRole("heading", { name: "Complete payment details" })).toBeVisible();
  await expect(page.locator(".wallet-ui")).toContainText("Determined during processing");
  await checkLayout(page, info, "payment-details");
  await page.getByPlaceholder("Enter an amount").fill("5.00");
  await page.getByText("Select payment purpose", { exact: true }).click();
  await page.getByRole("option", { name: "General goods", exact: true }).click();
  await page.getByPlaceholder("INV-2026-001, PO-12345").fill("UI-FIXTURE-INVOICE");
  await page.getByRole("button", { name: "Review payment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review before submitting" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create payment request", exact: true })).toBeEnabled();
  await checkLayout(page, info, "payment-review");
  expect(issues).toEqual([]);
});

test("admin RFI contrast and exclusive filters, transfer queue", async ({ page }, info) => {
  const { origin, issues } = await installMocks(page, true);
  await page.goto(`${origin}/admin/rfi-cases`);
  await expect(page.getByRole("heading", { name: longName })).toBeVisible();
  const filters = page.getByLabel("Operational filters");
  await expect(filters.getByRole("button", { pressed: true })).toHaveCount(1);
  expect(await contrast(page, '.wallet-filter[aria-pressed="true"]')).toBeGreaterThanOrEqual(4.5);
  expect(await contrast(page, '.wallet-filter[aria-pressed="false"]')).toBeGreaterThanOrEqual(4.5);
  expect(await contrast(page, ".rfi-filter-control")).toBeGreaterThanOrEqual(4.5);
  await filters.getByRole("button", { name: "With customer" }).click();
  await expect(filters.getByRole("button", { name: "With customer", pressed: true })).toBeVisible();
  await expect(filters.getByRole("button", { name: "All requests", pressed: false })).toBeVisible();
  await expect(page.locator(".rfi-request-card")).toHaveCount(1);
  await filters.getByRole("button", { name: "All requests" }).click();
  await expect(page.locator(".rfi-request-card")).toHaveCount(4);
  await filters.getByRole("button", { name: "Needs action" }).focus();
  await expect(filters.getByRole("button", { name: "Needs action" })).toBeFocused();
  await expect(page.getByLabel("Filter by scope")).toBeEnabled();
  await expect(page.getByLabel("Filter by submission state")).toBeEnabled();
  await checkLayout(page, info, "admin-rfi");
  await page.goto(`${origin}/admin/transactions`);
  await expect(page.getByText("UI-FIXTURE-TRANSFER-0").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Approval required").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("Pending", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await checkLayout(page, info, "admin-transfers");
  expect(issues).toEqual([]);
});
