# Opportunity matching

Search combines the existing Base44 web-assisted `InvokeLLM` adapter with the
optional OpenWeb Ninja Real-Time LinkedIn Data API. The web adapter requests up
to 24 candidates, then searches related titles and skill synonyms when fewer
than 12 usable matches remain. Both result sets are combined, ranked and capped
at 12. The interface initially shows six; Show more reveals the rest without
another search. If expansion fails, valid first-pass matches remain available.
One search can therefore make two AI integration calls. When configured, LinkedIn
is queried concurrently and its results join the same ranking and deduplication
pipeline. A failed source does not discard successful results from the other.
The interface identifies searched sources and warns about partial failures.

## LinkedIn source setup

Subscribe to the API at
https://app.openwebninja.com/api/realtime-linkedin-data and securely add
`OPENWEBNINJA_API_KEY` to the deployed Base44 app's backend secrets. Never put it
in a `VITE_` variable, frontend code, or chat. The adapter reads it through
`base44:runtime` and sends it only to `api.openwebninja.com` in `x-api-key`.
If outbound destinations are restricted, permit that hostname in the backend's
network configuration. Without the optional key, web search continues alone.

Deploy `searchJobOpportunities` with `opportunitySource.ts` and
`linkedInSource.ts`, plus the frontend. The adapter calls
`GET /realtime-linkedin-data/search` once, requesting lightweight cards from
pages 1–2 with `include_details=false` and postings from the last month. Location
is sent when selected. Because search pages contain ten cards and there is no
exact twelve-result API parameter, up to twenty cards are received, but only
the first twelve unique job IDs are selected. A single `/job-details` request
then fetches details for those IDs only. No details are fetched for other cards,
and empty searches make no details request. Work-mode filtering runs locally
after detail retrieval, so it can reduce the final count without fetching
replacement jobs. It does not send a radius without a geo ID, guess a country
from a city, or map LinkedIn's ambiguous Mid-Senior level to years of experience.
Employment-type and seniority API filters that cause extra over-fetching are
omitted; the existing local filters remain in force.

LinkedIn data normalizes JSearch-compatible job title, employer, application
link, description, location, salary and posting-date fields into the shared
listing contract. Missing pay or salary units remain unknown. A false remote
flag is not proof of on-site work. For descriptions without explicit required
skills, the skills component measures the fraction of the user's listed skills
present in the excerpt; the card still reports that required skills are unknown.
These phrase matches are not a certification of qualifications.

API requests and detail retrieval can incur OpenWeb Ninja charges independently
of Base44 AI credits; two requested pages are not a promise of two billed units.
There are no automatic paid retries or unbounded pagination. A search makes at
most one card-search request and one detail-batch request for at most twelve
unique jobs. Requests time out
after 20 seconds, and redirects are rejected without forwarding credentials.

After configuration, perform an authenticated search with a disposable test
profile. Confirm `sources` reports LinkedIn as searched, inspect returned source
links and fields against the API response, and test an API failure while web
search remains available. Do not log request headers or the secret.

## Profile match

The displayed rating is out of **10**, with at most one decimal place. The
server retains integer weights out of 100 for ranking compatibility; the UI
divides the score and component weights by ten. A model-supplied score is ignored:

| Component | Maximum | Calculation |
| --- | ---: | --- |
| Skills | 4.5 | Fraction of evidenced required skills present in the profile |
| Interests | 2.5 | Fraction of interests/preferred roles found in title or excerpt |
| Experience | 2 | Posting's stated level matches the selected level |
| Preferences | 1 | Fraction of selected role type, work mode and location comparisons that match |

Matching uses normalized, case-insensitive phrases. It does not infer equivalent
credentials or transferable skills. Required skill phrases must occur in the
posting excerpt returned by search. Duplicate skill/interest phrases do not
increase their weight. Missing or unmatched information earns zero points.
Location preference points use the supplied location phrase. A separate
server-side distance filter enforces the saved radius before ranking. A score is profile fit, never an interview or hiring probability.

Confidence describes information coverage across the four components: high for
four, medium for two or three, low otherwise. It does not certify the source.
Cards show the component scores, matched phrases, required skills absent from
the profile, missing information, and the excerpt used for comparison.

Explicit employment-type and work-mode preferences require matching posting
fields; unknown values are excluded for those preferences. Clear seniority
mismatches are excluded. Location eligibility and work authorization still require user review. Duplicate URLs are compared after removing fragments
and common tracking parameters, with the higher-rated version retained.

## Deployment and validation

Deploy the updated `JobProfile` schema (new optional `interests` field),
`searchJobOpportunities` function and shared adapter along with the frontend.
The LinkedIn credential is optional; existing profiles and web-only deployments
remain supported.

`tests/opportunity-search.test.js` covers scoring, expanded retrieval,
deduplication, filtering and partial failure. `tests/stage2.test.jsx` covers
ratings and expanded UI results. These use fixtures. The source excerpts,
posting existence, pay, freshness and live Base44 behavior are not independently
verified. `tests/linkedin-source.test.js` additionally exercises the structured
API adapter with contract fixtures and cross-source failures. The provider's
OpenAPI download was blocked by this development environment's network policy;
the integration uses the supplied endpoint documentation and its stated
JSearch-compatible contract. No live API call was made because a credential was
not available. Confirm response compatibility and subscription access during
the live check above. Posting availability checks remain a separate integration.

## Location and search distance

`JobProfile.distance_miles` defaults to 25; users can save an integer from 1 to
250 in the work profile. Existing profiles receive the 25-mile default. When a
location is provided, both sources are filtered by that radius before ranking
and related-role expansion. A blank location explicitly leaves distance
unrestricted. Country/state-only or ambiguous origins are rejected with an
instruction to enter a city/state or postal code; the search never silently
widens the radius.

`jobDistance.ts` resolves location labels through Photon
(`https://photon.komoot.io/api/`), then calculates great-circle miles in code.
Profile and posting location labels are sent to that external geocoding service;
financial data and credentials are not sent. The request-scoped cache retains
no locations across searches. Origin lookup happens before paid search requests.
Each search allows an origin plus twelve distinct destination lookups, with
small batches and two-second request timeouts. Unresolved listings, including
remote postings with no specific resolvable location, are excluded. Exhausting
the destination lookup budget also excludes additional unverified locations.
Distances are approximate place-centre straight-line distances, not commuting
routes, exact workplace distances, or confirmation of remote-work eligibility.

Deploy the updated JobProfile schema, backend/shared helpers, and frontend.
Permit `photon.komoot.io` in backend outbound networking when restricted.
Photon is a public geocoding service; assess its usage policy and service
capacity before high-volume production use. It requires no API key. Geocoder
HTTP failures fail closed rather than returning unrestricted matches. This
cloud's policy denied a live request (403), so geocoding was validated with
fixtures in `tests/job-distance.test.js`, not a live production check.
