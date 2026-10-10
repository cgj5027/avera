import { base44 } from '@/api/base44Client';

// Browser checks complement server authorization; they cannot establish AI grounding.
export const SERVICE_TIMEOUT_MS = 20000;
export const MAX_QUESTION_LENGTH = 2000;

async function authenticatedInvoke(name, payload) {
  const user = await base44.auth.me();
  if (!user?.id) throw new Error('Sign in to continue.');
  let timer;
  try {
    const response = await Promise.race([
      base44.functions.invoke(name, payload),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Service timed out.')), SERVICE_TIMEOUT_MS);
      }),
    ]);
    const current = await base44.auth.me();
    if (current?.id !== user.id) throw new Error('Your account changed. Please try again.');
    return response.data;
  } finally {
    clearTimeout(timer);
  }
}

export async function askAvera(question) {
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH) {
    throw new Error('Enter a question of up to 2,000 characters.');
  }
  // Never accept user IDs, financial context, or system instructions from the UI.
  const data = await authenticatedInvoke('askAvera', { question: question.trim() });
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

export async function searchOpportunities(profile) {
  const data = await authenticatedInvoke('searchJobOpportunities', {
    skills: profile?.skills ?? '',
    preferred_roles: profile?.preferred_roles ?? '',
    work_mode: profile?.work_mode ?? 'any',
    location: profile?.location ?? '',
    weekly_hours: profile?.weekly_hours ?? 0,
    target_monthly_income: profile?.target_monthly_income ?? 0,
  });
  if (!Array.isArray(data?.opportunities)) throw new Error('Invalid search response.');
  const items = data.opportunities.filter(item =>
    item && typeof item.title === 'string' && item.title.trim() &&
    typeof item.company === 'string' && item.company.trim() && sourceListingUrl(item.url) &&
    (item.compensation == null || typeof item.compensation === 'string') &&
    (item.location == null || typeof item.location === 'string')
  ).map(item => ({ ...item, url: sourceListingUrl(item.url) }));
  if (items.length !== data.opportunities.length) throw new Error('Search returned unverified listing data.');
  return items;
}
