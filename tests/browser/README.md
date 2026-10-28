# VA browser E2E

Runner: **Playwright Test**, Chromium only. `@playwright/test` 1.64.1 is already
declared and installed in this workspace. The suite does not use Vitest Browser
Mode. The existing Vitest configuration is unchanged.

## Running locally

Use Node 20 or later, installed project dependencies, and the matching Playwright
Chromium binary. If Chromium is missing, the user can install it explicitly:

```bash
cd /home/dtd1201/projects/origin-wallet-platform
npx --no-install playwright install chromium
```

No browser, package or operating-system installation was executed during
implementation. Do not automatically invoke `--with-deps`; any missing OS
prerequisites require a separate local setup decision.

```bash
# Full Chromium suite. Starts/stops its own loopback Vite server.
npm run test:va:browser

# Only the native-tab reservation cases.
npm run test:va:browser -- --grep 'native tabs'

# Separate browser-infrastructure type check; excludes unrelated app pages.
npx --no-install tsc -p tests/browser/tsconfig.json --noEmit

# Focused source lint.
npx --no-install eslint playwright.va.config.ts tests/browser/*.ts

git diff --check
```

These commands are for manual execution. None was run during implementation.
The default 90-second test timeout permits the genuine 30-second application
deadline test. Automatic test retries are disabled.

The server binds **127.0.0.1:4179**, refuses an occupied port and is never reused.
Do not start the normal development server, Laravel, a provider service or a
production build for these tests. No environment file or credentials are needed.

## Isolation and fixtures

- Every test receives a fresh BrowserContext and synthetic local auth session.
  The two-tab cases create two native pages in that same context. Native Web
  Locks, localStorage, crypto keys and storage events are not replaced.
- The dedicated Vite server loads neither `vite.config.ts` nor env files, exports
  no inherited VITE environment variables, and defines only the loopback mock API
  URL and test auth configuration. There is no proxy. Any API request reaching
  the server instead of a browser mock receives an error.
- Context-level routes are installed before application pages open. Exact mock
  API routes return fixture JSON; unexpected routes and external requests are
  aborted and fail the test. Only local application documents/assets may reach
  Vite. Service workers and unexpected WebSockets are blocked; only Vite's exact
  loopback dev-client socket is allowed. Server-side HMR updates are disabled.
- Test-only HTML transformation removes external links/scripts for fonts and
  translation. English UI uses fallback fonts. A CSP restricts resource/connect
  origins to self, and CSP violation events fail the test. Production HTML and
  frontend business logic are untouched.
- The mock user is `41`, provider is `nium`, and the one provider-account row is
  `7`. Operation history stays on that row. Cursor row IDs are separate from the
  account/caller-key identity. No historical replacement account rows are invented.
- Fixtures cover pending/unknown/manual_review/failed/assigned projections,
  nullable 202 VA, legacy pending 201, all enrichment states, 409, 401/403,
  interrupted responses and a held request reaching the production timeout.
- Authentication failures target lifecycle requests after successful auth setup.
  Storage faults wrap native writes only for lifecycle reservation data, leaving
  normal auth storage and native locking intact.
- The shared ledger is populated by actual browser Request events. Assertions
  verify POST counts, caller keys, body account preconditions, exact GET lookup
  parameters and GET-only recovery. The POST handler checks durable storage in
  every page before releasing its response.

## Evidence and limitations

Failures retain traces and screenshots under `test-results/va-browser/`. The HTML
report is under `playwright-report/va-browser/`. Each test attaches the synthetic
request ledger and network-isolation issues. Both artifact directories are ignored
by Git. Traces contain a fake auth token and fake bank details only.

The scenarios are authored, **not executed or claimed passing**. This validates a
development-served frontend against mock contracts, not a Laravel/provider
integration or production build. No real NIUM request or production access is
needed or permitted.

Initial coverage is Chromium headless. Headful tab visibility, other browser
engines, other devices/profiles and older application versions remain outside
this suite. The native-tab tests assert visible pages instead of overriding
visibility or forcing disabled clicks. Timer tests use Playwright's browser clock;
the timeout test uses the real application deadline. Offline recovery uses the
browser's offline mode plus deterministic API aborts, not an actual interrupted
network connection.

See [VA_LIFECYCLE_PLAN.md](./VA_LIFECYCLE_PLAN.md) for the implemented scenario map.
No production defect has been verified by execution. Report any failure indicating
a production defect before changing application logic.
