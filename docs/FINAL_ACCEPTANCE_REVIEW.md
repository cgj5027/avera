# Avera Alternative — final technical acceptance review

> Historical pre-repair assessment. The subsequent repairs and their new test evidence are recorded in [ACCEPTANCE_FIXES.md](ACCEPTANCE_FIXES.md). The 65/100 score below has not been silently revised; hosted acceptance still requires the [isolated testing runbook](ISOLATED_ACCEPTANCE_TESTING.md).

Reviewed October 10, 2026, on `main` at `7e99ecd49ca1408b017e662b5fceb40ccc98914d`. This is a source-first review of the current implementation, not an inference from stage names or historical completion claims. This review adds a report and a failing acceptance regression test; application business logic is unchanged.

## Executive verdict

**65/100 — Demo Mode launch acceptance BLOCKED.** The app demonstrates substantial local financial functionality and accessible UI behavior. It does not yet demonstrate complete hosted user isolation, real Sandbox Link, live AI grounding, durable cloud workflows or feedback submission. A newly reproduced legacy-Plaid migration defect and the existing concurrent-goal defect remain unresolved. No production-readiness certification is given.

The numerical score does not override launch gates. No actual critical exploit, unauthorized cross-user financial access or real banking exposure was demonstrated in this environment. Those live security boundaries remain unverified, rather than passed. The connected-data workflow has a confirmed first-attempt migration failure; this affected core workflow blocks acceptance until repaired or legacy use is excluded through a tested migration/reconnection policy. Missing live authorization evidence independently prevents accepting the application for external testers with private financial data.

## Scoring model

Points reward demonstrated implementation and executed evidence. A test of a mock provider earns credit for local orchestration or calculations, never for a successful external integration. Unexecuted hosted behavior earns zero in its dedicated subcriterion. The rubric is an acceptance judgment, not a statistical security probability or code-coverage percentage.

| Category | Earned / maximum | Basis and deductions |
|---|---:|---|
| Core financial functionality | **19 / 25** | Income CRUD/normalization 6/6; bills/budgets 5/6; goals/gaps 3/5; properties/equity 4/4; durable cloud financial workflows 1/4. Deductions: conflicting category planning definitions, concurrent contributions, untested hosted persistence. |
| Security and data isolation | **11 / 20** | Auth/session controls 2/4; entity/dataset isolation 3/6; Plaid secrets/production isolation 3/4; AI retrieval boundary 2/3; dependency/log/configuration hygiene 1/3. Local tests prove code boundaries, not deployed RLS, private storage permissions, admin roles, session policy or a clean dependency scan. |
| Plaid Sandbox and Demo Mode | **13 / 20** | Sandbox transport 4/4; real Link/manual end-to-end 0/5; sync/recovery 3/4; three sample scenarios 4/4; reset/isolation 2/3. Link was not executed; legacy migration fails; deployed reset isolation remains unverified. |
| AI and income discovery | **8 / 15** | Goal/financial context calculations 3/4; live answer grounding 1/4; sourced employment discovery 2/4; profile/compensation handling 2/3. Deterministic context and source validation work in fixtures; live AI claims and web listings are unverified, gross/net basis is unknown and no dedicated employment API is configured. |
| User experience and accessibility | **9 / 10** | Responsive UI 4/4; navigation/forms 3/3; accessibility 2/3. Automated browser/axe evidence supports local behavior; manual screen-reader, actual-device keyboard and external assets remain untested. |
| Reliability and testing | **5 / 10** | Runnable automated checks 3/3; hosted persistence/environment readiness 0/3; recovery 2/3; feedback/testing intake 0/1. Tests detect defects; they do not make failed behavior pass. No feedback submission implementation was found. |
| **Total** | **65 / 100** | **Launch blocked regardless of score.** |

## Requirement-by-requirement acceptance

| Requirement | Status | Current evidence and limitation |
|---|---|---|
| 1. Completeness against original requirements | **Partial / Failed acceptance** | Manual primary workflows, calculations and navigation are implemented. Feedback intake is absent; notification/privacy sections still describe future controls. Live auth, persistence, Link and AI acceptance have not been executed. Stage naming is not evidence that these are complete. |
| 2. Plaid Sandbox and production isolation | **Passed locally / Blocked live** | Fixed sandbox.plaid.com transport and Sandbox prefixes; server-side exchange; owner-scoped private credentials; no production payment integration identified. Actual Link completion and test-bank response agreement need hosted deployment and credentials. |
| 3. Monthly/annual calculations | **Passed math tests / Partial product consistency** | Seven income/bill frequencies, cents, calendar recurrence, annual totals and cash/debt separation tested. Forecast rows are normalized monthly equivalents, not a calendar of actual payday/bill occurrences. Overview uses category-inclusive limits while Yearly Plan/goals use additive limits; values can legitimately differ under current rules and must not be described as one consistent spendable surplus. |
| 4. Demo Mode and three scenarios | **Passed local sample/fixture checks / Blocked cloud acceptance** | early_career, multi_income and financial_improvement datasets are finite, dated, labeled Sample data and structurally consistent in tests. Sample seeding is different from Plaid custom-user Sandbox data. Real Sandbox scenario loading and cloud multi-user reset behavior unverified. |
| 5. Ask Avera grounding/privacy | **Passed retrieval/math fixtures / Not Tested live outputs** | Backend retrieves owned active-dataset records; ignores caller-supplied financial context; passes derived monthly/goal math; prompt-injection rules and link/image suppression exist. Live model adherence, hallucination resistance and data retention settings not tested. Disclaimer is informational, not a security control. |
| 6. Household income/bills/goals | **Passed single-session fixtures / Failed concurrency** | Household profile upsert, income save/edit, bill recurrence, categories, goal save/contribute/edit/delete tested. Household means one user's profile and income streams; shared household membership across users is not implemented or certified. Concurrent goal writes lose contributions. |
| 7. Multiple properties/equity | **Passed manual-record fixtures** | Two properties with separate mortgages, valuation edits, deletion cascade and equity calculations execute in tests. Values are manually entered estimates; no verified live valuation provider is claimed. |
| 8. Income opportunities/income gaps | **Passed deterministic gaps / Partial integration** | Goal deadline/reservation/deficit formulas tested. Saved work profiles persist in fixture browser flows. Web-assisted source-linked search and URL/pay validation exist; posting availability is unverified. There is no direct employment-provider API in this checkout. Gross earnings cannot be converted into guaranteed take-home capacity. |
| 9. Security/auth/secrets | **Passed bounded source/fixture checks / Blocked platform assurance** | Ownership schemas and handler checks, user-scoped resume signing, generic errors and private vault code present. Live RLS, admin bypass/role escalation, private-file permissions, session revocation/CSP and platform logs need verification. Residual dependency advisories remain. |
| 10. Navigation/accessibility/responsiveness | **Passed executed browser fixtures / Not Tested manual assistive devices** | Four widths, light/dark modes, forms, current routes, chart text alternatives, compact chat demo controls and keyboard drawer behavior exercised. No UI template replacement or visual redesign performed. |
| 11. Reliability/persistence/recovery | **Partial / Failed affected legacy workflow** | Incremental sync/retry/deletion/cursor handling and ordinary CRUD work in fixtures. New legacy migration repro fails; contribution concurrency fails. Hosted durable reload/relogin and cloud interruption recovery untested. |
| 12. Feedback/user testing readiness | **Failed feedback requirement / Blocked external launch** | Source search found no feedback entity/function/form/submission endpoint. Platform-provided feedback, if any, is not verified. Supervised local simulated demonstrations are possible; external user acceptance with private data is not certified. |

## Executed automated evidence

The initial current-main suite passed 253 tests with one pre-existing expected failure. A new acceptance test was then added to cover a previously untested legacy path. The final suite outcome is authoritative:

- **npm test: 13 files, 12 passed and 1 failed; 253 tests passed, 1 failed, 1 expected failure; 255 total. Exit 1.** The new failure is NOT marked it.fails or suppressed.
- The focused legacy regression run also failed: expected the persisted vault ID, received undefined.
- npm run lint, npm run typecheck, npm run typecheck:backend and npm run build were executed. All four checks passed (exit 0). Build retains its existing large-bundle warning.
- npm audit --json executed: **11 residual advisory entries: 5 high, 4 moderate, 2 low, 0 critical**. Entries include inherited package chains. A zero critical count does not mean the application is secure.
- tests/live-sandbox.mjs exited **2 / BLOCKED** because BASE44_TEST_APP_ID and BASE44_TEST_USER_TOKEN were missing. It made no network requests. No live Link, bank connection, email/OAuth, AI/provider or cross-user cloud checks were claimed as passing.
- Browser suites are rerun against the built frontend with intercepted HTTP APIs and simulated users/records. These are real DOM/browser checks of frontend behavior, not hosted Base44 persistence or Plaid/model executions. Final completed counts are appended below.

### Completed browser and build checks

| Check | Result | Scope |
|---|---|---|
| Lint (including final added regression) | Passed, exit 0 | ESLint configured scope |
| Frontend and backend type checks | Passed, exit 0 each | Repository TypeScript configurations |
| Production build | Passed, exit 0 | Vite build; existing >500 KB bundle warning |
| Stage 3 browser suite | Passed, 144 checks | Simulated demo/Sandbox UI, light/dark and four widths |
| Persistence follow-up browser suite | Passed, 72 checks | Fixture income/profile save and job-search UI |
| Overview charts browser suite | Passed, 72 checks | Allocation and outlook chart rendering/accessibility |
| Chat layout browser suite | Passed, 84 checks | Layout, dataset controls, disclaimer and keyboard interactions |
| Bill suggestions browser suite | Passed, 8 viewport/theme cases | Inline controls, review flow and axe checks |
| General browser smoke suite | Passed, 72 page cases plus dialog assertions | Navigation/forms/drawer and axe checks |

**452 reported browser checks/cases completed with exit 0 across six suites**, with no reported accessibility violations. Counts have different scopes; they are not 452 independent hosted financial workflows. API calls were intercepted with fixtures, external assets were blocked, and manual accessibility remains Not Tested. Raw execution logs are retained outside the repository at `/workspace/audit-final-acceptance/`.

## Unresolved defects and blockers, prioritized

### P0 — Live financial authorization and private-file boundary not demonstrated

Files: `base44/entities/*.jsonc`, `base44/functions/parseResume/entry.ts`, `base44/shared/dataset.ts`, `src/lib/AuthContext.jsx`.

The financial entity rules bind CRUD to created_by_id; the private vault denies user CRUD. Source/fixtures cannot prove deployment, platform-admin behavior or private file ACLs. User-scoped signing is now used, but actual denial of another user's file URI must be verified. Test User.role immutability and all entity bulk/upsert paths as ordinary and admin users in a dedicated test app. This is a launch-assurance blocker, not a claim that actual cross-user theft has been observed.

### P1 — Confirmed legacy credential migration returns no persisted ID

Files: `base44/shared/plaidRecords.ts:39`, `base44/functions/plaidSync/entry.ts:58`, `base44/functions/plaidDisconnect/entry.ts:25`, `tests/acceptance-legacy-plaid.test.js`.

Reproduce with an owned legacy PlaidItem, a Sandbox token accessible only to server role, and no PlaidCredential row. credentialFor upserts a credential, then returns the original object without id. Sync calls update(credential.id, ...) and disconnect calls delete(credential.id); the first migrated call cannot address the saved row. The local regression receives undefined rather than the inserted ID. A subsequent call can find the saved row, so some retry paths may recover; that does not make the first attempt pass. Return and validate the persisted vault row after migration, explicitly verify legacy ownership/Item identity, and retire the legacy credential safely. Migration also uses an editable public cursor, so consider a fresh cursor/idempotent replay rather than treating that value as authoritative. Live storage behavior is untested.

This affected connected-financial workflow must be repaired and retested before accepting a launch that admits legacy Items. New private-vault connections are a different tested fixture path; do not generalize this failure to every newly connected Item.

### P1 — Remaining high dependency chain

File: `package-lock.json`. High entries: braces, chokidar, fast-glob, micromatch, tailwindcss. Underlying untrusted pattern stack-exhaustion issue is in the build chain; no remotely exploitable UI path is demonstrated. The audit recommends a Tailwind major migration. Moderate router/PostCSS and low Quill-related entries also remain. Isolate builds from untrusted configuration and validate a planned migration against semantic styles, charts and browser suites; do not claim the current scan is clean.

### P1 — Live Sandbox/AI/employment integration acceptance unavailable

Files: `src/services/plaidClient.js`, `base44/functions/plaid*`, `base44/functions/askAvera/entry.ts`, `base44/shared/opportunitySource.ts`, `tests/live-sandbox.mjs`.

Provide secure bindings for a dedicated test app, deploy the reviewed backend/schema, and run manual real Sandbox Link and two-user cloud flows. AI outputs require human/adversarial review against stored evidence; prompts alone do not prove grounding. Jobs currently use built-in web search, with links labeled unverified; no dedicated employment API completion points were awarded.

### P2 — Goal contribution lost update

Files: `src/pages/BillsBudget.jsx` contribution handler, `tests/integration.test.jsx:202`.

Two sessions read the same saved_amount and write separate read-modify-write totals. Last writer wins. Existing expected-failure reproduction remains. Resolve using an authorized atomic persistence operation or append-only contributions, then test concurrency across sessions. A passing single-session goal CRUD test is insufficient.

### P2 — Conflicting financial planning definitions / unknown income basis

Files: `src/services/financialCalculations.js:97`, `src/services/overviewAllocation.js`, `src/pages/Overview.jsx`, `base44/shared/assistantInsights.ts`.

Example: $3,000 monthly income, a $600 Housing bill and a $1,500 Housing category limit. Additive Yearly Plan expenses are $2,100 (surplus $900); category-inclusive Overview expenses are $1,500 (unallocated $1,500). Each formula is implemented and tested, but they answer different questions and should not drive one undisclosed affordability/goal figure. Agree and label the shared policy, then test parity where intended. Income records do not specify gross/net; gaps are planning estimates, not assured take-home income requirements.

### P2 — Feedback submission missing

No feedback persistence entity, authenticated submission function or app form was found. Add a minimal feedback flow with explicit user consent and narrow fields; never attach financial records, prompts, balances or tokens automatically. Verify user isolation, failure/retry and successful persistence before claiming user-testing intake complete. Do not assume Base44 supplies this without evidence.

### P3 — Incomplete settings and manual validation

File: `src/pages/Settings.jsx` describes notification/privacy controls as future work and incorrectly suggests nothing is saved to the account despite persisted demo workspaces. Reminder settings are stored, but notification delivery is not implemented/verified. Full user-account erasure and retention controls are platform/manual scope. SDK bearer tokens use localStorage; no Plaid access-token cache was found, but CSP/session policy and third-party script access require platform review. Manual screen-reader, real mobile keyboard and actual external assets remain untested.

## Recommendations and release gates

1. Repair the legacy migration and goal contribution concurrency; leave the new acceptance assertion active until it passes. Unify or explicitly distinguish expense/affordability definitions.
2. Deploy to an isolated Base44 test app, provision two disposable users, and verify RLS including admin behavior, role updates, private resumes and all Item/object IDs. Never use real bank accounts.
3. Complete real Plaid Sandbox Link, programmatic sync/dedup/reconnect/revoke/disconnect and interrupted cleanup. Verify Demo Mode stays Sandbox-only and reset cannot remove ordinary/other-user data.
4. Review actual Ask Avera responses for relevant record citations, exact derived numbers, missing/contradictory/stale records, gross/net ambiguity and prompt injection. Verify public-web opportunities and their unverified labels rather than assuming links prove employment availability.
5. Resolve/contain dependency advisories, confirm CSP/rate-limit/logging/session policies, implement feedback intake, and perform manual accessibility/device checks.
6. Run authenticated manual workflows end to end with cloud reload/relogin persistence, all three demo scenarios and ordinary records. Re-score only after new evidence. Do not launch solely because the score rises.

No application logic was repaired during this acceptance review. The report and failing regression test are local on main, not committed/pushed/deployed. Earlier Stage 4 fixes already exist in the reviewed commit; their report is historical evidence, not a substitute for this run.
