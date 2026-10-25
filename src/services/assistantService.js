import { base44 } from '@/api/base44Client';
import { getDataMode, getDemoWorkspace } from '@/lib/mode';

// Browser checks complement server authorization; they cannot establish AI grounding.
export const SERVICE_TIMEOUT_MS = 20000;
export const JOB_SEARCH_TIMEOUT_MS = 60000;
export const MAX_QUESTION_LENGTH = 2000;

async function authenticatedInvoke(name, payload, timeoutMs = SERVICE_TIMEOUT_MS) {
  const user = await base44.auth.me();
  if (!user?.id) throw new Error('Sign in to continue.');
  let timer;
  try {
    const response = await Promise.race([
      base44.functions.invoke(name, payload),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Service timed out.')), timeoutMs);
      }),
    ]);
    const current = await base44.auth.me();
    if (current?.id !== user.id) throw new Error('Your account changed. Please try again.');
    if (payload.dataset) {
      const dataset=getDataMode()==='demo'?{mode:'demo',profile:getDemoWorkspace()?.profile}:{mode:'ordinary'};
      if(JSON.stringify(dataset)!==JSON.stringify(payload.dataset)) throw new Error('Your dataset changed. Please try again.');
    }
    return response.data;
  } finally {
    clearTimeout(timer);
  }
}

export async function askAvera(question, history = []) {
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
    throw new Error('Enter a question of up to 2,000 characters.');
  }
  // Never accept user IDs, financial context, or system instructions from the UI.
  const data = await authenticatedInvoke('askAvera', { question: question.trim(), ...(history.length ? { history } : {}), dataset: getDataMode() === 'demo' ? {mode:'demo',profile:getDemoWorkspace()?.profile} : {mode:'ordinary'} });
  if (typeof data?.answer !== 'string' || !data.answer.trim() || data.answer.length > 20000) {
    throw new Error('Invalid assistant response.');
  }
  return data.answer;
}

/** A usable external link is not proof that the provider verified a posting. */
export function sourceListingUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example') || host === 'example.com' || host.endsWith('.example.com') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(':')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function searchOpportunities(profile, { includeMetadata = false } = {}) {
  const data = await authenticatedInvoke('searchJobOpportunities', {
    skills: profile?.skills ?? '',
    interests: profile?.interests ?? '',
    experience: profile?.experience ?? '',
    experience_level: profile?.experience_level ?? 'entry_level',
    preferred_roles: profile?.preferred_roles ?? '',
    job_type: profile?.job_type ?? 'any',
    work_mode: profile?.work_mode ?? 'any',
    location: profile?.location ?? '',
  }, JOB_SEARCH_TIMEOUT_MS);
  if (!Array.isArray(data?.opportunities)) throw new Error('Invalid search response.');
  const items = data.opportunities.filter(item =>
    item && typeof item.title === 'string' && item.title.trim() &&
    typeof item.company === 'string' && item.company.trim() && sourceListingUrl(item.url)
  ).map(item => ({
    title: item.title.trim(),
    company: item.company.trim(),
    url: sourceListingUrl(item.url),
    compensation: typeof item.compensation === 'string' && item.compensation.trim() ? item.compensation : null,
    employment_type: typeof item.employment_type === 'string' && item.employment_type.trim() ? item.employment_type : null,
    match_score: Number.isFinite(item.match_score) && item.match_score >= 0 && item.match_score <= 100 ? item.match_score : null,
    match_confidence: ['high','medium','low'].includes(item.match_confidence) ? item.match_confidence : 'low',
    match_breakdown: item.match_breakdown && ['skills','interests','experience','preferences'].every((key, index) => Number.isFinite(item.match_breakdown[key]) && item.match_breakdown[key] >= 0 && item.match_breakdown[key] <= [45,25,20,10][index]) ? item.match_breakdown : null,
    description_excerpt: typeof item.description_excerpt === 'string' ? item.description_excerpt.slice(0, 3000) : null,
    matched_skills: Array.isArray(item.matched_skills) ? item.matched_skills.filter(v => typeof v === 'string') : [],
    missing_skills: Array.isArray(item.missing_skills) ? item.missing_skills.filter(v => typeof v === 'string') : [],
    match_unknowns: Array.isArray(item.match_unknowns) ? item.match_unknowns.filter(v => typeof v === 'string') : [],
    location: typeof item.location === 'string' && item.location.trim() ? item.location : null,
    publisher: typeof item.publisher === 'string' && item.publisher.trim() ? item.publisher : null,
    posted_at: typeof item.posted_at === 'string' && item.posted_at.trim() ? item.posted_at : null,
    match_reasons: Array.isArray(item.match_reasons)
      ? item.match_reasons.filter((r) => typeof r === 'string' && r.trim()).slice(0, 3)
      : [],
  }));
  if (items.length !== data.opportunities.length) throw new Error('Search returned unverified listing data.');
  return includeMetadata ? {items,relatedRolesSearched:data.related_roles_searched === true,partialResults:data.partial_results === true} : items;
}