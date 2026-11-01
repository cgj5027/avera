# Testing remediation follow-up — November 1, 2026

This follow-up addresses the four failures in the original Avera testing report
at `work/platform-testing/packaged-report/Avera_Testing_Report.html`. The original
report remains a record of the pre-fix results.

| Original case | Finding | Implemented remediation |
|---|---|---|
| TC-400 | Feedback accepted 100 KB of unused padding | Use the shared streaming JSON reader: 16,384-byte cap, ten-second deadline, malformed-object rejection, and safe HTTP 400/408/413 responses before persistence. |
| TC-401 | Goal contributions accepted the same oversized request | Apply the same reader before goal lookup or contribution writes. Preserve ownership validation and retry deduplication. |
| TC-117 | Spending edit/delete test depended on an October fixture being in the current month | Freeze the test date and align its spending record with that month. Exercise October, the November rollover, and the January year rollover; restore the clock afterward. |
| TC-409 | Short-screen chat composer was clipped above mobile navigation | Move the AI disclosure into the scrollable conversation, leaving the composer anchored outside the message log. Preserve the disclosure, question label, keyboard hint and Send control. |

The remaining unbounded JSON handlers (Plaid Link, exchange, disconnect, sync,
and income projection) now use the same request reader. Authentication still
precedes parsing. Regression cases for all seven handlers verify oversized
requests with missing/understated/oversized Content-Length, invalid JSON and
stalled streams, with no database/provider access. Existing success, ownership,
retry and failure-sanitization tests remain in the full suite.

Vitest discovery is explicitly restricted to `tests/**/*.test.{js,jsx,ts,tsx}`
so archived evidence and scratch reproduction files cannot become test inputs.

## Validation

- All 422 tests passed across 19 test files, including 21 new handler-boundary
  cases and the three month/year variants of the spending UI workflow.
- ESLint, frontend type checking and backend type checking passed.
- Production build passed using synthetic public app configuration for local
  browser fixtures. The pre-existing large-bundle warning remains.
- Chat browser audit passed all 84 checkpoints across both themes, four widths,
  short viewports and demo/Sandbox modes, with zero reported accessibility
  violations. This includes the previously failing 390 × 520 page and the
  drawer, long replies, Enter/Shift+Enter and Escape/focus restoration.

## Deployment boundary

These are source and local-fixture fixes. Deploy the revised backend functions
and frontend through the existing isolated Base44 workflow before hosted
verification. No hosted deployment, gateway configuration, real mobile keyboard,
real bank connection or live two-user authorization was verified by this change.
The eight hosted checks in the original report remain untested.
