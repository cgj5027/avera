# Audit validation

Run `npm ci`, then `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` from the repository root.

Unit tests cover calculations, money/date handling, recurrence, and redirect security. Integration tests exercise the actual React components and persistence service using an in-memory Base44 SDK fixture. They do not prove deployed RLS, email delivery, OAuth, or durable cloud persistence.

One `it.fails` test explicitly reproduces the unresolved concurrent goal-contribution overwrite. Vitest reports it as **expected fail**; it is not successful application behavior.

For browser checks, start `npm run dev -- --host 127.0.0.1` in another terminal and run `npm run test:browser`. Set `AUDIT_BASE_URL` if Vite uses another port. Chromium must be installed; `CHROMIUM_PATH` selects its executable (default `/usr/bin/chromium`). Playwright and axe-core are development dependencies.

The browser script uses fixture API responses and checks populated pages and financial dialogs at 320, 390, 768, and 1440 pixels in light/dark themes, including WCAG A/AA checks. External network assets are blocked to keep fixtures deterministic; font delivery and hosted services require separate live validation. Screenshots are written under `/tmp`.

Stage 1 acceptance still requires an authenticated live two-user run: register, verify email, log in, enter/edit/delete financial records, reload and re-login to confirm persistence, attempt access to the other user's record IDs (including an admin), and log out. Apply the revised schemas to a test Base44 app before certifying authorization. Do not use production data for these destructive fixture workflows.

Stage 2 coverage in `tests/stage2.test.jsx` tests allocated goal gaps, compensation assumptions, authenticated function-call boundaries, session changes, response validation, source URL restrictions, and assistant/profile recovery states. Backend functions are absent; SDK fixtures do not certify model grounding or external employment API integration. Browser checks now include Ask Avera replies, source-linked opportunity results, and drawer Escape/focus restoration. See `docs/STAGE2_AUDIT.md`.

## Stage 3 audit

The current backend functions are present. `tests/stage3-backend.test.js` executes the actual Plaid/demo/Ask handlers with SDK and provider fixtures; those fixtures do not certify hosted RLS or real Plaid. See `docs/STAGE3_AUDIT.md` for current acceptance results and residual risks; the older Stage 2 absence statement above describes its earlier audit revision.

Run `npm run typecheck:backend` in addition to the frontend checks. Start `npm run dev -- --host 127.0.0.1` and run `npm run test:stage3:browser` for the current six-route demo/Sandbox UI audit, with all four widths, both themes, populated tabs, reset confirmation, sync failure and disconnect states. External API calls are fixture-intercepted. The older generic browser runner references a retired combined goals/opportunities route and was not used as current Stage 3 evidence.

For actual programmatic Sandbox testing, securely configure `BASE44_TEST_APP_ID` and `BASE44_TEST_USER_TOKEN`, then run `node tests/live-sandbox.mjs`. The linked test app must have the revised schemas/functions and server-side Sandbox Plaid secrets deployed. Without bindings the script exits 2 without making network calls. It creates and removes only its new demo-tagged Item; it does not print tokens, record contents or IDs. This does not replace manual real Plaid Link or two-user authorization validation.
