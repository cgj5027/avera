import { secrets } from 'base44:runtime';

const HOST = 'https://api.openwebninja.com';
export const LINKEDIN_SECRET = 'OPENWEBNINJA_API_KEY';
export const linkedInConfigured = () => Boolean(secrets.get(LINKEDIN_SECRET));
const text = (value, limit = 400) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

function advertisedPay(job) {
  const min = job.job_min_salary;
  const max = job.job_max_salary;
  const currency = text(job.job_salary_currency, 12);
  const period = text(job.job_salary_period, 20);
  const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (!currency || !period || (!valid(min) && !valid(max))) return '';
  if (valid(min) && valid(max) && min > max) return '';
  const amount = valid(min) && valid(max) ? `${min}–${max}` : valid(min) ? `from ${min}` : `up to ${max}`;
  return `${currency} ${amount}/${period.toLowerCase()}`;
}

/** Maps the documented JSearch-compatible job fields; never invents missing data. */
export function linkedInListing(job) {
  if (!job || typeof job !== 'object') return null;
  const description = text(job.job_description, 20000).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
  const location = text(job.job_location) || [job.job_city, job.job_state, job.job_country].map(v => text(v)).filter(Boolean).join(', ');
  const modeText = `${text(job.job_title)} ${location}`;
  const work_mode = job.job_is_remote === true || /\bremote\b/i.test(modeText) ? 'remote'
    : /\bhybrid\b/i.test(modeText) ? 'hybrid' : /\bon[- ]?site\b/i.test(modeText) ? 'onsite' : null;
  const type = text(job.job_employment_type).replace(/_/g, ' ').toLowerCase();
  const employment_type = ({ fulltime:'full-time', parttime:'part-time', contractor:'contract' })[type] || type;
  const seniority = text(job.job_seniority_level).toLowerCase();
  // LinkedIn's "Mid-Senior level" cannot defensibly map to a years-based level.
  const experience_level = seniority === 'entry level' || seniority === 'internship' ? 'entry_level' : null;
  const posted = text(job.job_posted_at_datetime_utc, 80);
  const required = Array.isArray(job.job_required_skills) ? job.job_required_skills.filter(v => typeof v === 'string').slice(0, 20) : [];
  return {
    title: text(job.job_title, 200), company: text(job.employer_name, 200),
    url: text(job.job_apply_link, 2048), location, compensation: advertisedPay(job),
    employment_type, work_mode, experience_level,
    description_excerpt: description.slice(0, 3000), required_skills: required,
    posted_at: posted && Number.isFinite(Date.parse(posted)) ? posted : null,
    publisher: 'LinkedIn', source_provider: 'linkedin',
  };
}

const MAX_LINKEDIN_JOBS = 12;
const jobId = job => text(job?.job_id, 200) || text(String(job?.job_uid ?? ''), 200);

async function requestLinkedIn(url, key) {
  const response = await fetch(url.toString(), {
    headers: { 'x-api-key': key, Accept: 'application/json' },
    redirect: 'manual', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || response.status >= 300) throw new Error('LinkedIn search failed');
  const payload = await response.json();
  if (payload?.status !== 'OK' || !Array.isArray(payload.data)) throw new Error('Invalid LinkedIn search response');
  return payload.data;
}

/** Select at most 12 unique search cards before requesting any job details. */
export async function searchLinkedIn(profile) {
  const key = secrets.get(LINKEDIN_SECRET);
  if (!key) throw new Error('LinkedIn source is not configured');
  const url = new URL('/realtime-linkedin-data/search', HOST);
  url.searchParams.set('query', text(profile.preferred_roles) || text(profile.skills));
  if (profile.location) url.searchParams.set('location', text(profile.location));
  url.searchParams.set('page', '1');
  // The API pages in tens; retrieve lightweight cards, never details for all 20.
  url.searchParams.set('num_pages', '2');
  url.searchParams.set('include_details', 'false');
  url.searchParams.set('date_posted', 'month');
  // Do not use local API filters that can force detail fetching/over-fetching.
  // The common adapter applies role, seniority and work-mode filters afterward.
  const candidates = await requestLinkedIn(url, key);
  const seen = new Set();
  const selected = [];
  for (const card of candidates.slice(0, 20)) {
    const id = jobId(card);
    if (!id || seen.has(id)) continue;
    seen.add(id); selected.push(card);
    if (selected.length === MAX_LINKEDIN_JOBS) break;
  }
  if (!selected.length) return [];
  const detailsUrl = new URL('/realtime-linkedin-data/job-details', HOST);
  detailsUrl.searchParams.set('job_id', selected.map(jobId).join(','));
  const details = await requestLinkedIn(detailsUrl, key);
  // Preserve search order and ignore unexpected jobs returned by the provider.
  return selected.flatMap(card => {
    const detail = details.find(row => jobId(row) === jobId(card) ||
      (row?.job_uid != null && card?.job_uid != null && String(row.job_uid) === String(card.job_uid)));
    if (!detail) return [];
    const result = linkedInListing({...card, ...detail});
    return result ? [result] : [];
  });
}
