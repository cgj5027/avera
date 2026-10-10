# Isolated Avera acceptance testing

Use an empty, dedicated Base44 app named **Avera Acceptance Sandbox**. The current code fixes are local on main; a fresh Git clone does not contain them until they are committed/pushed. This guide is a runbook, not evidence of executed hosted tests. No cloud app was created or deployed during this repair.

## 1. Create and bind the separate app

1. Create a new empty app in your Base44 workspace. Do not copy production records, credentials, connected accounts, users or analytics settings. Alternatively, use the existing-project CLI linking workflow below to create the empty app directly; do not create a second app if you already created it in the dashboard.
2. Record the isolated app ID and URL. Keep the live app's ID/URL separate. Use private/invite-only access where available, and invite testers as app users rather than workspace administrators. Check that authentication is required on every financial route.
3. Use the working checkout containing the reviewed fixes. Authenticate your Base44 builder CLI with `npx base44 whoami`; if not authenticated, run `npx base44 login` in your own terminal.
4. Check whether the ignored `base44/.app.jsonc` already links this checkout to another app. Preserve that original local mapping outside the repository and remove it from the active path before relinking. Do not deploy while it still points to the live app.
5. Link to the **existing isolated** app with `npx base44 link --app-id <isolated-app-id>`. If no isolated app exists yet, use `npx base44 link --create --name "Avera Acceptance Sandbox"` instead. These are alternatives, not two consecutive commands. Verify the saved mapping names the isolated app before deployment.

CLI references: https://docs.base44.com/developers/references/cli/get-started/overview.md. The local `.app.jsonc` link and `.env.local` stay ignored; never commit tokens or secrets. These commands are for the operator and were not executed by this task.

## 2. Configure only test integrations

In the isolated app's server secret settings, configure **PLAID_CLIENT_ID** and the **Sandbox PLAID_SECRET** from the Plaid dashboard. Do not supply Development/Production secrets. The reviewed backend fixes the transport to https://sandbox.plaid.com and rejects non-Sandbox tokens; PLAID_ENV cannot switch its host. Keep credentials out of VITE variables, Git, screenshots, logs and chat.

Enable the isolated app's Base44 Core InvokeLLM and private-file/signing capabilities as needed, with test-only limits. Job discovery uses built-in web-assisted search: there is no dedicated employment API configured or certified. Configure isolated authentication/email verification/reset settings and callback URLs; verify actual delivery rather than assuming deployment enables it. Check rate limits, session policy, private storage ACLs, logging and analytics in Base44 settings. Do not log request bodies, assistant context or tokens.

In ignored `.env.local`, set only the public frontend configuration:

```dotenv
VITE_BASE44_APP_ID=<isolated-app-id>
VITE_BASE44_APP_BASE_URL=<isolated-app-url>
```

Remove any stale functions-version override, or explicitly bind it to the reviewed deployed test version. Restart/rebuild after changing public configuration. These two public values are not Plaid credentials. Never add PLAID_SECRET or authenticated-user tokens with a VITE_ prefix.

## 3. Deploy the reviewed resources together

Run the checks in the checkout containing the fixes:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run typecheck:backend
npm run build
npx base44 deploy
```

Inspect the deployment confirmation and ensure the target is **Avera Acceptance Sandbox**. Deploy schemas, backend functions and the built frontend together. Publishing frontend code alone is insufficient.

Confirm the new **GoalContribution** and **Feedback** schemas and **logGoalContribution** and **submitFeedback** functions exist. Confirm the revised IncomeSource schema, Ask Avera handler and Plaid migration helper are deployed. Goal.saved_amount remains the starting/legacy amount; contribution rows are added when records are read. Do not bulk-migrate those existing totals into contribution rows, which would count them twice. Existing forecast snapshots retain historical amounts; create new snapshots under the revised category-inclusive policy.

In the platform data/security UI, verify every financial schema, including the two new entities, binds CRUD to created_by_id = authenticated user. PlaidCredential denies all user CRUD; the legacy PlaidItem token has deny-all field rules. Verify rules actually enforce ownership, including bulk/upsert and any admin behavior. Source definitions are not proof of deployment. Do not grant ordinary testers workspace/admin roles.

For local development, `npx base44 dev` uses the supported local backend. `npx base44 dev --remote` touches the linked hosted app: use it only after verifying the isolated link. Frontend-only `npm run dev` uses the configured hosted backend URL. The hosted deployment is the acceptance target for durable persistence and real Link.

## 4. Create two disposable ordinary users

Create **Tester A** and **Tester B** with different email addresses you control, unique test-only passwords, and ordinary app-user roles. Register/invite using the actual isolated app auth flow and complete email verification. Do not use invalid example addresses if the flow requires email delivery.

Use two separate browser profiles (or different browsers), not two tabs sharing localStorage. Keep the builder dashboard in a third profile. Use only invented names, addresses, amounts and résumés. Suggested fixtures:

| Fixture | Tester A | Tester B |
|---|---|---|
| Monthly income | 3,000; mark Net explicitly | 4,000; mark Gross explicitly |
| Housing bill / category limit | 600 / 1,500 | 900 / 1,800 |
| Initial goal savings | 100 | 200 |
| Goal target | 1,000 | 2,000 |
| Account | Synthetic checking | Different synthetic checking |
| Properties | Two synthetic properties with separate mortgages | One distinct synthetic property |

For A, income 3,000 with only the Housing bill 600 and Housing limit 1,500 must give planned monthly expenses 1,500, annual expenses 18,000 and monthly remaining 1,500. Add property costs only after recording that baseline. No figure represents real funds. B's gross income must remain labeled gross and must not be described as verified take-home capacity.

## 5. Run the cloud isolation and persistence matrix

Record expected/actual result, test-user role, deployed code revision, timestamp and redacted evidence. Mark unexecuted steps Not Tested.

| Test | Expected result |
|---|---|
| Register, verification, login, logout, direct financial URLs after logout | Auth works; financial content/API reads are denied when signed out |
| A/B list/filter/get/update/delete/bulk/upsert using the other user's synthetic IDs | Other user's records never returned or changed; an ID/filter cannot override authenticated ownership |
| Forged created_by_id and User.role updates | Ownership/privilege escalation denied by platform rules |
| Contribution endpoint with foreign goal ID or different demo profile | Denied; no new contribution row |
| Two sessions contribute 10 and 20 to A's goal initially at 100 | Two rows persist and total is 130 after reload; retry the same request ID without adding again |
| Edit that goal's name/target | Logged contributions remain; Starting savings edits the baseline, not the derived total |
| Income/profile/bill/budget/goal/property/mortgage CRUD | Reload and logout/login retain changes; deletes/cascades have the documented scope |
| Ask Avera in A/B and after mode switching | Answers use that user's active dataset and contribution-adjusted goals; never the other user's records |
| Private résumé uploaded by A, signing/parsing attempted by B | Denied before provider use; no service-role bypass |
| Feedback submit, network failure, retry | Consent required; only rating/message/key/consent in payload; no automatic balances or chat attached; one persisted submission per retry key |

Repeat authorization checks with a separately controlled disposable app-admin user if Base44 supports that role. Ordinary users must not be able to grant themselves it. Explicitly test all financial entities, not just goals. The automated harness below covers only a subset.

## 6. Complete genuine Plaid Sandbox Link

In each ordinary browser profile, choose **Connect a Test Bank** and complete actual Plaid Link against a supported Sandbox institution. Follow Plaid's current Sandbox test instructions; standard test credentials are `user_good` / `pass_good` where supported. Never enter real bank credentials. Reference: https://plaid.com/docs/sandbox/ .

Verify Connected — Sandbox appears only after a successful response, account names/masks/balances match Plaid's Sandbox responses, and user A cannot sync/disconnect user B's Item. Frontend network requests, logs and analytics must contain no Plaid secret or access token. Check loading, cancellation, failures, expired/revoked Items, reconnect and disconnect. Programmatic token creation does not replace this real Link flow.

Use the Plaid Sandbox controls to exercise transaction additions, modifications, removals, pagination and expired/reauthentication states. Repeat sync and verify no duplicates, and compare account/transaction results with the provider rather than seeded records. Interrupt writes/network access and verify recovery without advancing an incomplete cursor. For legacy adoption, create only an artificial legacy Sandbox Item through authorized server tools in the isolated app, then confirm first sync/disconnect succeeds and the legacy token is retired; never expose it through browser code.

## 7. Exercise three demo scenarios and AI/discovery

For each of Early Career Professional, Multi-Income Household and Financial Improvement:

1. Load the labeled **Sample data** workspace and complete the financial workflows. A locally seeded profile is not proof of Plaid integration.
2. Separately load the Plaid-backed option; require a real Sandbox response. If it falls back to Sample data, record the Plaid attempt as failed, not passed.
3. Verify Overview, allocation/outlook, Yearly Plan, budgeting, goals, properties and Ask Avera reflect the active workspace. Validate amount/date consistency against stored synthetic records.
4. Create ordinary records for A/B, then reset A's demo. Only A's demo-tagged records and connections/contributions may be removed. B and A's ordinary records must remain unchanged. Feedback submissions are deliberately outside demo reset.
5. Ask numerical questions with known answers, missing/stale/contradictory values, gross/net mixes and injected instructions in record names. Verify actual AI answers against deterministic calculations. Prompt text and fixture tests alone are insufficient.
6. Search jobs broadly and narrowly, check source URLs, compensation units, location and unverified labels. Empty/network/provider failures must be transparent; no invented listings or guaranteed earnings. Save the work profile, leave, reload and re-login.
7. Test keyboard navigation, screen reader, touch keyboard and both themes on real mobile devices. Tailwind 4 uses modern browser CSS; old-browser support is not certified by Chromium fixture tests.

## 8. Run optional live harnesses

Securely bind **BASE44_TEST_APP_ID**, **BASE44_TEST_USER_TOKEN** (A) and **BASE44_TEST_SECOND_USER_TOKEN** (B) in the runner's environment settings. Tokens must come from authenticated disposable sessions for the isolated app; do not use builder/service-role tokens, production sessions or paste values in chat or command history.

```bash
node tests/live-sandbox.mjs
node tests/live-isolation.mjs
```

The Sandbox harness creates a real programmatic test Item, syncs/repeats a bounded duplicate check, and disconnects in finally. The isolation harness creates only its own synthetic goals, tests bidirectional foreign goal CRUD/contribution denial and concurrent contribution persistence, and attempts cleanup. Both print statuses without tokens, IDs or financial contents. Exit 2 means prerequisites are missing and no requests ran; exit 1 means failure, not a pass. Cleanup failures require operator review in the isolated app.

These harnesses do not cover all entities, admin roles, private files, full provider reconciliation, live AI truthfulness or actual Link. Keep those manual results distinct. Run the two-user test without sharing storage/session tokens between browsers.

## 9. Release decision and teardown

Keep external Demo Mode launch blocked until hosted authorization, real Link, durable primary workflows, private files and actual AI grounding have demonstrated results. Confirm failure recovery and feedback persistence. Update the acceptance report/score only from new evidence; do not treat source repairs as completed cloud tests.

Disconnect the disposable Sandbox Items, remove synthetic records/demo workspaces, revoke disposable sessions and remove test users through Base44's supported controls. Keep only redacted evidence. Restore the original local app mapping/public environment if you changed it; inspect the target before any future deployment. Do not delete or reset the ordinary/live app.
