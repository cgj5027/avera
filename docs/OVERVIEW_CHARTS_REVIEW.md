# Overview row-four chart review

The fourth content row now contains Monthly allocation (one desktop column) and Income & spending (two desktop columns). Cards stack below 1024px. Existing summary, monthly flow, budget/bills and account functionality is retained.

## Financial data

Both charts consume the same existing Yearly Plan projection for the active authenticated dataset. The pie lists projected monthly income and allocations to bills, budget limits, mortgage/property costs and any unallocated remainder. It does not add actual transactions to planned expenses or count imported income in addition to manual sources. Linked-transaction estimates remain the existing fallback when plans are absent; estimated spending is explicitly labeled.

When expenses exceed income, the pie shows the expense mix and the card states the projected monthly shortfall. List percentages still explicitly describe shares of income and can total over 100%. Missing/zero income receives a prompt rather than fabricated slices. Invalid or contradictory projection totals receive an unavailable state. Unallocated income is explicitly not guaranteed savings; budget limits are planned amounts, not actual spending. The breakdown helper is presentation logic and does not change financial calculation rules.

The outlook shows the current month and next three months. Short month labels fit inline; the displayed date range and accessible table retain years across December/January. Its concise heading and information icon explain averaging, included costs and fallback assumptions.

## Design and accessibility

Validated against `avera_design_system.md` chart, accessibility and responsive-layout requirements. The implementation reuses semantic chart colors, Inter typography, rounded surface cards and the existing information-hint component. The duplicated bar legend was removed. Pie values and income percentages are available as a definition list; the outlook has a keyboard-accessible data table. Chart graphics are redundant to these textual equivalents. Information buttons have contextual accessible names, visible focus rings and 24px targets. Chart animation is disabled, and figures include monthly currency units and projection labels.

`tests/overview-charts-browser.cjs` uses actual built components and intercepted authenticated API fixtures. It verifies rendered pie sectors and eight bars, four inline ticks, desktop column proportions, mobile stacking, info hints and keyboard table access, plus horizontal overflow and axe WCAG A/AA checks. Hosted records and real Plaid responses are outside this fixture validation.

Executed validation: 181 tests passed with one existing expected failure for concurrent goal contributions; 56 Overview browser checks and 16 Yearly Plan/Properties regression checks passed with zero axe violations or horizontal overflow in tested states. Lint, frontend type check, production build and diff checks passed. The initial browser run caught a focusable pie graphic inside an accessibility-hidden wrapper; its redundant focus target was removed and the complete Overview runner then passed.
