# Stage 4 security and functionality audit

Branch: `Stage4-Codex-Review-Security`, starting from main `97eaa2de01debe72aa58af008270971935ac17cb`. Audit performed October 10, 2026. Source inspection, executed handlers, calculation services and UI fixtures are evidence; historical reports and comments are not treated as verification of current behavior.

**Disposition:** confirmed issues below have local fixes. High-risk platform assurance and dependency issues are explicitly blocked. This report does not certify a deployed production application or claim unexecuted tests passed.

## Architecture and test environment

React/Vite uses the existing Base44 SDK client. ProtectedRoute and AuthProvider guard financial routes. dataService scopes reads and mutation ownership; entities define created_by_id RLS. Backend functions authenticate via request-bound clients, with service role reserved for private Plaid credential access and AI integration calls. Plaid transport is fixed to sandbox.plaid.com. Financial math is local deterministic code; backend AI receives server-retrieved records and derived context. Job discovery uses Base44 web-assisted AI, not a dedicated employment API, and is labeled source-linked/unverified.

The local installed dependencies support Vitest/jsdom and actual built-frontend Chromium/Playwright plus axe. Browser APIs, SDK storage and AI/Plaid responses are simulated fixtures. These are end-to-end UI tests against a built app, **not end-to-end hosted-cloud tests**. The live Sandbox harness cannot start without BASE44_TEST_APP_ID and BASE44_TEST_USER_TOKEN; it exited with its explicit blocked state and made no requests. No real bank accounts, real banking credentials or production integrations were used. Secret values were not printed.

## Severity-ranked findings

### S4-01 — High: elevated private-file signing boundary; mitigated locally, platform verification BLOCKED

Affected: `base44/functions/parseResume/entry.ts`.

Reproduction before fix: authenticated caller supplies a different user's private file_uri. The handler forwarded any nonempty URI to service-role CreateFileSignedUrl, then sent the signed content to AI. There was no explicit ownership check in the handler. This verifies a bypass of the user permission boundary in source, **not successful theft from deployed storage**.

Applied fix: sign using the request user's integrations client, restrict input to bounded private/ URIs, keep URLs server-side and short-lived, add document prompt-injection instructions, and replace raw provider errors with generic messages. Tests prove service-role signing is not invoked, nonprivate URIs are rejected, and a denied signing call does not invoke AI.

Remaining high blocker: test two private uploads in a dedicated Base44 app. User B must receive a denial when invoking parseResume with user A's URI; denied requests must never submit the file to AI. The SDK fixture simulates that denial and cannot prove the platform enforces it. Do not restore service-role signing as a workaround.

### S4-02 — High: remaining dependency advisories; BLOCKED migration

Affected: `package-lock.json`, Tailwind build dependency chain.

Reproduction: npm audit --json initially returned 16 advisories (8 high, 5 moderate, 3 low). Compatible npm audit fix --ignore-scripts updated lockfile transitive dependencies with normal integrity checks. Final audit: **11 advisory entries: 5 high, 4 moderate, 2 low, 0 critical**. Entries include inherited advisory chains, not 11 independent exploit paths.

High remaining entries: braces, chokidar, fast-glob, micromatch, tailwindcss. The underlying braces stack-exhaustion issue involves deeply nested patterns; the chain is build tooling rather than a demonstrated remotely reachable frontend exploit. npm recommends a Tailwind 4 major upgrade. The present application uses Tailwind 3 configuration and semantic tokens; forcing that migration is not a safe incidental audit fix. Isolate builds from attacker-controlled patterns/configuration until a separately tested migration removes this chain.

Moderate remaining: postcss-nested, postcss-selector-parser, react-router, react-router-dom. Router advisories include open redirects and SSR hydration; this is a BrowserRouter app with no SSR hydration found, and auth return paths are locally restricted. This is reduced observed reachability, not a claim that the advisory is resolved. Low remaining: quill/react-quill-new; no use of their HTML-export feature was identified in src. Do not call the dependency scan clean.

### S4-03 — High assurance blocker: deployed authorization/admin-role settings unverified

Affected: `base44/entities/*.jsonc`, especially platform-managed `User`, `PlaidCredential`, and all financial entities.

All 13 financial/public connection entities have created_by_id ownership rules for every CRUD action. PlaidCredential has false for every user CRUD rule; backend credential lookup also supplies owner_id and checks Item ownership. Those source assertions and actual handler fixtures pass.

Required reproduction on the dedicated test deployment: create users A/B, test every entity CRUD and backend function with B supplying A's IDs, including list filters, bulk/upsert paths, private file URIs and Plaid Item IDs. Repeat with app-admin role. Verify ordinary users cannot elevate User.role through SDK calls, confirm service-role secrets are not frontend-readable, and apply the revised schemas/functions. Live RLS enforcement, role mutability, storage permissions, token TTL/revocation, email verification, reset delivery and OAuth grants require Base44 settings/accounts. No platform takeover or deployed cross-user exposure was demonstrated; verification is blocked, not passed.

### S4-04 — Medium: AI categorization crosses active datasets and trusts output labels; FIXED locally

Affected: `base44/functions/suggestCategories/entry.ts`, `src/pages/BillsBudget.jsx`.

Reproduction before fix: user A has ordinary and demo Power transactions; invoke suggestCategories while in the demo. Queries only checked A's ownership, so both datasets could be modified. A model-provided arbitrary category was accepted, and single-page retrieval truncated records.

Fix: browser sends active dataset; backend applies datasetQuery to transactions/categories, paginates records, encodes merchant names as untrusted JSON, accepts mappings only for transmitted names and allowed standard/user budget labels, and hides raw errors. Tests verify another user and another dataset are untouched, pagination is followed and fabricated mappings do not write.

### S4-05 — Medium: financial projection trusts an AI-selected annual amount; FIXED locally

Affected: `base44/functions/projectAnnualIncome/entry.ts`.

Reproduction before fix: source name/other browser inputs were inserted into a prompt, and arbitrary annual_amount returned by the model was accepted as the projection. The prompt invited speculation about bonuses/overtime beyond recorded amounts. Invalid inputs could become zero or monthly by default.

Fix: deterministic amount × known annual frequency, cent rounding, strict finite positive numeric input/frequency validation, explicit explanation excluding unrecorded adjustments, and generic failures. No AI call is needed. Tests cover all seven frequencies, injection-like names and invalid amounts. Existing response fields are preserved. No claim that browser-entered inputs are independently verified earnings.

### S4-06 — Medium: stale session/dataset results can appear after a boundary change; FIXED locally

Affected: `src/lib/AuthContext.jsx`, `src/App.jsx`, `src/services/assistantService.js`, `src/services/dataService.js`.

Reproduction: defer auth.me, sign out, then resolve the older verification; without a generation guard it can restore an authenticated React state. Ask Avera could return ordinary context after the same user switches to Demo Mode. Owned record IDs could be edited/deleted outside the active dataset, and update payloads could retag records.

Fix: authentication generation counter invalidates pending verification on logout; financial layout remounts on user changes; assistant responses check dataset identity before display; dataService mutation checks active dataset and strips demo retagging. RLS remains the cross-user security boundary. Tests reproduce logout race, dataset switching, outside-dataset mutation rejection and retag prevention.

### S4-07 — Medium: concurrent goal contributions lose updates; FAILED, unresolved

Affected: `src/pages/BillsBudget.jsx` contribution handler, `src/services/dataService.js`; existing expected-failure test in `tests/integration.test.jsx`.

Reproduction: two sessions read the same saved_amount and each writes saved_amount + contribution; last write wins. The existing test still reports expected failure. Client-side serialization cannot make multiple sessions atomic. Resolution needs an authenticated atomic backend increment/transaction or append-only contribution records with an agreed migration; do not claim this behavior passed.

### S4-08 — Medium residual: live AI claims/prompt injection, rates and financial plan differences

Affected: `base44/functions/askAvera/entry.ts`, `base44/shared/assistantInsights.ts`, `base44/shared/opportunitySource.ts`, `base44/functions/suggestBills/entry.ts`.

Ask retrieval never accepts browser-provided user IDs or financial context, and has no tools that let the model query another user. Explicit prompts treat records as untrusted. Bills AI selects indexes from deterministic recurrence candidates; raw amounts and dates remain server-derived. Markdown links/images are suppressed. These are verified boundaries, not proof that every live answer is accurate. Financial prose is not fully mechanically validated; a live adversarial model evaluation is NOT TESTED. API cost/rate limits must be confirmed in platform settings; no application-level durable per-user rate limiter was identified.

Yearly Plan/goal capacity currently adds category limits to bills; Overview uses category-inclusive planning. Ask explains overlaps, but the application has differing definitions. Do not use ambiguous surplus as assured affordability. Simultaneous bill-suggestion saves have no proven unique/transactional guarantee; sequential retry checks are covered.

### S4-09 — Low: stale browser audit fixtures; repaired selectors, results recorded separately

Affected: `tests/browser-smoke.cjs`, `tests/stage3-browser.cjs`.

Initial runners failed because mode fixtures used a retired unscoped key, a retired /goals-opportunities route, old account access assumptions and reset controls hidden in the compact chat demo disclosure. Adjusted tests use scoped mode, current Opportunities route, Bills Goals tab and actual disclosure controls. Failures are not waived; executed final outcomes are listed below. Older audit docs describe historical states and are not current deployment proof.

## Passed boundaries and practical limitations

- Sandbox host and public/access token prefixes are enforced server-side; credentials are retrieved only from secure server bindings/private vault. Private cursor is authoritative even when editable public Item metadata changes. Static inspection and tests pass; live Link is blocked.
- Sync pagination, mutation restart, pending replacements, modified/removed transactions, stable upsert keys, duplicate cleanup, invalid dates/currency and deferred cursor commit are exercised in backend fixtures. Partial disconnect retries preserve credentials until cleanup finishes; manual records are not deleted by imported-record cleanup.
- Financial calculation tests cover frequencies, cents, calendar recurrence, cash vs liabilities, equity, transfers and provider deduplication. Existing contribution concurrency failure is explicitly excluded from passes.
- Demo removal uses authenticated owner plus recognized demo tags; ordinary/other-user records remain in fixtures. Disconnect validates the private credential's demo tag before demo-only cleanup. Browser confirmation checks do not certify deployed deletion behavior.
- Current-source scans found no matching private-key, live-provider or production-Plaid token patterns. This is a bounded pattern scan and source review, not proof against all secrets in Git history, deployed assets, platform logs or analytics settings. Console output in auth is generic; raw provider error leakage was removed from three functions.
- Browser storage contains SDK auth tokens, theme, owner-scoped mode/workspace metadata, category-dismissal preferences and table column preferences. No Plaid access token or balance cache was found there. SDK localStorage bearer tokens remain readable to same-origin JavaScript: confirm platform-supported session policy/CSP and audit third-party scripts. Do not replace SDK auth storage blindly.
- No application-level full user-account deletion endpoint was identified. Individual accounts have owned CRUD and confirmation; full account erasure is platform/manual scope and NOT TESTED.
- UI rendering uses existing semantic tokens and shared components. No new UI components were introduced in fixes; account-key remount and categorization payload changes preserve styling. Automated responsiveness/axe checks use simulated records; manual screen-reader use and real device keyboards are NOT TESTED.

## Verification results

Final command results and browser counts are appended after all runners complete. Logs are retained outside the repository in /tmp/stage4-*; fixture screenshots are under /tmp. No credentials or financial records are included in this report.

| Area | Result | Evidence / limit |
|---|---|---|
| Authentication route gates and late logout response | Passed locally | Route/auth tests and generation-race regression; cloud TTL, revocation, email/OAuth blocked |
| Financial user/dataset boundaries | Passed locally / Blocked live | RLS source assertions, handler queries, active-dataset regression tests; deployed two-user/admin testing required |
| Private resume ownership | Blocked (high) | Elevated signing removed; actual platform signing denial not executed |
| Plaid credentials and Sandbox restriction | Passed locally / Blocked live | Vault rules, ownership, fixed transport, exchange/sync/disconnect fixtures; no real Link test |
| Sync recovery and transaction deduplication | Passed locally | Backend delta, partial failure, deletion and idempotency fixtures |
| Calculation precision and annual projection | Passed locally | Deterministic frequencies/goal/cash/equity tests; no AI-selected annual result |
| Goal contribution concurrency | Failed (medium) | One existing expected-failure reproduction; atomic persistence unresolved |
| AI retrieval boundaries | Passed locally | Server scoped records; browser context ignored; unsafe category labels rejected |
| Live AI claims / adversarial prompt behavior | Not Tested | Prompt constraints and renderer sanitization are not a live model correctness guarantee |
| External employment search | Passed fixtures / Not Tested live | Web-assisted, source-linked/unverified; dedicated jobs API not configured |
| Secrets and logs | Passed bounded source review | No current-source matching secret patterns; generic backend errors; history and platform logs not certified |
| Demo/individual financial-record deletion | Passed locally / Blocked live | Owner/demo filters, confirmation, private-tag check and recovery fixtures |
| Full account erasure | Not Tested | No application endpoint; platform erasure and retention settings require manual validation |
| Dependencies | Blocked (high) | 11 residual advisory entries, including 5 high build-chain entries |
| Mobile and accessibility | Passed executed fixture suites | Four widths and both themes; manual screen-reader/device validation not tested |

### Final executed outcomes

| Command / runner | Result |
|---|---|
| npm test | **Passed:** 12 files; 253 tests passed. **Failed behavior:** 1 pre-existing expected failure for concurrent goal contributions. 254 total tests. |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm run typecheck:backend | Passed; expanded coverage includes every backend function and shared module |
| npm run build | Passed; existing large-bundle warning remains |
| npm run test:browser (modernized fixtures) | Passed: 72 page checks plus dialog/state assertions; zero reported axe violations |
| tests/stage3-browser.cjs | Passed: 144 fixture checks; zero reported axe violations |
| tests/persistence-followup-browser.cjs | Passed: 72 fixture checks |
| tests/overview-charts-browser.cjs | Passed: 72 fixture checks; zero reported axe violations |
| tests/chat-layout-browser.cjs | Passed: 84 fixture checks; zero reported axe violations |
| tests/bill-suggestions-browser.cjs | Passed: 8 viewport/theme combinations; zero reported axe violations |
| npm audit --json after compatible fixes | **Failed security scan:** 11 residual advisory entries, 5 high / 4 moderate / 2 low, no critical |
| tests/live-sandbox.mjs | **Blocked:** missing test-app ID and user token; explicit exit 2, no network requests |
| git diff --check | Passed |

Browser totals aggregate to 452 reported checks/page cases, with differing scopes; they are not 452 independent full-cloud workflows. Every reported browser suite completed. Initial stale-selector failures were investigated and rerun successfully after test maintenance. The final saved-note wording change does not alter visual layout or financial behavior; it passed the final unit, lint, type and build checks.

### Required external follow-up

1. Deploy the revised functions and existing ownership schemas to a dedicated Base44 test app. Configure only Sandbox Plaid secrets in its secure server bindings. Provision two disposable users, including an admin test role; never use real bank accounts.
2. Verify user role cannot be escalated through SDK updates. For each financial entity test list/get/create/update/delete, bulk and upsert with another user's record IDs. Verify PlaidCredential is denied to all ordinary/admin browser clients. If platform admins bypass ownership rules, document and constrain administrative access before sign-off.
3. Upload distinct private resumes with users A/B, then attempt user B's parseResume request using A's file_uri. Require denial before AI invocation; inspect redacted platform logs for no signed URLs or document content. Confirm valid owner uploads still work with user-scoped signing.
4. Run manual real Plaid Link using Sandbox institutions. Complete exchange/sync, repeat sync, force expired/revoked Item behavior, reconnect/disconnect and confirm ordinary user records survive. Run the programmatic Sandbox harness after test bindings are configured.
5. Run adversarial Ask Avera and opportunity prompts against owned ordinary/demo records, covering misleading merchant names, missing/invalid data, contradictory totals, stale balances, gross/net ambiguity and provider failures. Human review must confirm every financial claim is traceable and no fabricated listing is presented as verified.
6. Plan and validate the dependency migration addressing the residual high build-chain advisory, and moderate router/PostCSS issues. Re-run security scans and design-system/browser suites before replacing the current toolchain. Confirm platform CSP, session settings, sensitive-log controls, rate limits, full-account erasure and retention policy.

Audit work is complete with high-priority blockers explicitly documented. **Deployment/security sign-off remains blocked** by S4-01–03; no critical deployed exploit was verified, and no claim of a clean dependency scan or live-cloud acceptance is made. At audit completion, changes were local and had not been committed, pushed or deployed.

## Branch synchronization follow-up

The preserved Stage 4 fixes were applied on top of main `2d42e5cd1f6a0dca32e9c62b313d2abe467b67d7` on Stage5-Codex-Predployment-review. This preserves the subsequent Plaid changes already on main. Revalidation on that combined code passed 253 tests with the existing one expected failure, lint, frontend/backend type checks and production build. The earlier live-platform and dependency blockers remain; synchronization does not certify deployment or add live test evidence.
