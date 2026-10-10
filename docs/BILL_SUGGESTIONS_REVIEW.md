# Recurring bill suggestions

Implemented on `stage3.1-codex-chart-updates`. No automatic bill creation or transaction categorization changes.

## Behavior and evidence

The Bills tab has an AI bill suggestions panel. All suggestions start unselected. Users can edit each name, amount, frequency, category and estimated date, independently Keep or Dismiss, and Add selected bills. Successful saves disappear immediately; partial failures leave remaining suggestions visible. Dismissal persists server-side for the authenticated user and dataset until newer matching payment evidence changes the fingerprint. Demo reset removes only owned, demo-tagged dismissals.

`base44/functions/suggestBills/entry.ts` authenticates before reading, ignores browser-supplied financial context, and uses the existing datasetQuery and paginated allRecords helpers. Transaction, Bill, MortgageRecord and BillSuggestionDismissal queries use user ownership and ordinary/demo filters. User-client writes retain RLS. AI receives only candidate merchant/category/frequency and an index; no balances, account identifiers, mortgage liabilities or credentials. Input strings are explicitly untrusted data. Returned indexes are validated; model-created amounts, dates and candidates are never accepted. Provider errors return an unavailable state and no recommendations.

`base44/shared/recurringBills.ts` requires at least three recent payments with consistent intervals and similar amounts. It rejects invalid/future dates, invalid amounts, pending transactions, transfers, income, duplicate provider identifiers, same-day repetitions, user-marked nonrecurring merchants, existing bills and discretionary categories. Supports weekly, fortnightly, monthly, quarterly, semiannual and annual patterns. Ambiguous semimonthly patterns are withheld. Monthly amounts use median payment values rounded to cents. Dates are estimates from observed posting dates, never contractual due dates. AI further rejects ambiguous or discretionary candidates.

Mortgage payments already contribute to financial forecasts; this panel reports the count already tracked and excludes matching lender payments rather than duplicating them as bills. Existing MortgageRecord has no due-date field. Loan matching also uses a mortgage label and comparable payment amount. Exact merchant normalization and conservative tolerances can miss legitimate subscriptions or differently named lenders; users retain Add bill for these. This intentionally favors fewer false positives.

Accepted bills retain a normalized suggestion merchant even when renamed, avoiding repeated recommendations. Sequential retries are checked against current records. The SDK create API does not provide a transaction or unique merchant constraint here: simultaneous saves from different sessions are not proven atomic. This feature does not claim cross-session exactly-once creation.

## Design validation

Reviewed against `avera_design_system.md`: existing card/control primitives, semantic colors, rounded-2xl panels, rounded-xl controls, 16px descriptions, 44px actions, labeled fields, text confidence and Estimated labels, disclosure of supporting sources, status announcements, alert errors and responsive one/two-column forms. Reuses the current Bills tab, persistence/auth helpers and UI primitives; no duplicated app shell or modified business calculation rules.

Browser fixture checks cover light/dark at 320, 390, 768 and 1440 pixels, unselected defaults, editing amounts, individual keep/dismiss, saving only selected bills, horizontal overflow and automated WCAG A/AA accessibility. These are local built-app tests with HTTP fixtures, not hosted-cloud or live model certification.

## Deployment and verification limits

Deploy the new suggestBills backend function and BillSuggestionDismissal entity, plus the additive Bill.suggestion_merchant field, alongside the frontend. The function uses existing Base44 Core.InvokeLLM; no new external API keys are required. Live function deployment, AI classification accuracy on real user histories, live two-user cloud isolation, and cross-session simultaneous saves have not been executed in this environment.

Reproduce: npm test; npm run typecheck; npm run typecheck:backend; npm run lint; npm run build. Start the built app with npm run preview -- --host 127.0.0.1 --port 4182, then node tests/bill-suggestions-browser.cjs. The browser script uses authenticated API fixtures and does not mutate hosted financial data.

## Executed results

- Full Vitest suite: 9 files, 213 passed, 1 pre-existing expected failure (goal contribution concurrency).
- Browser fixture suite: 8 theme/viewport combinations passed; no horizontal overflow or automated WCAG A/AA violations.
- Production build, frontend type check, backend type check, lint and diff whitespace checks passed.
- Live Base44/model execution: not tested; backend deployment is required.
