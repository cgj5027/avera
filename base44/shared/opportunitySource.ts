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

/** Experience levels accepted from the profile; used as a search filter. */
export const EXPERIENCE_LEVELS = ['entry_level', 'mid_level', 'senior'];

/** True when a posting's title clearly targets a different experience level. */
export function titleMismatchesExperience(title, level) {
  const t = (title || '').toLowerCase();
  if (level === 'entry_level' &&
      /\b(senior|sr\.?|lead|principal|staff|director|head of|manager)\b/.test(t)) return true;
  if (level === 'senior' &&
      /\b(entry[- ]level|junior|assistant|no experience)\b/.test(t)) return true;
  return false;
}

/** Profile text -> lowercase keyword tokens (3+ chars) for title matching. */
function keywords(text) {
  return (typeof text === 'string' ? text.toLowerCase().split(/[,;/]|\s+/) : [])
    .map((w) => w.replace(/[^a-z0-9+#]/g, ''))
    .filter((w) => w.length >= 3);
}

/** First hourly rate in a compensation string ("$20-$30/hr" -> 20). */
function hourlyRateFrom(text) {
  const m = typeof text === 'string'
    ? /(?:\$|usd\s*)?(\d+(?:\.\d+)?)\s*(?:\/|per\s+)?\s*(?:hr|hour)/i.exec(text)
    : null;
  const rate = m ? Number(m[1]) : NaN;
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Server-side relevance score for one normalized listing: preferred roles,
 * available hours and the monthly income target all raise the score.
 */
export function scoreOpportunity(item, profile) {
  const title = (item.title || '').toLowerCase();
  const roles = keywords(profile.preferred_roles);
  const skills = keywords(profile.skills);
  let score = 0;
  if (roles.length && roles.some((w) => title.includes(w))) score += 3;
  if (skills.length && skills.some((w) => title.includes(w))) score += 1;
  const rate = hourlyRateFrom(item.compensation);
  const hours = Number(profile.weekly_hours);
  const target = Number(profile.target_monthly_income);
  if (rate && Number.isFinite(hours) && hours > 0) {
    if (Number.isFinite(target) && target > 0) {
      const monthly = rate * hours * (52 / 12);
      if (monthly >= target * 0.9) score += 2;
      else if (monthly >= target * 0.5) score += 1;
    }
    const haystack = `${title} ${(item.compensation || '').toLowerCase()}`;
    if (/part[- ]time/.test(haystack) && hours < 35) score += 1;
    if (/full[- ]time/.test(haystack) && hours >= 35) score += 1;
  }
  return score;
}

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
      `Experience level: ${profile.experience_level === 'senior' ? 'senior (10+ years)' : profile.experience_level === 'mid_level' ? 'mid-level (3-9 years)' : 'entry-level (0-2 years)'}`,
      'Experience level is a hard filter: only include listings suited to that level. Never return postings that clearly require more or less experience.',
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
  const level = EXPERIENCE_LEVELS.includes(profile.experience_level) ? profile.experience_level : 'entry_level';
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
    // Experience level is a filter, not just a preference: drop clear mismatches.
    .filter((item) => !titleMismatchesExperience(item.title, level))
    .map((item) => ({ ...item, match_score: scoreOpportunity(item, profile) }))
    // Best fit first; Array.prototype.sort is stable, so equal scores keep order.
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, MAX_LISTINGS);
  return { source_provider: providerId, experience_level: level, opportunities };
}