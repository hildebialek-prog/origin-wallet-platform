# Customer and Admin UI polish report

Implemented in `origin-wallet-platform` (Customer) and the separate `admin_origin_wallet` application. This pass changes frontend presentation and adds local verification coverage.

**Completed improvements**

- Customer Home: clearer account overview, balance hierarchy, quick actions, virtual-account cards and recent activity; improved spacing, card treatment and long company-name wrapping. Existing readiness and KYC calculations are preserved.
- Balances: replaced the misleading `mixed` sum with a summary of the displayed records. One currency shows its available total; multiple currencies show the currency count and codes with “Shown in original currencies. No conversion applied.” Available, Ledger and Reserved retain their values, with aligned tabular numbers, currency avatars, readable references and a keyboard-focusable scrolling table.
- Transactions: currency visuals, amount hierarchy, debit/credit icons and direction text, wrapping descriptions/references and clearer metadata. Existing sign formatting, amounts, fees, classification, search, export, pagination and sync behavior are preserved.
- Beneficiaries: wrapping names, clearer bank hierarchy, currency badges, larger edit/delete targets, accessible action names and native title tooltips. Existing masking, forms and validations are preserved.
- Move Funds: consistent currency presentation across details, summary, review, results and activity; responsive stepper with current/completed semantics; corrected stretched desktop card layout. Existing processing-dependent fee/amount wording and payment guards are preserved.
- Admin Transfers: clearer references, actual provider display, currency amounts, distinct approval-required/pending/completed/failed colors, improved signal cards, Review/Sync controls and responsive table/cards. The review modal scrolls within the viewport.
- Admin RFI: readable filters, explicit exclusive selection, clear focus/hover/disabled styling, responsive controls, wrapping customer/provider text, semantic workflow badges, visible provider status and clearer timestamp labels/dividers. Customer/provider requests, workflow state and webhook history remain distinct.
- Shared styling uses currency-specific classes and scoped `.wallet-ui` rules. Dark Admin navigation is unchanged; foreground resets apply to the affected light content surfaces.

**Admin RFI filter diagnosis and result**

Before: the dark Admin shell supplies inherited white foreground text. Light RFI controls without explicit foreground colors consequently looked faint or disabled. The operational filter state was already a single mutually exclusive value; the appearance did not reliably communicate that state.

After: `FilterChip` provides explicit readable text, borders and surfaces, a dark green selected state, `aria-pressed`, visible keyboard focus and native disabled presentation. Only the filter matching the existing operational state appears selected. `All requests` still resets only that operational filter; other backend filters retain their original behavior.

Scope and Workflow state are existing Select controls. Provider status is an existing text input and remains one. These controls were not disabled by business logic; their faded appearance was a styling defect. No disabled expression or action guard was relaxed.

Browser checks measured at least 4.5:1 text contrast for selected/unselected operational filters and the RFI filter control. Component tests cover native disabled filter behavior without introducing disabled states into the page.

**Currency visual design**

Both applications contain matching reusable `CurrencyAvatar`, `CurrencyBadge` and `CurrencyDisplay` components. They use native currency symbols and local CSS, compact/regular sizes, restrained distinct colors, visible currency codes and accessible labels. Unknown codes retain their code with neutral artwork; missing codes have a neutral fallback. Avatars are decorative when accompanying text supplies the currency information.

Supported currencies: USD, EUR, GBP, HKD, SGD, CNY, JPY, VND, AUD, CAD, AED and THB. No flags, remote image services, licensed third-party artwork or new dependencies were added.

**Changed files — Customer**

Paths relative to `/home/dtd1201/projects/origin-wallet-platform`:

- `src/pages/account/AccountDashboard.tsx`
- `src/pages/account/AccountBalances.tsx`
- `src/pages/account/AccountTransactions.tsx`
- `src/pages/account/AccountBeneficiaries.tsx`
- `src/pages/account/AccountTransfers.tsx`
- `src/lib/money.ts` — presentation-only color distinction for approval-required status.
- `src/components/account/BalanceSummary.tsx` — new.
- `src/components/account/BalanceSummary.test.tsx` — new.
- `playwright.ui.config.ts` — new isolated responsive verification configuration.
- `tests/browser/ui-admin-server.mjs` — new isolated server for the sibling Admin app.
- `tests/browser/ui-polish.spec.ts` — new verification of both apps.
- `docs/ui-polish-report.md` — this report.

**Changed files — Admin**

Paths relative to `/home/dtd1201/projects/admin_origin_wallet`:

- `src/pages/admin/AdminTransactions.tsx`
- `src/pages/admin/AdminTransactions.test.tsx`
- `src/pages/admin/AdminRfiCases.tsx`
- `src/pages/admin/AdminRfiCases.test.tsx`

**Changed files — Shared components and styles**

New in both applications:

- `src/components/shared/CurrencyDisplay.tsx`
- `src/components/shared/CurrencyDisplay.test.tsx`
- `src/styles/wallet-ui.css` — common currency/screen styling, plus Admin-only RFI styles in Admin.

New in Admin:

- `src/components/shared/FilterChip.tsx`
- `src/components/shared/FilterChip.test.tsx`

**Validation results**

| Check | Customer | Admin |
| --- | --- | --- |
| `npm test` | 203 tests / 19 files passed | 193 tests / 18 files passed |
| `npm run lint` | 0 errors; 22 existing warnings | 0 errors; 16 existing warnings |
| `npx tsc --noEmit -p tsconfig.app.json` | 6 existing errors; output identical to baseline | 6 existing errors; output identical to baseline |
| `npm run build` | Passed | Passed |
| `git diff --check` | Passed | Passed |

New focused coverage includes all currency identities and unknown/missing fallback, single/multiple/empty balance summaries, filter selected/disabled state, transfer status presentation and existing payment action restrictions. Existing payment and RFI workflow suites also pass.

From the Customer repository:

- `npx playwright test --config=playwright.ui.config.ts`: all 6 checks passed, covering both applications at all three required widths.
- `npx tsc --noEmit -p tests/browser/tsconfig.json`: passed.
- `npx playwright test --config=playwright.va.config.ts`: 19 passed, 1 confirmed pre-existing failure, described below.
- Source AST comparison against HEAD confirmed unchanged query/mutation/effect/state/memo calls and existing action-handler/disabled expressions across all seven target screens. No API service or contract files changed.
- Whitespace checks also cover new files, which are not included in ordinary unstaged `git diff --check` output.

**Responsive and interaction verification**

| Viewport | Result |
| --- | --- |
| Desktop, 1440px | All seven screens and payment details/review passed |
| Tablet, 768px | All seven screens and payment details/review passed |
| Mobile, 390px | All seven screens and payment details/review passed |

Checks cover document overflow, contained scrolling tables, long customer names/references, populated virtual-account cards, card stacking, currency alignment, filter wrapping, keyboard focus, debit/credit labels, exclusive RFI selection and reset behavior. Payment review is reached with valid fixture inputs; the tests verify existing action states without creating or submitting a payment. Screenshots are stored under ignored `test-results/ui-polish/` in the Customer repository.

Browser verification uses synthetic local fixtures, disables environment-file loading, intercepts API calls and blocks mutations and external requests. The new browser harness expects the Admin repository at the sibling path `../admin_origin_wallet`.

**Remaining blockers and limitations**

- Both full application TypeScript checks remain blocked by pre-existing errors. Customer: `AccountKyc.tsx` challenge/liveness fields, `AccountRfi.tsx` target-library support for `replaceAll`, and `moneyMovementService.ts` payload typing. Admin: `apiBlob.test.ts` error shape, `AdminKycReviews.tsx` provider/document types, and `AdminLogin.tsx` cooldown field. Compiler output was compared byte-for-byte against baseline and is unchanged.
- Existing virtual-account browser test `tests/browser/virtual-account-lifecycle.e2e.ts:174` fails at line 205 because it asserts the details dialog must not contain `WIRES`. The unchanged dialog correctly retains `Requested account type WIRES` alongside `Provider account type GLOBAL`. The same failure was reproduced from an untouched HEAD archive under `/tmp/ow-ui-original-baseline`. Neither that screen nor its test was modified.
- Builds retain Browserslist data-age warnings; the Customer build also retains its large-chunk warning. No dependency or bundling changes were made.
- Responsive checks use Chromium with mocked data. They establish frontend layout and interaction behavior, not live integration or payout readiness, and are not a complete cross-browser or accessibility audit.

**Boundary confirmation**

No backend, NIUM API, payout logic, RFI workflow transition, database, API-contract, authentication or permission changes were made in this UI pass. Existing financial handlers, amounts, FX/fee behavior, idempotency and action restrictions were preserved. No live NIUM/backend requests, Production operations, commits, pushes or deployments were performed. Existing backend working-tree changes were left untouched.
