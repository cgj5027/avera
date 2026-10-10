# Stage 3 persistence and opportunity-search follow-up

Branch: `stage3-codex-review`. This follow-up addresses manual/Sandbox income saving, work-profile persistence and built-in web search. Hosted Base44 behavior and real provider availability remain unverified.

## Verified defects and repairs

| Priority | Finding | Repair and location |
| --- | --- | --- |
| High | Ordinary records with an optional `demo_profile` stored as null or blank were excluded by a missing-field-only filter. Reproduced with durable API fixtures; the deployed representation has not been inspected. | Accept missing/null/blank while retaining authenticated ownership and excluding named demo datasets in `src/services/dataService.js` and `base44/shared/dataset.ts`. New ordinary writes use a blank tag. |
| High | Adding detected income after canceling a prior income edit could reuse the old edit ID and overwrite that source. | Separate create-only detected-income handler in `src/pages/YearlyPlan.jsx`. |
| Medium | Work-profile selection used the first historical record; unsaved resume suggestions could mutate the displayed saved profile. | Choose the latest updated profile, require a confirmed save ID, merge partial save receipts and keep resume drafts separate in `src/components/opportunities/OpportunityDiscovery.jsx`. Ask Avera also requests the latest profile. |
| Medium | Malformed provider results could appear as a legitimate empty search. A single narrowly filtered response offered no recovery. | Validate object/JSON-string responses, reject malformed results, request more candidates, and attempt related roles once while preserving profile constraints in `base44/shared/opportunitySource.ts`. |
| Medium | Job search shared the assistant's 20-second client deadline. | Dedicated 60-second deadline in `src/services/assistantService.js`; provider failures are sanitized by `base44/functions/searchJobOpportunities/entry.ts`. |
| Medium | Mobile detected-income actions and long status labels overflowed the page. Income forms used two mobile columns. | Wrap actions and shared status labels; use single-column mobile income forms. Existing semantic colors and components retained. |

## Integration status and limits

The provider remains Base44 `InvokeLLM` with built-in public-web search. No dedicated employment API is configured or claimed. Related-role recovery uses at most two provider calls. Links and response fields are validated, but the application does not prove that postings are still open or compensation is accurate. A genuine empty result stays empty; service failure retains clearly labeled demonstration listings. Search is disabled until a work profile with skills is saved.

Automated tests use authenticated SDK/provider fixtures and actual source/components. They establish behavior against missing/null/blank tags, another user's records, named demo datasets, page returns, failed saves, stale edit state, resume cancellation, invalid provider responses, URL filtering, empty searches and timeouts. They do not certify deployed RLS, cloud persistence, model behavior or real web-search availability.

## Executed validation

- `npm test`: 7 files, 167 passed and 1 expected failure (the existing concurrent goal-contribution defect). No skipped tests.
- Frontend/backend type checks, lint, production build and `git diff --check`: passed.
- `node tests/persistence-followup-browser.cjs`: 72 Chromium fixture checks across 320/390/768/1440px, light/dark themes; no horizontal page overflow or axe WCAG A/AA violations in the tested states. Save, update, page-return, source-linked, empty and unavailable states exercised.
- `npm run test:stage3:browser`: 144 existing Stage 3 Chromium fixture checks passed, with zero axe violations, including populated financial pages, reset, failed synchronization and disconnect states.
- Real Base44 persistence, two-user hosted authorization and live built-in search: **Not Tested**; test-app deployment/bindings are unavailable in this checkout.

## Deployment and manual verification

Deploy the frontend and revised backend functions/shared modules to the same Base44 test app. In manual/Sandbox mode, save income, return to Yearly Plan and reload; edit one source, cancel, then add detected income and confirm both remain. Save/edit a work profile, leave the page and reload. Test specific and related roles, a restrictive location and unavailable search. Repeat with another authenticated user and confirm neither user's records appear for the other. This hosted verification remains required before claiming the reported cloud issues are resolved.
