# Acceptance repairs and verification

October 10, 2026. Repairs are local on main, based on 7e99ecd. No commit, push, cloud deployment or external messaging was performed. The original FINAL_ACCEPTANCE_REVIEW.md remains historical; its 65/100 score is not an updated readiness score.

## Confirmed findings addressed

| Finding | Repair | Evidence / cloud limitation |
|---|---|---|
| Legacy Plaid migration returned an unsaved payload | Reload and validate the persisted private credential, require matching legacy owner/Item/demo identity, replay from a fresh cursor and clear the legacy token only after vault verification | Normal regression now passes; actual sync/disconnect handlers complete their first migration call with fixtures. Foreign ownership and incomplete migration are rejected. Real cloud migration still needs execution. |
| Concurrent goal contributions overwrote a total | New GoalContribution entity and authenticated logGoalContribution endpoint. Independent rows, owner/goal/request idempotency key, derived totals used by UI and Ask Avera | Simultaneous contributions and retries retain both entries without mutating the baseline. Goal deletion and demo reset cleanup tested. Hosted upsert/concurrency enforcement needs the live harness. |
| Overview/Yearly Plan/goal/AI expense policies differed | Shared category-inclusive policy: max(categorized obligations, category limit); uncategorized costs included; no realized transactions added to planned expenses | Cross-view/backend fixture asserts 3,000 income, 600 Housing bill and 1,500 Housing limit produce 1,500 monthly expenses and 18,000 annual expenses. Annual frequency/cents behavior remains tested. Historical forecast snapshots are not rewritten. |
| Gross/net basis unknown and goal result claimed take-home income | Optional income_basis with Unknown/Gross/Net choices; old records stay unspecified. Source cards and assistant context distinguish basis; the gap is labeled a planning estimate | UI save/edit and backend mixed/gross/net tests. No automatic tax calculation, earnings guarantee or bank verification introduced. |
| Feedback submission absent | Settings feedback form, Feedback entity and authenticated submitFeedback endpoint; rating 1–5, message, explicit consent and retry key only | Tests check authorization, allowlisted payload, sanitized provider failures, retained draft, retry and confirmed success. No financial records or chat attached automatically. Hosted persistence remains unverified. |
| Dependency advisories | React Router 7 upgrade; remove unused react-quill-new; migrate the existing Tailwind theme to Tailwind 4/PostCSS; remove the vulnerable parser/build dependency chain | Frozen-lockfile install, build/types/tests and browser evidence. npm audit now has zero known advisories. This is a registry result, not proof against every security flaw. |
| Settings text incorrectly claimed records were not persisted | Accurate device-mode/account-record distinction, demo-reset scope, in-app reminder delivery and account-deletion guidance | Browser/axe checks. No nonexistent privacy or notification delivery feature claimed. |

Affected implementation: base44/shared/plaidRecords.ts, planning.ts, goalSavings.ts, assistantInsights.ts; base44/functions/askAvera, logGoalContribution, submitFeedback; GoalContribution/Feedback/IncomeSource schemas; src/services/dataService.js, financialCalculations.js, overviewAllocation.js, demoMode.js; income/goal/yearly-plan/settings components; CSS/PostCSS and dependency manifests.

Existing Goal.saved_amount remains the starting/legacy savings amount. UI/API reads add the contribution ledger; edit dialog says Starting savings and preserves recorded contributions. Deploy the new schemas/functions with the frontend before using these paths. User-specified starting balances remain editable; there is no claim of an atomic cross-entity transaction for every delete/edit race.

## Validation

The following final results were executed after the repairs and frozen-lockfile reinstall. Unit/integration handlers use SDK/provider fixtures and browser API calls are intercepted. Those results demonstrate local implementation boundaries, not actual Base44 RLS, hosted persistence, live model output or Plaid Link.

- The formerly expected-failure goal test is now a normal assertion against the repaired workflow. No assertions are marked expected-fail or disabled to conceal defects.
- The legacy migration test is also a normal passing regression, expanded to cover ownership and safe retirement plus first-call handler behavior.
- The live Sandbox and new two-user harnesses both exited 2 because isolated app/user bindings are missing; no cloud requests were executed. The latter passed syntax validation only. Live results must remain Blocked/Not Tested until execution.
- An intermediate preview reload failed during dependency/build changes. The server was restarted against the stable upgraded artifact; the completed persistence rerun passed. Intermediate output is retained separately from final evidence.

### Final executed results

| Check | Result |
|---|---|
| npm ci | Passed; frozen lockfile installed successfully |
| npm test | **14 files, 272 passed; zero failed/expected-failed/skipped tests; exit 0** |
| npm run lint | Passed, exit 0 |
| npm run typecheck | Passed, exit 0 |
| npm run typecheck:backend | Passed, exit 0 |
| npm run build | Passed, exit 0; existing >500 KB bundle warning remains |
| npm audit and npm audit --omit=dev | **0 known vulnerabilities**, both exit 0 |
| General browser smoke | 72 page cases plus dialogs and 8 feedback failure/retry flows; no reported axe violations |
| Stage 3 browser | 144 checks; no reported axe violations |
| Chat browser | 84 checks; no reported axe violations |
| Overview browser | 72 checks; no reported axe violations |
| Persistence browser | 72 checks; no reported axe violations |
| Bill suggestions browser | 8 cases; no reported axe violations |
| Final goal layout at 520px viewport height | 8 additional cases at four widths/both themes; mobile stacking, desktop row, 44px buttons and no reported axe violations |
| Live Sandbox / two-user harnesses | **Blocked**, exit 2 each; missing credentials, no network requests |

The six broad browser suites reported **452 checks/cases**. After the final goal layout correction, the targeted suite reported **8 additional passing cases**; counts have different scopes and are not independent cloud workflows. The original six suites covered the upgraded theme, income basis, feedback and navigation; the additional suite verified the final modified goal form. All completed browser commands exited 0. An initial geometry assertion measured entry animation too early; waiting for that animation before measurement resolved the test timing issue without weakening the layout assertion. The final short-viewport screenshot was visually inspected.

Raw final logs are retained outside the checkout at `/workspace/audit-acceptance-fixes/`. The Base44 site's install command now uses npm ci so deployment installation follows the reviewed lockfile. The npm-config cooldown warnings are tooling notices; package updates used the documented cutoff date, and integrity/TLS checks were not disabled.

## Design compliance

The design authority is avera_design_system.md. Feedback uses the existing SettingSection, Button, Label and Textarea components, semantic tokens, 16px body text, labeled 1–5 radio group, explicit consent, visible error/success text and 44px major controls. No duplicate settings-card implementation or new UI library was added. Income basis uses the existing labeled Select primitive. Goal amount fields stack on mobile, with two columns on larger screens and 44px save/cancel controls.

Tailwind 4 loads the existing tailwind.config.js theme; all Avera color/font/radius tokens are retained, and the established small-shadow recipe is preserved. The Overview split, chart values, chat scrolling/composer, theme contrast, mobile overflow, navigation, dialogs and keyboard focus are exercised in browser fixtures. Manual screen-reader, physical-device keyboard, external-font delivery and old-browser support are not certified.

## Remaining acceptance gates

Real Sandbox Link, deployed two-user RLS/bulk/upsert/admin behavior, private-file permissions, durable save/reload/relogin, external failure recovery, actual AI grounding/prompt injection and public-web opportunity accuracy remain unverified. Account erasure/retention, platform logs/analytics, CSP and session settings need platform/operator review. No real banking exposure or unauthorized cross-user access was observed, and no absence-of-exposure certification is inferred from fixtures.

Follow ISOLATED_ACCEPTANCE_TESTING.md. Configure only an empty test app with disposable ordinary users and Sandbox secrets. Keep external Demo Mode launch blocked until the hosted acceptance evidence is recorded. Re-score from that evidence rather than automatically increasing the historical numerical score.
