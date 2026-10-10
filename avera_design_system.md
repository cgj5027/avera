# Avera Alternative — Design System

> **Version:** 2.0 — 2026-10-09  

> **Status:** Authoritative visual design specification  
> **Product:** Avera Alternative — household financial wellness and income opportunity platform  
> **Tagline:** Your finances. Your rules. Your control.  
> **Audience:** Product designers, developers, Codex, Claude Code, and other coding agents

## 1. How to Use This Document

Treat this file as the source of truth for Avera's visual design. Use the semantic tokens defined here throughout the web and mobile applications.

- Do not introduce new colors directly inside components.
- Do not use raw HEX values when a semantic token exists.
- Do not use color as the only way to communicate financial or agent status.
- If a new visual need appears, extend this document before adding a token.
- Preserve the same visual language across web and mobile.

## 2. Product and Brand Context

Avera Alternative is a secure, responsive household financial wellness application for single- and multi-income households. It helps users understand income, bills, budgets, annual outlook, savings goals, property equity, and potential additional income opportunities. One conversational assistant, Ask Avera, explains user-authorized financial information and offers transparent recommendations. It does **not** execute, authorize, schedule, or initiate financial payments.

The core operating principle is:

> **Connect or Enter -> Organize -> Calculate -> Explain -> Explore -> Decide**

The interface must always reinforce that the user remains in control. It should feel like a calm, thoughtfully designed home environment rather than a cold banking terminal or an aggressive trading application.

## 3. Brand Meaning

The most defensible meaning associated with **Avera** comes from the Latin *avere*, meaning **"to be well."** For this product, the name represents financial well-being, household stability, and the confidence that comes from knowing what is happening next.

The visual concept is:

> **Financial well-being at home**

### Brand attributes

- Trustworthy
- Calm
- Human
- Modern
- Chic
- Organized
- Protective
- Transparent
- Capable without feeling controlling

### Desired user feeling

> My finances are organized, I understand what is happening, and I remain in control.

## 4. Visual Direction

Avera combines cool, grounded colors with warm residential neutrals:

- **Deep teal** communicates trust, stability, and intelligent orchestration.
- **Sage** communicates balance, wellness, and steady financial progress.
- **Warm linen and porcelain** make the product feel comfortable and residential.
- **Muted clay** adds humanity, warmth, and restrained personality.
- **Deep ink** provides precision without the severity of pure black.

Avoid a visual identity dominated by bright corporate blue, neon green, harsh white, glossy gradients, or crypto-style black. Avera should feel premium and current, but never speculative or intimidating.

## 5. Core Brand Palette

| Token | Name | HEX | Primary use | Meaning |
|---|---|---:|---|---|
| `brand-primary` | Avera Forest | `#214E4A` | Logo, primary navigation, primary actions, active states | Trust, stability, clarity |
| `brand-primary-strong` | Deep Evergreen | `#163C3A` | Hover states, dark brand fields, high-emphasis headers | Protection, confidence |
| `brand-secondary` | Restorative Sage | `#8FAF9F` | Secondary controls, charts, selections, supporting graphics | Wellness, balance, progress |
| `brand-accent` | Hearth Clay | `#B85C43` | Milestones, warm emphasis, selected calls to action | Humanity, warmth, motivation |
| `neutral-background` | Warm Linen | `#F7F2E8` | Main light-mode background | Home, comfort, reduced visual stress |
| `neutral-surface` | Soft Porcelain | `#FFFDFC` | Cards, panels, modals, summaries | Clarity, breathing room |
| `neutral-text` | Avera Ink | `#182421` | Headlines, balances, primary body text | Precision, confidence |
| `neutral-text-muted` | Quiet Stone | `#66736E` | Secondary text, metadata, inactive icons | Calm hierarchy |

### Recommended color distribution

- **60% warm neutrals:** application backgrounds and surfaces
- **25% forest and ink:** navigation, typography, and structure
- **10% sage:** supportive elements and data visualization
- **5% clay:** meaningful accents and milestones

Clay must not represent errors. Reserve the danger palette for actual risk, failure, or destructive actions.

## 6. Semantic Color Tokens

Components must consume semantic tokens instead of core palette values.

### Light mode

| Semantic token | HEX | Use |
|---|---:|---|
| `background` | `#F7F2E8` | Page and application background |
| `surface` | `#FFFDFC` | Cards, panels, sheets, and modals |
| `surface-subtle` | `#EEF1EC` | Grouped content, table headers, secondary panels |
| `surface-selected` | `#E3ECE7` | Selected rows, filters, and navigation |
| `text-primary` | `#182421` | Primary text and financial values |
| `text-secondary` | `#5C6863` | Supporting copy and metadata |
| `text-inverse` | `#FFFFFF` | Text on dark brand and semantic backgrounds |
| `border-default` | `#D6DED9` | Card and input borders |
| `border-strong` | `#A7B6AF` | Focus-adjacent structure and emphasized dividers |
| `action-primary` | `#214E4A` | Primary buttons and links |
| `action-primary-hover` | `#163C3A` | Primary hover and pressed states |
| `action-secondary` | `#E3ECE7` | Secondary buttons and controls |
| `action-accent` | `#B85C43` | Warm, high-value moments and milestones |
| `focus-ring` | `#326B86` | Keyboard focus indicator |

### Dark mode

Dark mode should remain warm and organic. Do not invert the interface mechanically.

| Semantic token | HEX | Use |
|---|---:|---|
| `background` | `#101917` | Page and application background |
| `surface` | `#172522` | Cards, panels, sheets, and modals |
| `surface-subtle` | `#20332F` | Grouped content and secondary panels |
| `surface-selected` | `#29443D` | Selected rows, filters, and navigation |
| `text-primary` | `#F4F1EA` | Primary text and financial values |
| `text-secondary` | `#A8B6B0` | Supporting copy and metadata |
| `text-inverse` | `#182421` | Text on light actions and badges |
| `border-default` | `#344843` | Card and input borders |
| `border-strong` | `#526A63` | Emphasized dividers |
| `action-primary` | `#8FC1B2` | Primary buttons and links |
| `action-primary-hover` | `#A4D0C3` | Primary hover and pressed states |
| `action-secondary` | `#29443D` | Secondary buttons and controls |
| `action-accent` | `#E08A6D` | Warm, high-value moments and milestones |
| `focus-ring` | `#78B7D2` | Keyboard focus indicator |

## 7. Financial, Connection, and Guidance Status Colors

Status colors must retain consistent meanings throughout the product. Pair every status color with an icon and a text label.

| Status | Foreground | Background | Examples |
|---|---:|---:|---|
| Positive / completed | `#267256` | `#EAF4EE` | Budget on track, data synchronized, goal achieved |
| Information | `#326B86` | `#EAF2F6` | Ask Avera insight, upcoming financial event |
| Attention | `#985D12` | `#FFF4DE` | Bill approaching, review recommended |
| Urgent / negative | `#A64040` | `#FBECEC` | Overdue bill, sync error, budget risk |
| User decision | `#B85C43` | `#F8E9E3` | Review an optional recommendation |
| Neutral / inactive | `#66736E` | `#EEF1EC` | Unavailable integration, disconnected account |

### Required labels

Use explicit status language: `On track`, `Approaching due date`, `Over budget`, `Overdue`, `Connected — Sandbox`, `Last synced`, `Connection needs attention`, `Manual`, `Estimated`, `Demo data`, `Opportunity unavailable`, and `Needs review`. Never show color alone as status.

## 8. Ask Avera State Presentation

Ask Avera is **one read-only financial explanation and income discovery assistant**, not a multi-agent payment orchestrator. States: `Ready`, `Analyzing your information`, `Recommendation ready`, `Information unavailable`, and `Try again`. Show the relevant record time range, provenance, assumptions, uncertainty, and sources for opportunities. Do not depict payment authorization or execution states. Make every recommendation an informational action the user controls.

## 9. Component Guidance

### Navigation

- Use Avera Forest for the primary web sidebar or mobile navigation emphasis.
- Keep the active destination visually distinct through fill, icon, and label weight.
- Avoid clay for persistent navigation.
- Use concise, household-centered labels such as `Overview`, `Bills & Budget`, `Yearly Plan`, `Goals & Opportunities`, `Properties`, and `Ask Avera`.

### Dashboard cards

- Use Soft Porcelain cards on Warm Linen in light mode.
- Use subtle borders before shadows.
- Use a small shadow only when elevation communicates interaction or layering.
- Give high-value balances and dates strong typographic hierarchy.
- Do not color an entire financial-health card red unless immediate action is genuinely required.

### Buttons

| Type | Default treatment | Use |
|---|---|---|
| Primary | Avera Forest with white text | One principal action per view |
| Secondary | Pale sage surface with Avera Ink | Supporting actions |
| Accent | Hearth Clay with white text where contrast is verified | Optional milestones or featured next steps |
| Destructive | Danger red with white text | Disconnect account, reset demo, delete record |
| Ghost | Transparent with Avera Forest text | Low-emphasis actions |

- Use verbs that describe the outcome: `Add bill`, `Set savings goal`, `Connect test bank`, `View opportunities`.
- Never label a financial action only `Continue` when a more precise label is possible.
- Destructive actions require confirmation; color alone is not confirmation.

### Inputs

- Use Soft Porcelain surfaces and `border-default` borders.
- Use the blue `focus-ring` token for keyboard focus.
- Display validation messages beside the affected field.
- Never use placeholder text as the only field label.

### Notifications

- Use the appropriate semantic foreground and tinted background.
- Include a title, plain-language explanation, timestamp when relevant, and next action.
- Avoid red for general reminders or non-urgent recommendations.

### Chat and command center

- Avera messages should use a light sage-tinted surface.
- User messages may use a restrained forest treatment.
- Tool or agent activity should appear as a structured status card, not simulated human speech.
- Recommendations must expose supporting data and assumptions.
- Ask Avera must not offer payment execution. Link to relevant views for any user-initiated edits; never silently mutate financial data.

## 10. Data Visualization

### Ordered chart palette

Use the following sequence for categorical charts:

1. Avera Forest — `#214E4A`
2. Information Blue — `#326B86`
3. Restorative Sage — `#8FAF9F`
4. Hearth Clay — `#B85C43`
5. Golden Ochre — `#B88A3B`
6. Soft Plum — `#735D78`

### Chart rules

- Always include labels, values, tooltips, or a legend.
- Do not use green and red as the only distinction between two categories.
- Use direct labeling when space permits.
- Use color to support hierarchy, not decorate every value.
- Keep gridlines subtle and secondary to the data.
- Use positive and danger colors only when the underlying meaning is genuinely positive or negative.
- Format currency, dates, and percentages consistently.

## 11. Accessibility Requirements

All implementations must target **WCAG 2.2 Level AA**.

- Normal text requires at least `4.5:1` contrast.
- Large text requires at least `3:1` contrast.
- Meaningful interface components and graphical objects require at least `3:1` contrast against adjacent colors.
- Keyboard focus must always be visible.
- Color cannot be the only indicator of status, risk, selection, or success.
- Charts require non-color distinctions such as labels, patterns, shapes, or direct values.
- Support text scaling and system font-size preferences.
- Support reduced-motion preferences.
- Test light and dark modes independently.

Verified key pairings:

| Pairing | Approximate contrast |
|---|---:|
| White on Avera Forest | `9.32:1` |
| White on Hearth Clay | `4.52:1` |
| Avera Ink on Warm Linen | `14.33:1` |
| Avera Ink on Soft Porcelain | `15.77:1` |
| Dark-mode primary text on dark background | `15.86:1` |
| Dark-mode primary button text on button background | `7.95:1` |

Recheck contrast after any color adjustment. Do not assume a visually similar shade remains compliant.

## 12. Typography Direction

Use a clean humanist sans-serif with excellent number legibility. Recommended starting point:

- **Primary:** Inter
- **Fallback:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Financial figures:** Use tabular numerals where available.

Typography should feel confident and conversational, not decorative.

- Use sentence case for headings and controls.
- Avoid all-caps labels except compact technical metadata.
- Use at least `16px` for primary body copy.
- Avoid font weights below `400` for important information.
- Give account balances, bill amounts, and due dates clear hierarchy.
- Pair large financial values with labels so the meaning is never ambiguous.

## 13. Shape, Spacing, and Motion

### Shape

- Card radius: `16px`
- Input and button radius: `10px` to `12px`
- Badge radius: full pill only for compact statuses and filters
- Avoid excessive rounding that makes the product feel playful or toy-like.

### Spacing

- Use a `4px` base spacing system.
- Prefer comfortable grouping and clear hierarchy over maximum information density.
- Use progressive disclosure for complex financial details.

### Motion

- Motion should confirm state change or explain progression.
- Keep routine transitions between `150ms` and `250ms`.
- Avoid celebratory motion for ordinary payments or debt reduction.
- Never use animation to pressure users into approving a financial action.
- Respect `prefers-reduced-motion`.

## 14. Design Tokens

Use the following CSS variables as the canonical starting point.

```css
:root {
  color-scheme: light;

  --color-background: #f7f2e8;
  --color-surface: #fffdfc;
  --color-surface-subtle: #eef1ec;
  --color-surface-selected: #e3ece7;

  --color-text-primary: #182421;
  --color-text-secondary: #66736e;
  --color-text-inverse: #ffffff;

  --color-border-default: #d6ded9;
  --color-border-strong: #a7b6af;

  --color-action-primary: #214e4a;
  --color-action-primary-hover: #163c3a;
  --color-action-secondary: #e3ece7;
  --color-action-accent: #b85c43;
  --color-focus-ring: #326b86;

  --color-success: #267256;
  --color-success-surface: #eaf4ee;
  --color-info: #326b86;
  --color-info-surface: #eaf2f6;
  --color-warning: #985d12;
  --color-warning-surface: #fff4de;
  --color-danger: #a64040;
  --color-danger-surface: #fbecec;
  --color-approval: #b85c43;
  --color-approval-surface: #f8e9e3;

  --radius-control: 0.75rem;
  --radius-card: 1rem;
  --duration-routine: 200ms;
}

[data-theme="dark"] {
  color-scheme: dark;

  --color-background: #101917;
  --color-surface: #172522;
  --color-surface-subtle: #20332f;
  --color-surface-selected: #29443d;

  --color-text-primary: #f4f1ea;
  --color-text-secondary: #a8b6b0;
  --color-text-inverse: #182421;

  --color-border-default: #344843;
  --color-border-strong: #526a63;

  --color-action-primary: #8fc1b2;
  --color-action-primary-hover: #a4d0c3;
  --color-action-secondary: #29443d;
  --color-action-accent: #e08a6d;
  --color-focus-ring: #78b7d2;
}
```

### Framework integration

Map framework-specific utilities to the semantic variables. Example:

```css
.primary-action {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  transition: background-color var(--duration-routine) ease;
}

.primary-action:hover {
  background: var(--color-action-primary-hover);
}

.primary-action:focus-visible {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
```

If Tailwind, Material UI, Chakra, SwiftUI, Jetpack Compose, or another design system is used, map its theme to these semantic roles. Do not replace this palette with the framework's defaults.

## 15. Correct and Incorrect Usage

### Do

- Create a warm-neutral dashboard with strong forest-colored structure.
- Use a single primary action per decision point.
- Explain why Avera recommends an action.
- Show data provenance, time period, assumptions, and relevant financial values alongside recommendations.
- Pair status colors with icons and explicit labels.
- Use sage for supportive progress and clay for human decision moments.
- Preserve clear confirmation and updated calculations after user-directed edits.

### Do not

- Turn every monetary gain green and every expense red.
- Use Hearth Clay for errors or destructive actions.
- Add neon colors, glossy gradients, or speculative trading aesthetics.
- Hide an agent's actions behind vague loading messages.
- Allow chat to execute payments, claim a bank connection is live in Demo Mode, or invent financial figures.
- Use color alone to communicate status.
- Introduce arbitrary HEX values inside components.

## 16. Implementation Acceptance Criteria

A visual implementation is ready only when:

- All colors originate from semantic tokens.
- Light and dark modes have been tested separately.
- Normal text meets `4.5:1` contrast.
- Meaningful controls and graphics meet `3:1` non-text contrast.
- Keyboard focus is visible on every interactive element.
- Statuses include text or icons in addition to color.
- Destructive flows clearly show what will be removed and require confirmation.
- Responsive layouts preserve hierarchy on web and mobile.
- Charts remain interpretable for users with color-vision deficiencies.
- No interface can claim successful sync, property estimate, or opportunity retrieval without a corresponding verified response.

## 17. Information Architecture and Navigation

### Primary navigation

Desktop uses a compact fixed or collapsible sidebar with logo, six destinations, and Settings anchored at bottom. Mobile uses a clearly labeled menu or compact navigation pattern with no more than 4–5 immediately visible actions; secondary destinations are reachable within one additional step. Active destinations have text and icon. Page titles should match the navigation labels.

1. **Overview** — unified financial health and Ask Avera entry.
2. **Bills & Budget** — due-date list, recurring bills, budget categories and progress.
3. **Yearly Plan** — projected income, spending, savings and monthly trend comparisons.
4. **Goals & Opportunities** — savings goals, income-gap calculator, optional job/gig discovery.
5. **Properties** — one or more properties, value estimates, liabilities, equity and monthly ownership costs.
6. **Ask Avera** — dedicated conversation, also accessible through Overview popup.
7. **Settings** — profile, household, bank connections, demo controls, privacy, notifications.

Avoid adding top-level tabs for every individual feature. Financial source mode is a contextual setting, not a separate app silo.

### Overview composition and hierarchy

At desktop width, use page heading, period selector, primary summary cards, income-versus-spending chart, due-soon bills, monthly budget progress, annual outlook preview, property snapshot if present, and suggested next steps. Place the Ask Avera launcher persistently but unobtrusively; chat opens in a right drawer on desktop and accessible full-screen sheet on mobile. On mobile cards stack into a single column or compact 2-column grid only when values remain readable.

Preferred summary cards: available cash (clearly labeled with account scope), monthly income, monthly expenses, projected monthly remaining, upcoming bills. Avoid representing net worth as available spending money. If bank data is not connected, show manually entered values with source labels.

## 18. Financial UI and Calculation Transparency

- Present currency in locale-aware formats with tabular numerals, currency symbol, and clear sign conventions. Do not treat expenses as inherently negative health signals.
- Identify `Actual`, `Projected`, `Estimated`, `User-entered`, and `Demo` figures with visible labels; place as-of date near externally sourced balances and valuations.
- Show the formula/assumptions for income gap and property equity on request.
- Monthly planning must handle pay frequency conversions, recurring due dates, variable expenses, incomplete data, and multi-income households.
- Annual plan charts show calendar months on x-axis and amounts on y-axis; separate past actuals from future projections using strokes, patterns, and explanatory labels.
- Budget category progress shows spent, limit, remaining, and percentage, not a percentage without context.
- Upcoming bills show amount, due date, status, recurrence, and editable source; payment **tracking** is allowed but payment **execution** is out of scope.
- All analytic cards and charts require meaningful empty, loading, error, insufficient-data and refresh states.

### Suggested visualization patterns

| Feature | Visual pattern | Labels and interaction |
|---|---|---|
| Income versus expenses | Two-series vertical bar chart | Monthly values and comparison tooltip |
| Monthly budget | Stacked/category progress bars | Category, spent, budget, balance |
| Yearly forecast | Actual/projection line chart | Month, actual vs projection, assumptions |
| Financial goal | Progress bar + target-date badge | Saved, target, remaining, projected pace |
| Income gap | Calculation breakdown | Goal, deadline, available savings, net shortfall |
| Property equity | Value/liability breakdown | Estimate source/date, outstanding debt, calculated equity |
| Opportunity results | List with filters | Employer, role, location, source, posted date if known |

Never suggest that an unverifiable third-party valuation is a current market appraisal. Never manufacture employment opportunities.

## 19. Properties Design Specification

Each property card shows a user-supplied property nickname/address, property type, estimated market value, outstanding mortgage balance, calculated equity, monthly mortgage amount, and recurring expenses if provided. Multiple properties should aggregate into an optional portfolio summary without conflating equity with liquid assets.

`Add property` is a guided, low-friction form. Allow manual property valuations immediately; future supported API values must display provider, retrieval date, and source type. Provide editable estimate override with clear origin. Avoid publishing full addresses in shareable exports or AI prompts unless necessary and explicitly authorized. Handle underwater equity, jointly owned properties, no mortgage, missing value, and rental ownership costs.

## 20. Ask Avera Interaction Design

- Accessible from Overview via `Ask Avera` button; allow dismiss via Escape and return keyboard focus to launcher.
- Dedicated page preserves conversation within authenticated user's authorized context; separate context per user and mode.
- Welcome suggestions: `Where did my money go this month?`, `How much can I save?`, `What bills are due?`, `How does my mortgage affect my budget?`, `How much extra income do I need?`.
- Replies should distinguish arithmetic from inference. Financial computations are deterministic backend results; AI explains those results instead of becoming the calculator of record.
- Every substantive financial answer should disclose data period, source coverage, and missing inputs when relevant. Include a `View calculation` or `View supporting records` link where feasible.
- Jobs/gigs must show external source and verified link when available; if search unavailable, state that no live search was performed.
- Include short clear educational guidance, no certainty about future returns, and no suggestion of payment automation.
- Provide plain-language recovery messages for missing data, unavailable AI, expired connection, and no opportunities found.

## 21. Demo Mode Design Specification

**Exact user-facing terminology: `Demo Mode`.** Do not use `Classroom Testing`, `Classroom Mode`, or claim live banking in the product UI.

### Mode entry

Allow `Explore Demo Mode`, `Connect a Test Bank`, and `Enter Finances Manually`. Explain: **`Experience Avera using simulated financial data. No real banking credentials are required.`** Plaid Sandbox uses the authentic Link flow to connect *simulated* institutions, not real accounts. Clearly distinguish records imported from Plaid Sandbox from Avera-owned seeded demonstration records.

### Demo scenarios

- **Early Career Professional:** salary, rent, student loans, spending and early savings goal.
- **Multi-Income Household:** two incomes, mortgage, property portfolio or primary home, bills and family goals.
- **Financial Improvement:** uneven income, recurring liabilities, savings shortfall, supplemental opportunity discovery.

Use scenario selector cards with summary, user impact and `Explore profile` action. Scenario selection applies only to a private user-scoped demo workspace. Persistent `Demo Mode` indicator appears in navigation header and account/connection settings (neutral tint, not an alarming status). Include `Reset demo` under Settings with confirmation detailing only demo records affected; manual/live data must never be removed. In seeded mode, label source `Sample data`; in Plaid Sandbox mode label `Plaid Sandbox — Test account`.

### Connection states

`Not connected`, `Connecting test institution`, `Connected — Sandbox`, `Syncing test transactions`, `Last synced [timestamp]`, `Needs attention`, `Disconnected`. Display an as-of date for balances. Never imply actual funds, ownership, or banking authority. Never show an unverified connected state after a failed Link flow.

### Demo walkthrough and feedback

Optional checklist: inspect dashboard; connect test bank/select scenario; explore bills; edit budget; view annual plan; inspect properties; create goal; Ask Avera; explore opportunity; submit feedback. Progress is non-blocking. Feedback uses accessible 1–5 controls and free text, with explicit notice that account balances or chat content are not attached to feedback. No gamified claims of financial success.

## 22. Additional Components and Interaction Rules

| Component | Design requirement |
|---|---|
| Bank connection panel | Institution name, simulated badge, masked identifier, source, sync timestamp, reconnect/disconnect actions |
| Source chip | Explicit `Manual`, `Sample data`, `Plaid Sandbox`, `Estimated`, or provider label |
| Goal card | Target, saved amount, deadline, remaining net income requirement |
| Property card | Valuation provenance, mortgage debt, equity and editable inputs |
| Opportunity card | Real source link, compensation units, work type, location and date if available |
| Toast/notification | Human-centered copy, no exposed sensitive values by default |
| Destructive confirmation | Name affected scope, require user action, show success only after backend confirms |
| Filter/selector | Persistent visible label, keyboard operable, no hidden dependency on icon only |
| AI drawer | Clear title, close affordance, stateful context, explanatory responses and error recovery |

Button copy should use exact actions: `Add income`, `Add bill`, `Save budget`, `Create goal`, `Add property`, `Connect test bank`, `Reset demo`, `Find opportunities`. Do not use `Approve payment`, `Pay now`, or `Transfer funds`.

## 23. Responsive Layout and UX Details

- Breakpoints are guidance, not hardcoded device assumptions: mobile < 640px; tablet 640–1023px; desktop >= 1024px.
- Desktop content max width ~1440px; gutters 24–32px; mobile gutters 16px.
- Forms: 1 column on mobile, at most 2 columns desktop, with logically grouped sections and persistent validation.
- Minimum touch target 24×24 CSS px under WCAG 2.2 AA exceptions; aim for 44×44 px for major touch controls.
- Motion 150–250ms, no essential information revealed only through animation; respect reduced motion.
- Charts support mobile horizontal scroll or simpler chart replacement plus accessible data tables.
- Avoid fixed-height containers that clip long balances, translated labels, or large text.

## 24. Implementation Architecture Guardrails

This is a design system, not a mandate to replace Base44's supported application scaffold. Map tokens into the existing framework rather than introducing an incompatible CSS/UI library.

- Preserve separation between presentation, calculation services, API clients, and persistence.
- Design components must consume semantic tokens, never scattered raw hex colors.
- Keep a single data-origin label and record ownership model usable by manually entered, Plaid Sandbox, and seeded demo records.
- Never hardcode displayed financial totals independently of records.
- Treat secrets, bank tokens, and user financial data as backend-managed; never put secrets in design files, public frontend config or sample screenshots.
- No real payments, automatic transfers, banking authorization or orchestration agents are within MVP scope.
- The source document remains valid for visual treatment; payment-specific concepts in the original are explicitly superseded by this file.

## 25. Acceptance Checklist (Base44 and Codex)

- [ ] The original Avera brand palette, semantic light/dark tokens, Inter typography, spacing and charts are respected.
- [ ] Top-level navigation is compact and labels match views.
- [ ] Registration, manual entry, budgets, bills, annual plan, goals, property tracking and Ask Avera each have complete UI states.
- [ ] Dashboard values are calculated from active user records with dates and source labels.
- [ ] Plaid Sandbox shows authentic simulated connection states; seeded data is clearly distinguished.
- [ ] Demo Mode is consistently named, isolated per user, and reset is scoped and confirmed.
- [ ] Three scenarios demonstrate genuinely different financial profiles.
- [ ] Ask Avera is available as popup and full view, with clear data provenance and uncertainties.
- [ ] Income opportunities show sources or a transparent unavailable state.
- [ ] Multiple properties and property valuations show source/date and calculated equity separately from liquid cash.
- [ ] Payment execution and misleading production banking functionality are absent.
- [ ] Charts show units, legends/direct labels and accessible data alternatives.
- [ ] Light/dark themes, keyboard navigation, focus restoration, readable contrast and responsive layouts are verified.
- [ ] Primary actions, errors, disconnect, resets and data deletion have appropriate confirmation and recovery states.
- [ ] Codex audit checks screens against this document and identifies testable deviations rather than inferring functional completeness from UI.

## 26. Coding Agent Directive

Use **this `design_system.md`** as the authoritative design reference for Avera Alternative and preserve existing established branding. Implement Stage 0 tokens and reusable components first, then extend this system during Stages 1–5. Do not regress existing functionality, rename Demo Mode, or introduce autonomous payment capabilities. Where source document tokens conflict with accessibility, document and validate the minimum necessary semantic-token adjustment. Return a design compliance checklist with each stage review.

## Audit accessibility clarification

Supporting text uses `#5C6863` in light mode so small labels meet 4.5:1 contrast on background, subtle and selected surfaces. Quiet Stone remains a brand palette color, not small body text. For standalone status text on application surfaces, use `success-text` (`#26734D` light / `#8FC1B2` dark) and `danger-text` (`#A64040` light / `#F0A6A6` dark). Status badges retain their existing foreground/tinted-surface pairs.
