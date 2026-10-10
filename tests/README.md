# Audit validation

Run `npm ci`, then `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` from the repository root.

Unit tests cover calculations, money/date handling, recurrence, and redirect security. Integration tests exercise the actual React components and persistence service using an in-memory Base44 SDK fixture. They do not prove deployed RLS, email delivery, OAuth, or durable cloud persistence.

One `it.fails` test explicitly reproduces the unresolved concurrent goal-contribution overwrite. Vitest reports it as **expected fail**; it is not successful application behavior.

For browser checks, start `npm run dev -- --host 127.0.0.1` in another terminal and run `npm run test:browser`. Set `AUDIT_BASE_URL` if Vite uses another port. Chromium must be installed; `CHROMIUM_PATH` selects its executable (default `/usr/bin/chromium`). Playwright and axe-core are development dependencies.

The browser script uses fixture API responses and checks populated pages and financial dialogs at 320, 390, 768, and 1440 pixels in light/dark themes, including WCAG A/AA checks. External network assets are blocked to keep fixtures deterministic; font delivery and hosted services require separate live validation. Screenshots are written under `/tmp`.

Stage 1 acceptance still requires an authenticated live two-user run: register, verify email, log in, enter/edit/delete financial records, reload and re-login to confirm persistence, attempt access to the other user's record IDs (including an admin), and log out. Apply the revised schemas to a test Base44 app before certifying authorization. Do not use production data for these destructive fixture workflows.
