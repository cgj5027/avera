# Avera Stage 1 audit

**Verdict: Stage 1 does not yet pass its end-to-end acceptance gate.**

Audited GitHub `main` at `aa5358329438997f5233788bf4a5fc5004c40ddd`, followed by the local fixes in this workspace. The initial checkout was older Stage 0; it was fast-forwarded to current `main`. The previously uploaded `avera_design.md` remains unchanged. UI review used the repository's `avera_design_system.md`.

## Prioritized remaining findings

| Priority | Status | Finding and evidence | Required next step |
|---|---|---|---|
| P0 | **Blocked** | Deployed database rules and real two-user isolation cannot be certified. Local financial schemas originally allowed admins to read/update/delete other users' records. Those bypasses were removed locally; they have not been applied to a Base44 app. See `base44/entities/*.jsonc`, `src/services/dataService.js:37`, and the schema assertions in `tests/integration.test.jsx`. | Link a test Base44 app, apply the revised schemas, and test owner, other-user, admin, and anonymous requests against actual record IDs. Verify immutable server-assigned `created_by_id` and authenticated-only creation. |
| P0 | **Blocked** | Real registration, OTP delivery/verification, successful login, persistence after reload/re-login, and authenticated manual workflows have not executed against a live backend. No app link or Base44 runtime variables/bindings are present. CLI `whoami` also failed because its asset initialization writes to the read-only `/home/agent/.base44`. | Supply the existing app connection and secure test-user authentication through supported environment setup. No secret values should be sent in chat. |
| P1 | **Failed** | Concurrent contributions lose updates: two sessions reading savings of 100 and contributing 10 and 20 can persist 120 instead of 130. `src/pages/GoalsOpportunities.jsx:97` performs read/modify/write. The real persistence service is exercised by an explicit expected-failure regression at `tests/integration.test.jsx:193`. | Implement and validate a backend atomic increment, compare-and-swap, or durable contribution ledger. A frontend busy flag cannot guarantee cross-session consistency. |
| P1 | **Failed** | Property/mortgage save/delete and category rename use sequential SDK operations, without a transaction. Failure after one write can leave partial state; retrying a partially created property can duplicate it. Successful cascades are tested, but rollback/durability is not guaranteed. See `src/pages/Properties.jsx:47`, `src/pages/Properties.jsx:77`, and `src/services/dataService.js:76`. | Use a supported transactional or idempotent backend operation and verify failure recovery. No custom backend functions currently exist in this checkout. |
| P2 | **Not Tested** | Actual email/OAuth provider behavior, password-reset completion, screen-reader usability, physical-device keyboards, external font delivery, and external valuation providers. | Run connected-service and assistive-technology checks. External valuations are intentionally absent; current estimates are manual. |

## Requested verification matrix

“Passed locally” means tests against pure functions, actual UI components with a mocked SDK, or browser fixtures. It does **not** imply a live Base44 database passed.

| Item | Status | Verified evidence / limits | Locations |
|---|---|---|---|
| 1. Registration/login/logout/routes | **Passed locally; Blocked live** | Registration validates matching passwords and enters OTP UI; login calls the SDK and announces failure. Signed-out/expired sessions cannot render financial routes. Logout immediately hides protected content and clears cached query data/session mode. Real auth success and OTP verification are blocked. | `src/App.jsx:28`, `src/components/ProtectedRoute.jsx`, `src/lib/AuthContext.jsx`, `src/pages/Login.jsx`, `src/pages/Register.jsx`, `src/pages/Settings.jsx` |
| 2. User separation | **Passed local rules/service tests; Blocked deployed enforcement** | Authenticated creation rule, owner-only read/update/delete rules, explicit owner filters, mutation ownership checks, and stripping forged creator fields. A two-user SDK fixture rejects cross-owner updates/deletes. Mocked behavior is not proof of backend RLS. | `base44/entities/`, `src/services/dataService.js`, `tests/integration.test.jsx` |
| 3. Income/projections | **Passed locally** | All seven frequencies tested; inactive sources excluded. Annual totals use original frequency amounts; monthly projection rows distribute remainder cents and reconcile to the annual total. Rolling 12-month timing is explicit in UI and snapshots. | `src/services/financialCalculations.js:55`, `src/services/financialCalculations.js:254`, `src/pages/YearlyPlan.jsx` |
| 4. Bills/budgets | **Passed locally; atomic rename Failed** | Month/year boundary clamping, preserved month-end anchors, twice-monthly calendar recurrence, local-date status/horizons, next-cycle payment actions, category spending totals, and duplicate-name prevention. Category rename preserves spending in the success path; partial failure remains above. | `src/services/financialCalculations.js:137`, `src/pages/BillsBudget.jsx:81`, `src/services/dataService.js:76` |
| 5. Goals/savings | **Passed single-session tests; Failed concurrency** | Goal create/edit/delete, contributions, missing deadlines, expired goals, shortfalls and completed targets. The UI explains that each goal independently uses full savings capacity, without allocation between goals. Concurrent overwrite remains unresolved. | `src/services/financialCalculations.js:201`, `src/pages/GoalsOpportunities.jsx`, `tests/integration.test.jsx` |
| 6. Properties/mortgages/equity | **Passed locally; Blocked live** | Two properties with separate mortgage records, valuation edits, negative equity, unknown-value handling, cost totals, and successful cascading deletion. Fixed a Promise incorrectly read synchronously by PropertyCard. Estimates remain manual; no external valuation service was tested. | `src/services/valuationService.js`, `src/services/financialCalculations.js:243`, `src/components/properties/PropertyCard.jsx`, `src/pages/Properties.jsx` |
| 7. Precision/invalid values | **Passed tested cases** | Half-cent positive/negative rounding, non-finite values, invalid currency/date presentation, unknown equity, and annual reconciliation. Non-negative financial schema constraints added while retaining signed account balances, savings projections, and cash outcomes. | `src/services/financialCalculations.js`, `src/utils/format.js`, `base44/entities/` |
| 8. Persistence/CRUD/cascades | **Passed fixture workflows; Blocked live; atomicity Failed** | Owner-scoped cursor pagination, household upsert, bill creation/payment, income entry, forecast save/delete, goal CRUD, property CRUD/cascade, and spending edit/delete. Live persistence after browser reload/re-login and interrupted-operation recovery remain unverified. | `src/services/dataService.js`, `src/pages/BillsBudget.jsx:214`, `tests/integration.test.jsx` |
| 9. UI/navigation/accessibility/states | **Passed browser/DOM checks; Not Tested assistive technology** | Populated pages and financial dialogs checked in light/dark themes at 320/390/768/1440px. No document horizontal overflow, browser exceptions, or reported WCAG A/AA violations. Dialog Escape behavior, accessible labels, progress names, form save errors, and loading/empty states are exercised. This is not full WCAG certification. | `tests/browser-smoke.cjs`, `src/components/layout/`, `src/components/ui/`, `src/components/states/` |
| 10. Hardcoded results/secrets/insecure queries/placeholders | **Passed bounded source review; Not Tested deployed artifacts** | Production calculation services derive figures from records. Financial page reads use the scoped persistence service; no service-role credentials or custom financial API functions were found. Credential-signature scan found zero matches in 147 source/schema files. Demo/bank connection entry text now states availability honestly. Ask Avera remains an explicitly unavailable later-stage shell. | `src/services/`, `src/pages/ModeEntry.jsx`, `src/components/overview/NextSteps.jsx`, `src/components/askavera/` |

## Fixes made

- Connected existing auth pages to the router, applied the route guard, failed closed on verification errors, and routed Settings logout through the auth context. The existing logout control was reused.
- Removed financial admin RLS bypasses; authenticated creation uses the documented `user_condition` pattern. Added explicit owner filtering, complete cursor pagination, mutation preflight checks, and protected metadata stripping.
- Fixed month-end/leap-year recurrence, retained original due-day anchors when editing a bill, and kept the next bill cycle payable after recording payment. Twice-monthly recurrence uses the 15th and last day after the initial due date.
- Corrected annual rounding/reconciliation, date handling, unknown equity, expired-goal pace, and synchronous manual valuation rendering.
- Save dialogs await persistence, retain input on failure, announce errors, and disable duplicate submits. Added spending-history edit/delete using the existing transaction service and dialog.
- Fixed inaccessible select labels, unnamed progress indicators, focus visibility, mobile More trigger semantics, dialog sizing/scrolling, small button targets, definition-list markup, and keyboard access to the scrolling table. Enabled the existing System theme option.
- Corrected measured contrast failures using semantic tokens. `avera_design_system.md` records the accessible supporting-text and standalone-status-text clarification; original uploaded context was preserved.
- Added accurate JSDoc component prop declarations and Vite environment types. Type checking remains enabled with no diagnostic suppressions.

## Test results and reproduction

| Command/check | Result |
|---|---|
| `npm ci --cache /workspace/.npm-cache` | **Passed** with the refreshed lockfile. |
| `npm test` | **55 passed; 1 explicitly expected failure**, 56 total; no skipped tests. The expected failure is the unresolved concurrent-contribution defect, not a pass. |
| `npm run lint` | **Passed**. |
| `npm run typecheck` | **Passed**. Baseline at audited commit reproduced 339 errors; final code has zero. |
| `npm run build` | **Passed**. Reports missing Base44 runtime settings and a bundle-size warning; build success does not establish functional backend connectivity. |
| Browser fixture runner | **64 page/theme/viewport combinations**, plus **64 financial-dialog checks**, passed with zero reported WCAG A/AA violations and no document overflow/browser exceptions. |
| `git diff --check` | **Passed**. |

See `tests/README.md` for commands, browser prerequisites, fixture limitations, and the live acceptance checklist. Local evidence is retained under `/workspace/audit-avera/`. Browser fixtures block external assets, so hosted fonts were not validated. No changes were deployed or pushed.

## Calculation assumptions

- Income amounts are per-pay-period amounts; “hourly” is a type label, not a rate-times-hours calculation. Weekly/biweekly use 52/26 payments annually; forecasts are averages, not an exact payday-calendar simulation.
- Budget limits, bills, and property costs are additive. Users must avoid entering the same obligation twice; no deduplication or expense-allocation model is implemented.
- Goal month estimates use the existing 30.44-day averaging convention. Pace is independent per goal, not a shared allocation plan.
- Account balances are signed manual inputs. Account type does not determine liquidity; investment/other balances also enter the current available-cash sum. Treat that figure as the documented aggregate, not certified liquid cash.
- Mortgage data is editable manual debt, not an amortization schedule. External market estimates and provider integrations are not implemented.

Stage 1 should be accepted only after the P0 blockers and P1 integrity defects are resolved and authenticated users complete the live manual workflows end to end.

Validation was rerun on October 9, 2026 (America/New_York): 55 passing tests, one expected failure, passing lint/typecheck/build/diff checks, and 64 passing browser page combinations with zero reported accessibility violations. Main remains at the audited commit; no test-app connection is configured.
