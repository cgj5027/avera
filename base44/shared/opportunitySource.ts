/**
 * Opportunity source adapter (provider-neutral listing contract).
 *
 * searchListings(base44, profile, providerId) returns validated, normalized
 * listings: { source_provider, opportunities: [{title, company, url,
 * compensation, location, publisher, posted_at, match_reasons}] }.
 *
 * To move to an approved job-data API (Adzuna, USAJOBS, ...), register another
 * provider below that returns the same raw shape; profile matching, validation
 * and presentation stay unchanged. Never invent jobs, URLs or compensation.
 */

const MAX_LISTINGS = 6;

/** Server-side validation of a direct listing URL. */
export function isPublicHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') ||
        host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example') ||
        host === 'example.com' || host.endsWith('.example.com')) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return false;
    return true;
  } catch {
    return false;
  }
}

/** Normalizes and validates one raw listing; returns null when unusable. */
function normalizeListing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 200) : '';
  const company = typeof raw.company === 'string' ? raw.company.trim().slice(0, 200) : '';
  const url = typeof raw.url === 'string' ? raw.url.trim() : '';
  if (!title || !company || !isPublicHttpsUrl(url)) return null;
  // Board landing/index pages ("Babysitting jobs in Portland") are not postings.
  if (/^(search|browse|find)\b.*\bjobs\b/i.test(title) || /\bjobs?\s+in\b/i.test(title.slice(0, 40))) return null;
  // Known search-results URL shapes are never a posting either.
  const checkUrl = url.toLowerCase();
  if (checkUrl.includes('/search?') || checkUrl.includes('/jobs/search') ||
      (/indeed\.com\/q-/.test(checkUrl) && checkUrl.endsWith('-jobs.html'))) return null;
  const reasons = Array.isArray(raw.match_reasons)
    ? raw.match_reasons
        .filter((r) => typeof r === 'string' && r.trim())
        .slice(0, 3)
        .map((r) => r.trim().slice(0, 140))
    : [];
  const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const freshness = text(raw.posted_at, 40);
  return {
    title,
    company,
    url,
    compensation: text(raw.compensation, 80),
    location: text(raw.location, 120),
    publisher: text(raw.publisher, 60),
    // A vague freshness answer is no answer: the UI only shows a real one.
    posted_at: freshness && /^unknown|n\/?a|null$/i.test(freshness) ? null : freshness,
    match_reasons: reasons,
  };
}

/** Initial provider: web search grounded in real search results. */
async function searchViaWebSearch(base44, profile) {
  const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    add_context_from_internet: true,
    prompt: [
      'Search the web for current, real job and gig listings that match this candidate profile.',
      '',
      'PROFILE:',
      `Skills: ${profile.skills}`,
      `Experience: ${profile.experience || 'not provided'}`,
      `Preferred roles: ${profile.preferred_roles || 'any'}`,
      `Work mode: ${profile.work_mode}`,
      `Location: ${profile.location || 'any (prefer remote or major US metros)'}`,
      `Available hours per week: ${profile.weekly_hours || 'flexible'}`,
      `Target income: ${profile.target_monthly_income ? `$${profile.target_monthly_income} per month` : 'not specified'}`,
      '',
      'Return up to 6 REAL listings from the search results, varied across employers.',
      'Only include a listing when you have its direct URL to the posting itself. Never invent a URL, and never return a search-results or listings-index page.',
      'compensation: a short string such as "$15-$18/hr" or "$22/hr + tips" when known, otherwise empty.',
      'location: the listing\'s location, or "Remote".',
      'publisher: the job board or site the listing came from (for example Indeed, LinkedIn, or a company careers page), otherwise empty.',
      'posted_at: how recently the listing was posted, exactly as the source states it (for example "3 days ago"), otherwise empty.',
      'match_reasons: 1-3 short reasons this listing fits the profile, derived only from the profile and the listing itself (for example "Matches preferred role: bookkeeping").',
    ].join('\n'),
    response_json_schema: {
      type: 'object',
      properties: {
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              company: { type: 'string' },
              url: { type: 'string' },
              compensation: { type: 'string' },
              location: { type: 'string' },
              publisher: { type: 'string' },
              posted_at: { type: 'string' },
              match_reasons: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'company', 'url'],
          },
        },
      },
      required: ['opportunities'],
    },
  });
  return Array.isArray(llm?.opportunities) ? llm.opportunities : [];
}

// Registered providers. Provider-specific queries, parsing and credentials
// live only here — never in the request handler or the UI.
const PROVIDERS = {
  web_search: searchViaWebSearch,
};

/**
 * Runs the selected provider and returns validated, normalized results.
 * Invalid listings are dropped, not fixed up.
 */
export async function searchListings(base44, profile, providerId = 'web_search') {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error('Unknown opportunity source.');
  const rawList = await provider(base44, profile);
  const seenUrls = new Set();
  const opportunities = (Array.isArray(rawList) ? rawList : [])
    .map(normalizeListing)
    .filter(Boolean)
    .filter((item) => {
      // Different postings occasionally collapse onto one board page; show it once.
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    })
    .slice(0, MAX_LISTINGS);
  return { source_provider: providerId, opportunities };
}