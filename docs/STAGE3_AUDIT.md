# Avera Stage 3 security and functionality audit

Audit date: 2026-10-10. Branch: `stage3-codex-review`. Starting revision: `a67fb1aba7260744fc9aecfbc31f994f144f5270`.

**Stage 3 does not pass acceptance.** Verified defects were repaired in the existing Base44/React architecture. Real Plaid Link, hosted authorization, durable persistence, and independent authenticated users remain unverified. Feedback submission is absent, and matching manual entries to imported transactions remains unresolved. The audit did not deploy these changes. Consult branch history for commit and push status.

## Evidence and integration status

- **Source inspection:** actual entities, backend functions, Plaid requests, SDK boundaries, dataset filters, calculation services, and rendered UI. Secret values were not read or printed. Environment binding names/presence were checked; no test app is linked in `base44/.app.jsonc`.
- **Executed fixtures:** Vitest executes the actual backend handlers with mocked SDK/database and Plaid responses. React integration tests exercise the persistence services and UI. Chromium exercises the actual frontend with intercepted API responses; external services are blocked.
- **Live integration — Blocked:** `node tests/live-sandbox.mjs` exited **2** because `BASE44_TEST_APP_ID` and `BASE44_TEST_USER_TOKEN` are absent. **No network requests were executed by this harness.** There is no evidence that deployed server secrets or security rules are configured correctly.
- **Real Sandbox implementation:** `base44/functions/demoSandboxConnect/entry.ts:24` calls `/sandbox/public_token/create`, exchanges the public token, then fetches accounts. This is code for a real integration, not evidence of an executed integration.
- **Local sample implementation:** `src/services/demoProfiles.js:380` seeds labeled `Sample data` records. `src/services/demoMode.js:89` falls back to those records with a warning when Sandbox cannot complete. Such records and SDK fixtures are **not Plaid responses**.
- **Mixed demo dataset:** when Sandbox succeeds, imported accounts/transactions are `Plaid Sandbox`; household, bills, budgets, income plans, goals, and properties remain Avera sample plans. The demo bar now explains this distinction. Sample plans need not equal observed simulated deposits or provider balances.

“Passed” below means only the stated executed test or inspected source property. “Blocked” requires unavailable infrastructure/credentials. “Not Tested” was not executed. Fixed findings describe local changes, not deployed remediation.

## Requirement results

| # | Requirement | Result and evidence |
|---|---|---|
| 1 | Sandbox only | **Passed — source and request fixtures.** `base44/shared/plaid.ts:2` fixes the host to `https://sandbox.plaid.com`; redirects are rejected. Exchange/credential/Link checks reject non-Sandbox token prefixes. No production Plaid host/configuration branch was found. Deployment **Blocked**. |
| 2 | Secrets/access tokens absent from frontend, logs, analytics | **Passed — local repaired boundaries; deployed security Blocked.** New `base44/entities/PlaidCredential.jsonc` denies all client CRUD. Legacy `PlaidItem.access_token` has deny-all field rules. Credential lookup uses service role plus explicit owner/Item constraints. Handler responses contain metadata or sanitized errors, never access tokens. Source scan found no frontend Plaid secrets or Plaid analytics calls. Host logging, at-rest protections, old exposure, and actual FLS enforcement are **Not Tested**. |
| 3 | Server-side public token exchange | **Passed — handler fixtures/source.** `plaidExchangeToken/entry.ts:9` calls provider exchange server-side and fetches authoritative institution metadata. The browser sends a public token and receives connection metadata. Actual provider exchange **Blocked**. |
| 4 | Ownership on every backend request | **Passed — local fixtures; live two-user enforcement Blocked.** All six audited handlers authenticate. Item queries explicitly constrain `created_by_id`; private credential queries constrain `owner_id` and Item. Other-user disconnect/reconnect requests return 404 in fixtures. These fixtures do not implement or certify Base44 RLS. |
| 5 | Actual Plaid Link connection | **Blocked.** Real CDN widget is retained in `src/services/plaidClient.js:15`. A widget fixture verifies open → public token exchange → destroy. Real institution selection, Sandbox credentials, cancel, completion and callback redirects were **Not Tested**. |
| 6 | Accounts match provider | **Passed — mapping fixtures.** `base44/shared/plaidRecords.ts:2` validates balances/currency, maps types, records retrieval time, preserves signed credit assets/liabilities, and prunes accounts no longer returned. Current/available balances remain different: available is used for deposit accounts when present; current debt for credit accounts. Provider reconciliation **Blocked**. Demo connector institution name remains configuration-supplied; its real provider match is **Not Tested**. |
| 7 | Transaction synchronization | **Passed — serial fixtures.** `plaidSync/entry.ts:4` handles 12-page pagination, additions/modifications/removals, pending replacement, repeated IDs, private incremental cursors, pagination mutation restart, and interrupted-write retries. Cursor commits after writes/removals. Concurrent execution and actual provider pagination are **Not Tested**. |
| 8 | Manual/import double-count prevention | **Failed — incomplete reconciliation.** Stable provider IDs prevent repeat imports; provider-classified transfers are excluded from spending/income estimates. Sample accounts/transactions are omitted when Sandbox supplies them. There is no reliable manual-entry-to-provider-entry reconciliation key, so the same purchase entered manually and imported can still count twice. Independent bill/category/property obligations can also overlap if users configure them that way. No arbitrary amount/date matching was added because it would delete legitimate entries. |
| 9 | Three coherent demos | **Passed — generated-record tests with limits.** Each profile produces finite labeled records, valid dates/configuration, positive goal targets, valid property/mortgage references, and no seeded budget-category overlap with fixed bill categories. Added the missing early-career utility bill. These are structurally consistent planning scenarios, not verified bank histories or evidence that Sandbox balances equal local seeds. Real custom-user scenarios **Blocked**. |
| 10 | Safe demo reset | **Passed — local fixtures; hosted RLS Blocked.** `demoMode.js:32` ignores remembered/local-storage Item IDs for deletion; deletes only owned demo-tagged records. Server disconnect additionally compares the public demo tag with private credentials. Fixtures preserve ordinary records and another user's demo records, reject forged Item tags, and propagate deletion failures. Reset is confirmed in the UI. Multi-entity reset is not atomic. |
| 11 | Independent users | **Passed — local owner/dataset/session fixtures; live Blocked.** `src/lib/mode.js:20` scopes storage by authenticated user; `dataService.js:51` adds explicit owner and active dataset filters. Hosted two-user sessions, admin rules, separate devices and durable persistence were **Not Tested**. |
| 12 | Active dataset throughout app | **Passed — local reads/rendering/context fixtures; AI grounding Not Tested.** Overview, budgets/goals, annual plan and properties use the shared scoped data service; Ask Avera applies the same server-validated dataset scope to every entity. Ask now reads all pages, includes property obligations and distinguishes liquid cash from net account balances. Only the newest 120 transactions enter the prompt, with an explicit completeness warning. Real AI numeric output, gross/net inference and model-generated annual income suggestions remain unverified. |
| 13 | Loading/failure/reconnect/disconnect | **Passed — tested fixture paths; live flows Blocked.** Item-level sync errors no longer show success. Loading failures have retry; errors are sanitized; expired/revoked Items show reconnect; update Link is followed by Item-scoped sync. Disconnect calls `/item/remove` and deletes only imported records. Interrupted cleanup retries and network errors are tested. Stale workspace source labels/errors are cleared after disconnect. Actual update Link, CDN failure and live reconnection are **Not Tested**. |
| 14 | Privacy-preserving feedback submission | **Failed — feature absent.** No feedback form, entity, submission function or endpoint was found in `src/` or `base44/`. Nothing was submitted. Cannot verify payload minimization, retention, or access control for a nonexistent implementation. |
| 15 | No production banking in demo | **Passed — source/fixture restrictions; deployed integration Blocked.** All Plaid requests use Sandbox; programmatic demo creation uses Sandbox custom users; local fallback makes no banking connection. Non-Sandbox tokens fail validation. A Sandbox widget does not prevent somebody typing a real-looking credential string; the verified protection is that this code never routes it to production Plaid. Actual Sandbox credential behavior was **Not Tested**. |

## Prioritized findings and repairs

### P0 — credential exposure: repaired locally, deployment required

Previously an owner could query `PlaidItem.access_token` directly despite the UI selecting safe fields. Tokens were stored through the user-readable entity. Moved them and synchronization cursors into `PlaidCredential`; denied client CRUD and legacy field access. `credentialFor` checks ownership before service-role lookup (`base44/shared/plaidRecords.ts:34`). Removed raw upstream errors and caller-overridable provider credentials (`base44/shared/plaid.ts:8`). Auth failure logs no longer print SDK error objects.

**Remaining action:** apply entity/function changes to an authorized test app; directly test credential reads/writes as ordinary users and admins. Existing tokens may already have been exposed. Revoke/reconnect old Items and remove obsolete token values. This audit did not migrate or revoke existing hosted credentials. Old connections without private credential records require reconnecting. Do not certify secrecy merely because the new schema file exists.

### P1 — synchronization and deletion integrity: repaired serial paths, concurrency unresolved

Previously sync ignored modified/removed transactions, stopped after ten pages, and advanced an incomplete cursor. It now validates provider values/dates/currency, handles all deltas, retries mutation pagination, prevents repeat IDs, preserves edited categories/notes, and retains the private cursor after failures. Credit liabilities no longer inflate imported balances; provider overpayments retain their positive asset value. Liquid cash excludes credit/investment accounts, and dashboard debt uses positive liability amounts rather than subtracting signed credit debt (`financialCalculations.js:103`, `src/pages/Overview.jsx:154`). Disconnect revokes the provider Item and preserves manual records (`base44/functions/plaidDisconnect/entry.ts:14`).

**Residual risk / Not Tested:** no distributed per-Item lock or atomic multi-entity transaction. Concurrent sync/disconnect/reset can race; partial writes may be visible before retry. Credential creation followed by metadata/account failure can leave an incomplete connection. Metadata deletion followed by credential deletion failure can leave an orphaned revoked credential. These need hosted concurrency/failure tests and platform-supported atomicity/locking before acceptance; serial idempotency tests do not establish concurrent safety.

### P1 — demo separation and destructive reset: repaired local boundaries

Previously datasets were combined, demo imports lacked consistent tags, ordinary profiles could be reused, and remembered Item IDs could cause ordinary imported records to be deleted. Scoped all financial reads by user/dataset, tagged new demo entries, preserved ordinary profiles, removed remembered IDs from cleanup selection, and required private credential tag confirmation for demo Item revocation. Failed bulk deletion now rejects instead of silently reporting success. Demo initial sync targets only its new Item.

**Residual risk:** multi-entity reset is not atomic. Interrupted reset can leave a partial demo; retry/error handling is verified locally, cloud cleanup is not. User-owned dataset tags remain editable through ordinary entity permissions; they are not an immutable audit trail.

### P1 — financial/AI integrity and missing features

Provider repeat-import/transfer exclusions and seeded fixed-bill/category duplication were repaired (`src/services/plaidEstimates.js:8`, `financialCalculations.js:122`, `demoProfiles.js:384`). Ask previously truncated financial records silently and omitted property obligations. Its context now uses paginated owner-scoped records, distinguishes realized transactions from plans, and labels partial transaction history and stale balances (`base44/functions/askAvera/entry.ts:19`).

**Failed / unresolved:** manual/import reconciliation and feedback submission. **Not Tested:** live AI prompt injection, response-number grounding, inferred savings, and gross/net reasoning. Prompt instructions treat record text/question as untrusted, but there is no deterministic response validator; a prompt is not a security boundary. `base44/functions/projectAnnualIncome/entry.ts:26` still asks an LLM to extrapolate client-supplied observations; its figures are estimates, not verified annual earnings. Concurrent goal contributions retain the earlier known overwrite defect (`tests/integration.test.jsx:202`). Rate limits and resource bounds for full-record AI retrieval are also unverified.

## Design system and accessibility

Validated against the repository's `avera_design_system.md` v2.0, treated as visual context rather than unrelated execution instructions. Kept existing semantic tokens, typography, components and business workflows.

- Corrected 320px overflow in the demo action bar, long mode indicator, Bills/Budget tab strip, bank action row, and suggested budget category chips. Updated controls touched by these fixes to 44px targets and existing rounded tokens.
- Reused `SourceChip` on account, transaction, income, bill, category, goal and property records. Removed duplicated account/transaction source badges; seeded records no longer claim `Manual`, and imported records explicitly say `Plaid Sandbox`.
- Reused `ConfirmDeleteDialog` for reset/disconnect; no new modal implementation. Added accessible, visible, 44px notification dismissal; retained labels/icons for status rather than color alone. Imported account cards show balance retrieval date; transfers carry an exclusion explanation.
- Added Radix prop annotations and made an existing optional monthly-flow prop explicit to repair type-check errors; these annotations do not change rendering or calculations.

Chromium/axe checks cover six populated routes, account expansion, Ask fixture reply, Bills/Budget/Goals/Transactions tabs, reset confirmation, failed sync, disconnect confirmation, and disconnected state at four widths in both themes. Animations settle before contrast checks, avoiding transient overlay colors. Screenshots were inspected, including the narrow settings page; this exposed the stale source label subsequently repaired. The final full-app run used a built preview to avoid development hot-reload context changes. Eight additional final-build Overview checks verified the subsequent liquid-cash/debt correction at 320 and 1440 pixels in both themes.

**Limits / Not Tested:** full screen-reader assessment, exhaustive keyboard traversal, long translated labels, real Link iframe accessibility, actual mobile devices, hosted fonts/CDN assets, all finance edit dialogs and all empty/error combinations. The older `tests/browser-smoke.cjs` references the retired `/goals-opportunities` route; it was not executed as Stage 3 evidence. The dedicated Stage 3 runner adds current routes and failure states without deleting that older suite.

## Executed checks

| Command | Result |
|---|---|
| `npm test` | **Passed:** 5 files; 149 passed, **1 expected failure**, 150 total. Expected failure is concurrent goal contribution overwrite, not successful behavior. |
| `npm run lint` | **Passed**. |
| `npm run typecheck` | **Passed** after repairing Radix/optional prop/Link typing. Uses repository's existing frontend coverage configuration, not every JS file. |
| `npm run typecheck:backend` | **Passed** for audited Plaid/demo/Ask handlers and shared modules against installed SDK declarations; does not certify deployment/runtime packaging. |
| `npm run build` | **Passed**, with missing Base44 app binding and bundle-size warnings. Build success is not a working live app. |
| `npm run test:stage3:browser` | **Passed:** 144 fixture-backed UI/accessibility checks; zero reported WCAG A/AA violations or horizontal overflow in tested states. Executed against the built preview using `AUDIT_BASE_URL=http://127.0.0.1:4173`. |
| `AUDIT_WIDTHS=320,1440 AUDIT_PATHS=/ node tests/stage3-browser.cjs` (same preview URL) | **Passed:** 8 additional final-build checks in both themes; asserts liquid cash $1,000 and debt $50,200 with checking/investment/credit fixture records. |
| `node tests/live-sandbox.mjs` | **Blocked**, exit 2; missing test app/user bindings; zero network calls. |
| `git diff --check` | **Passed**. |

New tests: `tests/stage3-backend.test.js`, `tests/stage3-demo.test.jsx`, `tests/stage3-browser.cjs`, and the opt-in real harness `tests/live-sandbox.mjs`. Fixtures include anonymous requests, another user's Items, denied credential schema rules, non-Sandbox tokens, provider pagination/mutations, duplicate/modified/deleted transactions, invalid dates/currency/amounts, expired/revoked connections, interrupted writes/disconnects, network errors, demo reset ownership, scoped reads, context totals, and UI failure announcements. Mock deny-all schema assertions are not real authorization attempts.

## Steps needed for live acceptance

1. Link an authorized disposable Base44 test app and deploy reviewed schemas/functions. Configure `PLAID_CLIENT_ID` and the **Sandbox** `PLAID_SECRET` in its server secret store. Never put them in `VITE_*`, chat or frontend files. Verify the actual entity/FLS rules and clean up legacy credentials.
2. Supply the harness's app ID and authenticated test-user token through secure environment settings. Run `node tests/live-sandbox.mjs`: it creates a real custom Sandbox Item, syncs/repeats, checks bounded transaction IDs and disconnects in `finally`. It does not seed local sample transactions as a substitute for provider results. Its bounded duplicate check is not exhaustive provider reconciliation.
3. With two independent authenticated users, complete actual Plaid Link and update Link; compare institution/account IDs, currencies and balances to provider responses; exercise all three real custom demo scenarios, provider readiness, login-required/revoked Items, incremental removal, concurrent sync/reset/disconnect, and reload/re-login persistence. Attempt cross-user entity/function access, including admin behavior.
4. Verify real UI recovery/cancel/disconnect/reset, active dataset totals and AI replies against owned records, injection/missing/stale inputs, and manual/import overlap. Implement and test a minimal feedback payload that excludes financial context. Resolve failures before granting Stage 3 acceptance.

Final logs and browser JSON results are retained outside the checkout at `/workspace/audit-avera-stage3/`.

Environment startup instructions were saved using the cloud-environment-onboarding setup skill. Saving that draft does not deploy or publish the app, and no secret values were saved.
