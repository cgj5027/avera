# Overview row-four chart review

The fourth content row now contains Monthly spending plan (one desktop column) and Income & spending (two desktop columns). Cards stack below 1024px. Existing summary, monthly flow, budget/bills and account functionality is retained.

## Financial data

The pie lists projected monthly income and planned spending by assigned category, with separate Uncategorized and Unallocated income entries. Category names are matched after trimming and ignoring case; a matching saved budget supplies the display name. Uncategorized costs include bills without a category and property/mortgage costs, which have no category field in the existing schema. No Housing category is inferred for a property.

Each category uses the larger of its combined obligations or combined budget limit. For example, $1,200 rent within a $1,500 Housing budget contributes $1,500; $2,000 Housing obligations against that budget contribute $2,000. The Overview's recurring-expense projection and four-month outlook apply this same overlap adjustment. Other pages and backend financial calculation rules remain unchanged; this is an Overview category spending plan, not a repository-wide forecast rewrite.

Manual income and expenses remain authoritative when present. Imported transactions are not added again. When spending plans are absent, linked estimates are grouped by transaction category; missing categories stay Uncategorized. Excluded transfers and duplicate imports are filtered by the existing estimator. Category-average rounding preserves the monthly estimated total to cents.

When expenses exceed income, the pie shows the expense mix and the card states the projected monthly shortfall. List percentages still explicitly describe shares of income and can total over 100%. Missing/zero income receives a prompt rather than fabricated slices. Invalid or contradictory projection totals receive an unavailable state. Unallocated income is explicitly not guaranteed savings; budget limits are planned amounts, not actual spending.

The outlook shows the current month and next three months. Short month labels fit inline; the displayed date range and accessible table retain years across December/January. Its concise heading and information icon explain averaging, included costs and fallback assumptions.

## Design and accessibility

Validated against `avera_design_system.md` chart, accessibility and responsive-layout requirements. The implementation reuses semantic chart colors, Inter typography, rounded surface cards and the existing information-hint component. The duplicated bar legend was removed. Pie values and income percentages are available as a definition list; the outlook has a keyboard-accessible data table. Chart graphics are redundant to these textual equivalents. Information buttons have contextual accessible names, visible focus rings and 24px targets. Chart animation is disabled, and figures include monthly currency units and projection labels.

`tests/overview-charts-browser.cjs` uses actual built components and intercepted authenticated API fixtures. It verifies rendered pie sectors and eight bars, four inline ticks, desktop column proportions, mobile stacking, info hints and keyboard table access, plus horizontal overflow and axe WCAG A/AA checks. Hosted records and real Plaid responses are outside this fixture validation.

Category-update validation: 186 tests passed with one existing expected failure for concurrent goal contributions. All 72 Overview browser checks passed with zero axe violations or horizontal overflow in tested states. These include named categories, Uncategorized, category/bill overlap, linked estimates, shortfalls, empty datasets and four-month outlook consistency across four widths and both themes. Lint, frontend type check, production build and diff checks passed. The original redundant pie keyboard target remains disabled; its textual equivalent remains accessible.
