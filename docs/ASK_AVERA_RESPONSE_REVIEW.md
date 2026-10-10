# Ask Avera response improvements

User priority: more specific advice using saved records.

## Changes

- `base44/functions/askAvera/entry.ts` still retrieves only authenticated user-owned records in the active ordinary/demo dataset. It now includes normalized monthly equivalents for each named income source and bill, and derived planning insights.
- `base44/shared/assistantInsights.ts` calculates goal amounts remaining, months remaining, required monthly contributions, and income gaps after reserving other dated goals. Formula results are compared against existing frontend financial calculations in automated tests, including negative capacity. No change to frontend business calculations or financial records.
- Missing/invalid income and expenses yield an unknown surplus, rather than an apparently verified zero. Insights flag unknown gross/net basis, missing accounts, invalid balances, stale/undated balances, and overlapping bill/budget categories.
- Responses are instructed to answer directly, explain two or three relevant saved facts, name the bills/goals that matter, and suggest one or two practical options. Planning estimates, hypothetical choices and stored facts must be distinguished. One focused question is preferred when necessary data is missing.
- Prompts distinguish the additive Yearly Plan from the category-inclusive Overview when bills overlap category budgets. They forbid promising savings from budget limits, ranking spending using the transaction sample, describing surplus as existing cash, estimating taxes, inventing opportunities, or claiming changes were made.
- Existing model response schema and read-only behavior remain. Empty and oversized model replies are rejected. Untrusted names/descriptions/questions remain data rather than instructions.

## Verified and unverified

Tests execute pure insight calculations and the actual backend handler using SDK/LLM fixtures. They verify normalized values, goal math parity, missing/invalid records, unknown income basis, account freshness, budget overlaps, user isolation, prompt requirements, and empty response rejection. Testing prompt instructions does not prove that every live model response follows them. There is no blanket claim that all financial prose is deterministically validated.

No UI components were changed. Existing design-system styles, response Markdown sanitization, conversation layout and accessibility behavior remain in place. Existing tests cover the response renderer.

The change needs deployment of the updated askAvera function and its shared modules. Live Base44/model execution and a human review of actual generated advice were not executed here. Conversation history is still not sent to the backend; this update targets personalized record-based answers rather than multi-turn memory.

## Suggested live review

Ask about the largest planned expenses, affordability of an extra expense, a named goal, two competing goals, an overdue goal, incomplete income records, unknown balance timestamps, and a bill sharing a budget category. Answers should cite the actual records, reproduce provided calculations, label uncertainty briefly, and offer relevant next steps without inventing savings or executing changes. Test ordinary and demo datasets with two authenticated users separately.

## Executed checks

Full test suite: 10 files passed, 229 tests passed and one pre-existing expected failure. Production build, lint, backend type checking and whitespace checks passed. No new UI or live-model tests were claimed.

## Disclaimer and response formatting

The shared Ask Avera page/drawer now keeps this disclaimer visible above the composer: “AI can make mistakes. Verify important information and consult a financial advisor before making financial decisions.” Responses use semantic Markdown lists with visible bullets/numbers and indentation, short paragraph spacing, relaxed line height, modest heading sizes and indented quotations. The backend asks for formatting appropriate to the answer, without forcing lists on simple replies. Markdown links/images remain suppressed. Styles use existing semantic tokens and the design system's 16px body text. Financial calculation behavior is unchanged.

The response-rendering test checks bullet and numbered lists alongside the existing link/image suppression and account-switch isolation. Chat browser fixtures include lists within long replies and exercise the persistent composer, light/dark layouts, page/drawer responsiveness and accessibility.
