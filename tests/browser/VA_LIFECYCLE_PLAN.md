# Phase 3D.4 VA browser lifecycle coverage

The technical lead approved **Playwright Test and Chromium**. This implementation
supersedes the earlier proposal to retain Vitest as the browser runner. The
existing Vitest unit suite and configuration are unchanged.

Status: executable test source is implemented; **no tests or validation commands
were run by the implementer**. Authored coverage is not evidence of a passing
browser run. Use [README.md](./README.md) for manual execution and limitations.

## Files

- `playwright.va.config.ts`: Chromium, explicit timeouts, one worker, zero retries,
  isolated contexts, failure traces/screenshots and dedicated server lifecycle.
- `tests/browser/local-server.mjs`: loopback-only Vite server with no production
  config/env loading, no proxy and a fixed mock API URL.
- `tests/browser/test-origin.mjs`: shared local origin and mock API constants.
- `tests/browser/va-fixtures.ts`: synthetic auth/account/operation/VA/bank payloads.
- `tests/browser/va-backend.ts`: network-boundary routing, deterministic state,
  actual-request ledger, submission barrier and pre-POST persistence assertions.
- `tests/browser/va-browser.ts`: Playwright fixtures and user-visible page helpers.
- `tests/browser/virtual-account-lifecycle.e2e.ts`: executable scenarios below.
- `tests/browser/tsconfig.json`: separate browser-infrastructure type checking.
- `package.json`: `test:va:browser` command. The approved dependency was already
  installed; no dependency/lockfile edit or installation was needed.
- `.gitignore`: exclude local browser artifacts.

## Scenario map

Each row maps to tests in `virtual-account-lifecycle.e2e.ts`. Numbers in test titles
refer to this original 18-scenario matrix. All tests also enforce the network
allowlist and check unexpected API/external requests, CSP violations and page errors.

| ID | Required scenario | Implemented test/assertions |
| --- | --- | --- |
| 1 | Two tabs submit simultaneously | `native tabs...`: both visible native pages enter creation; preflight GET barrier synchronizes competing submissions |
| 2 | Tabs converge on one durable identity | Both pages' localStorage and status panels contain the same provider-account/key tuple and exactly one retained operation |
| 3 | Exactly one assignment POST | Shared actual-request ledger contains one POST in both pending and immediately assigned variants; persisted dispatching record inspected in both pages before response |
| 4 | Reload preserves pending operation/key | `reload and navigation...`: real reload plus request/list/request navigation preserve key, account, original parameters and generation |
| 5 | Nullable HTTP 202 with GET polling | `HTTP 202...`: actual response status/body asserted; VA ID remains null; eight backoff checks use GET; budget exhaustion stops automatic checks |
| 6 | Legacy HTTP 201 pending is not assigned | `HTTP 201...`: actual response contains pending VA, no assigned success, creation disabled, pending list/modal readable |
| 7 | Network timeout preserves intent | `elapsed POST timeout...` holds the response through the real 30-second deadline; `interrupted response...` separately aborts a response and uses native offline/reconnect |
| 8 | Missing operation after timeout cannot authorize POST | Empty discovery plus exact account/key GET keep the same uncertain intent through reload and disable creation |
| 9 | Unknown/manual_review unresolved | Parameterized `unknown`, `manual_review`, and generic legacy `failed` states remain blocked through GET/reload; failure never claims conclusive rejection |
| 10 | Assigned updates VA list | `assignment and banking enrichment...`: pending list becomes assigned with attached VA after an actual polling GET |
| 11 | Banking details appear after enrichment | Pending -> running -> complete updates via VA-list GET; exhausted and legacy-null metadata also covered independently |
| 12 | Both routing pairs render correctly | Modal displays SWIFT/TESTUS00 and ACH/000000001, raw provider GLOBAL and no invented WIRES/intermediary mapping |
| 13 | Open modal refreshes | Same dialog remains open while enrichment and bank fields change; never close/reopen between assertions |
| 14 | 409 mismatch blocks assignment | `account mismatch...`: actual 409, retained mismatch across reload and later assigned exact lookup; no additional POST |
| 15 | Authorization suspends polling | GET 401/403 parameterization stops polling through timer advance and offline/reconnect until explicit check; POST 401/403 retains auth-blocked intent |
| 16 | Storage failure blocks POST | Native lifecycle reservation write throws quota error after successful auth/discovery; zero POSTs before and after reload, auth retained |
| 17 | Incomplete discovery blocks submission | Valid 1,050-row server dataset has 21 pages; frontend retains first 1,000, reports 20-page safety limit and sends no POST |
| 18 | Polling/recovery GET only | Ledger assertions cover status buttons, timers, reload, navigation, reconnect and exact account/key recovery; complete 55-row pagination has decreasing immutable cursors |

## Fixture and coordination rules

Only the browser network boundary is mocked. The real application routes,
AuthProvider, service functions, lifecycle class, hook, Web Locks, localStorage,
storage notifications and generated keys run unchanged. The fault-injection case
selectively fails native lifecycle storage writes; other storage works normally.

All fixtures use one account row per user/provider. No historical-account support
or Safety Ledger behavior is invented. Generic failed fixtures represent legacy
operations, which the backend's unresolved contract includes. Assigned operations
are excluded from unresolved discovery and recovered with explicit account/key GET.

The preflight barrier is armed after both pages finish initial discovery and
eligibility. The POST handler derives the server operation key from the actual
Idempotency-Key and checks body `expected_provider_account_id: 7`. The two tabs
share one backend state and ledger. No lock shim or production control-flow
override is used.

All API responses are served from BrowserContext routes under the fixed local
mock prefix. The Vite server rejects unintercepted mock API traffic and has no
backend proxy. External requests and sockets cannot be forwarded by the harness.
Authentication and banking fixtures are synthetic; no secrets are read.

No production defect was verified during source-only implementation. Browser
execution, cross-engine coverage and backend/provider integration remain separate
review/validation work. No activation, deployment or backend mutation is included.
