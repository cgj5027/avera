# Avera

**Avera** is a household financial wellness and income-opportunity platform.
Tagline: **Your finances. Your rules. Your control.**
Visual specification: *Avera Alternative — Design System v2.0* (`avera_design_system.md`, authoritative).

**Current status:** manual financial workflows, three private demo scenarios, Plaid Sandbox backend functions, grounded assistant context, and web-assisted opportunity discovery are implemented. Hosted acceptance is still blocked pending real Link, two-user platform authorization, persistence and actual AI-output verification. The follow-up fixes add retry-safe goal contributions, consistent category-inclusive planning, explicit income basis and private feedback.

See [acceptance repairs](docs/ACCEPTANCE_FIXES.md) and the [isolated testing runbook](docs/ISOLATED_ACCEPTANCE_TESTING.md). The original [final review](docs/FINAL_ACCEPTANCE_REVIEW.md) records the pre-repair 65/100 assessment. Some stage/roadmap descriptions below are historical; they are not a current integration certificate.

---

## 1. Stack

- React 18 + Vite, Tailwind CSS, shadcn/ui primitives (native Base44 scaffold)
- Base44 auth (platform-managed), Base44 entities (database), backend functions (HTTP/integrations)
- Vitest (unit + integration) and a browser smoke test, ESLint + TypeScript checking
- Inter via Google Fonts, `next-themes` for light/dark/system theming

## 2. Source organization (layer separation)

```
src/
  components/                 Presentation only — no business logic
    layout/                   App shell: sidebar, mobile nav, page header, mode indicator
    states/                   Empty / loading / error states, StatusPill, SourceChip, DestinationShell
    askavera/                 Assistant drawer + conversation shell (read-only)
    accounts/, bills/, budget/, income/, goals/, properties/, opportunities/,
    yearlyplan/, finance/, overview/, settings/   Feature-level components
    ui/                       shadcn primitives
  pages/                      Route-level screens (registered in src/App.jsx): Overview,
                              BillsBudget, YearlyPlan, GoalsOpportunities, Properties,
                              AskAveraPage, Settings, ModeEntry, plus auth pages
                              (Login, Register, ForgotPassword, ResetPassword, OAuthConsent)
  services/                   Business logic & data access
    financialCalculations.js  Income/bill/budget math (pure functions, testable)
    opportunityCalculations.js  Income-gap and opportunity math
    valuationService.js       Property valuation and equity calculations
    dataService.js            Persistence layer over Base44 entities
    plaidClient.js            Plaid seam (stubbed until the backend-function stage)
  utils/                      format.js (currency/dates), constants.js (data-origin labels)
  lib/                        AuthContext, mode.js (onboarding mode), cn
  config/navigation.js        Single source of truth for nav labels/destinations
base44/                       Base44 backend: entities/ (data schemas)
tests/                        Vitest unit/integration tests + browser smoke script
docs/                         Stage audit (STAGE1_AUDIT.md)
```

Data entities: `Account`, `IncomeSource`, `Bill`, `BudgetCategory`, `Transaction`,
`Goal`, `Property`, `MortgageRecord`, `ForecastRecord`, `JobProfile`, `HouseholdProfile`.

Guardrails: no raw hex values inside components (semantic tokens only), no
fabricated totals independent of records, no hardcoded test data in calculation
services, no payment execution / transfer / banking-authorization code anywhere.

## 3. Design system mapping

- All semantic tokens (light + warm dark) live as CSS variables in `src/index.css`
  and are exposed via `tailwind.config.js` (`surface`, `surface-selected`,
  `success/info/warning/danger/approval` + surface pairs, ordered `chart-1..6`).
- Typography: Inter, sentence case, `tabular-nums` on financial figures, ≥16px body.
- Shape/motion: 16px card radius (`rounded-2xl`), 12px control radius (`--radius`),
  150–250ms transitions, `prefers-reduced-motion` respected globally.
- Accessibility: WCAG 2.2 AA targets — focus-ring blue outlines, 44px+ major touch
  targets, statuses always paired icon + text label, source chips on every figure.
- Terminology: exactly **Demo Mode** (never "Classroom Mode");
  **Plaid Sandbox — Test account**; seeded data labeled **Sample data**.

## 4. Core flows

1. **Onboarding** — first visit routes to `/welcome` (mode entry): Explore Demo
   Mode / Connect a Test Bank / Enter Finances Manually. Choice is stored in
   `sessionStorage` only; nothing is persisted and no Plaid connection is made.
2. **Auth** — email/password register → OTP verification, sign-in, password reset,
   and OAuth consent, on the platform-managed auth pages.
3. **Manual money entry** — add income sources, bills, and budget categories;
   balances, totals, and remaining amounts are computed by the calculation
   services from stored records only. Every figure carries a data-origin label.
4. **Goals & properties** — goal tracking with the income-gap breakdown, property
   cards with equity math (value minus debt), and draft persistence in dialogs so
   accidental dismissals don't lose input.
5. **Ask Avera** — launcher on Overview opens a right drawer (full-width sheet on
   mobile); Escape dismisses and focus returns to the launcher. Dedicated page at
   `/ask-avera`. Read-only by design; arrives as a real assistant in a later stage.
6. **Settings** — profile, appearance, household, bank connections ("Not connected"),
   demo controls, privacy, notifications, sign out.

## 5. Local development

```bash
npm install
npm run dev         # Vite dev server (Base44 preview/plugin wiring is automatic)
npm run build       # production build check
npm run test        # Vitest unit + integration tests
npm run test:browser # browser smoke test
npm run lint        # ESLint
npm run typecheck   # TypeScript check
```

The Base44 Vite plugin provides the platform SDK, auth, and hosting integration —
do not add a custom server, router, or state framework.

## 6. Testing approach

- **Unit/integration (`tests/`):** calculation services are pure functions
  (data in → result out), so all money math is tested without a database;
  integration tests cover the data service and page wiring.
- **Browser smoke (`tests/browser-smoke.cjs`):** end-to-end pass over the primary
  flows (onboarding, navigation, entry dialogs, dark mode, mobile overflow).
- **Manual / preview:** every destination is checked in light *and* dark mode at
  mobile (<640px), tablet (640–1023px), and desktop (≥1024px).
- **Acceptance rule for AI features (later stage):** no fabricated figures — every
  number must trace to a stored record with its source label.
- Accessibility checks: visible keyboard focus everywhere, no color-only status,
  touch targets ≥44px for major controls.

## 7. Deployment

Publishing via Base44 hosting (dashboard → publish). No external server, CI, or
container is required; the same codebase targets web and native mobile shells.

## 8. Security and secrets

- Third-party credentials (Plaid client ID/secret, any future API keys) go ONLY in
  Base44 secure environment secrets, consumed by backend functions — never in
  frontend code, design files, or this repository's docs.
- Current manual financial calculations run in deterministic frontend services.
  Any future AI context retrieval, provider credentials, and bank-token handling
  must use authenticated backend functions; those integrations are not verified.
- Out of scope product-wide: payment execution, transfers, banking authorization.

## 9. GitHub / Codex review conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Branches: `feat/stage-N-scope`, `fix/scope-detail` (e.g. `avera-stage-one`,
  `avera-stage-two`).
- PRs: describe the stage scope touched; reviewers verify against the compliance
  checklist below; design-system deviations must update the design doc first.

## 10. Roadmap stages

| Stage | Scope | Status |
|---|---|---|
| 0 | Design tokens, component library, navigation shell, onboarding | ✅ Shipped |
| 1 | Manual entry: income, bills, budgets; calculation services; audit trail | ✅ Shipped |
| 2 | Dialog draft persistence, manual-entry source-label fixes | ✅ Shipped |
| 3 | Plaid Sandbox connection via backend functions + secure secrets | Next |
| 4 | Demo Mode: scenarios, seeded Sample data, reset | Planned |
| 5 | Ask Avera: AI explanation assistant (read-only) | Planned |
| 6 | Job/gig opportunity discovery with verified external sources | Planned |

## 11. Platform notes

- Base44 backend functions and entities are the supported persistence/API layer —
  there is no arbitrary server infrastructure.
- Plaid (Stage 3) requires secrets plus a backend-function wrapper; the browser
  never contacts Plaid directly.
- Chart palette tokens are defined; dark-mode chart contrast should be re-verified
  when real charts land.

## 12. Stage-review design-compliance checklist

- [ ] All colors originate from semantic tokens (no raw hex in components)
- [ ] Light and dark modes tested separately
- [ ] Normal text ≥4.5:1 contrast; controls/graphics ≥3:1
- [ ] Keyboard focus visible on every interactive element
- [ ] Statuses include text + icon, never color alone
- [ ] Every financial figure carries a data-origin label
- [ ] No fabricated totals; no hardcoded test data in calculation services
- [ ] Responsive hierarchy preserved at mobile / tablet / desktop
- [ ] Navigation labels match page titles; compact nav on desktop, 4–5 actions on mobile
- [ ] Destructive actions require confirmation naming affected scope
- [ ] Charts have labels/legends and ordered palette only