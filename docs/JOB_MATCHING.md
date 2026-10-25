# Opportunity matching

Search uses the existing Base44 web-assisted `InvokeLLM` adapter. It requests up
to 24 candidates, then searches related titles and skill synonyms when fewer
than 12 usable matches remain. Both result sets are combined, ranked and capped
at 12. The interface initially shows six; Show more reveals the rest without
another search. If expansion fails, valid first-pass matches remain available.
One search can therefore make two AI integration calls.

## Profile match

The server calculates the score; a model-supplied score is ignored:

| Component | Maximum | Calculation |
| --- | ---: | --- |
| Skills | 45 | Fraction of evidenced required skills present in the profile |
| Interests | 25 | Fraction of interests/preferred roles found in title or excerpt |
| Experience | 20 | Posting's stated level matches the selected level |
| Preferences | 10 | Fraction of selected role type, work mode and location comparisons that match |

Matching uses normalized, case-insensitive phrases. It does not infer equivalent
credentials or transferable skills. Required skill phrases must occur in the
posting excerpt returned by search. Duplicate skill/interest phrases do not
increase their weight. Missing or unmatched information earns zero points.
Location comparison uses the supplied location phrase, not geocoding or radius
matching. A score is profile fit, never an interview or hiring probability.

Confidence describes information coverage across the four components: high for
four, medium for two or three, low otherwise. It does not certify the source.
Cards show the component scores, matched phrases, required skills absent from
the profile, missing information, and the excerpt used for comparison.

Explicit employment-type and work-mode preferences require matching posting
fields; unknown values are excluded for those preferences. Clear seniority
mismatches are excluded. Location eligibility remains dependent on search
extraction and user review. Duplicate URLs are compared after removing fragments
and common tracking parameters, with the higher-rated version retained.

## Deployment and validation

Deploy the updated `JobProfile` schema (new optional `interests` field),
`searchJobOpportunities` function and shared adapter along with the frontend.
No additional job-provider credentials are introduced.

`tests/opportunity-search.test.js` covers scoring, expanded retrieval,
deduplication, filtering and partial failure. `tests/stage2.test.jsx` covers
ratings and expanded UI results. These use fixtures. The source excerpts,
posting existence, pay, freshness and live Base44 behavior are not independently
verified. A licensed job-data provider and live posting checks remain separate
integrations; this change does not claim to implement them.
