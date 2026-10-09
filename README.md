# Avera — Stage 0 Foundation

**Avera** is a household financial wellness and income-opportunity platform.
Tagline: **Your finances. Your rules. Your control.**
Visual specification: *Avera Alternative — Design System v2.0* (authoritative).

Stage 0 establishes a clean, secure, maintainable foundation on Base44's native
architecture: the design system mapped to tokens, a reusable component library,
the six-destination navigation shell, and the mode-entry onboarding flow.
**No financial modules are implemented yet** — their seams are prepared below.

---

## 1. Stack

- React 18 + Vite, Tailwind CSS, shadcn/ui primitives (native Base44 scaffold)
- Base44 auth (platform-managed), Base44 entities (database), backend functions (HTTP/integrations)
- Inter via Google Fonts, `next-themes` for light/dark/system theming

## 2. Source organization (layer separation)

```
src/
  components/                 Presentation only — no business logic
    layout/                   App shell: sidebar, mobile nav, page header, mode indicator
    states/                   Empty / loading / error states, StatusPill, SourceChip, DestinationShell
    askavera/                 Assistant drawer + conversation shell (read-only)
    finance/                  SummaryCard primitive
    overview/                 Period selector, chart placeholder, next steps
    settings/                 SettingSection, ThemeSelect
    ui/                       shadcn primitives
  pages/                      Route-level screens (one route per page, registered in src/App.jsx)
  services/                   Business logic & integration seams
    financialCalculations.js  Financial calculations (Stage 0 stubs — no hardcoded data)
    plaidClient.js            Plaid Sandbox seam (Stage 0 stub — backend-function only)
    dataService.js            Persistence seam over Base44 entities (Stage 0 stub)
  utils/                      format.js (currency/dates), constants.js (data-origin labels)
  lib/                        AuthContext, mode.js (onboarding mode), cn
  config/navigation.js        Single source of truth for nav labels/destinations
base44/                       Base44 backend: entities/, functions/ (added in later stages)
```

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

## 4. Core flows (Stage 0)

1. **Onboarding** — first visit routes to `/welcome` (mode entry): Explore Demo
   Mode / Connect a Test Bank / Enter Finances Manually. Choice is stored in
   `sessionStorage` only; nothing is persisted to the database and no Plaid
   connection is made.
2. **Navigation shell** — six destinations + Settings; desktop forest sidebar,
   mobile labeled bar (4 visible) + "More" sheet. Designed empty/loading/error
   states per destination (preview control on each page).
3. **Ask Avera** — persistent launcher on Overview opens a right drawer (full-width
   sheet on mobile); Escape dismisses and focus returns to the launcher. Dedicated
   page at `/ask-avera`. Honest not-yet-available state.
4. **Settings** — profile, appearance, household, bank connections ("Not connected"),
   demo controls, privacy, notifications.

## 5. Local development

```bash
npm install
npm run dev      # Vite dev server (Base44 preview/plugin wiring is automatic)
npm run build    # production build check
```

The Base44 Vite plugin provides the platform SDK, auth, and hosting integration —
do not add a custom server, router, or state framework.

## 6. Testing approach

- **Manual / preview:** every destination must be checked in light *and* dark mode
  at mobile (<640px), tablet (640–1023px), and desktop (≥1024px).
- **Stage 0 UI states:** each destination exposes Empty / Loading / Error previews.
- **Later stages:** calculation services are written as pure functions
  (data in → result out) so they can be unit-tested without a database; AI/agent
  behavior is verified against the "no fabricated figures" acceptance rule.
- Accessibility checks: visible keyboard focus everywhere, no color-only status,
  touch targets ≥44px for major controls.

## 7. Deployment

Publishing via Base44 hosting (dashboard → publish). No external server, CI, or
container is required; the same codebase targets web and native mobile shells.

## 8. Security and secrets

- Third-party credentials (Plaid client ID/secret, any future API keys) go ONLY in
  Base44 secure environment secrets, consumed by backend functions — never in
  frontend code, design files, or this repository's docs.
- All financial computation and bank-token handling happens server-side.
- Out of scope product-wide: payment execution, transfers, banking authorization.

## 9. GitHub / Codex review conventions

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Branches: `feat/stage-N-scope`, `fix/scope-detail`.
- PRs: describe the stage scope touched; reviewers verify against the compliance
  checklist below; design-system deviations must update the design doc first.

## 10. Roadmap stages

| Stage | Scope |
|---|---|
| 0 (this) | Design tokens, component library, navigation shell, onboarding |
| 1 | Manual entry: income, bills, budgets; calculation services (real) |
| 2 | Plaid Sandbox connection via backend functions + secure secrets |
| 3 | Demo Mode: scenarios, seeded Sample data, reset |
| 4 | Ask Avera: AI explanation assistant (read-only) |
| 5 | Goals & Opportunities, properties, forecasting |

## 11. Platform notes

- Base44 backend functions and entities are the supported persistence/API layer —
  there is no arbitrary server infrastructure.
- Plaid (Stage 2) will require secrets plus a backend-function wrapper; the browser
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
- [ ] Destructive actions (future) require confirmation naming affected scope
- [ ] Charts (future) have labels/legends and ordered palette only