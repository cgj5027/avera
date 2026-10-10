import { secrets } from 'base44:runtime';
export const PLAID_HOST = 'https://sandbox.plaid.com';
export class PlaidFailure extends Error {
  code: string;
  constructor(code = 'PLAID_UNAVAILABLE') { super('Plaid Sandbox request failed. Please retry or reconnect.'); this.code = code; }
}
export async function plaidRequest(path, body, timeoutMs = 20000) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new PlaidFailure('INVALID_PATH');
  const clientId = secrets.get('PLAID_CLIENT_ID');
  const clientSecret = secrets.get('PLAID_SECRET');
  if (!clientId || !clientSecret) throw new PlaidFailure('NOT_CONFIGURED');
  try {
    // The Deno function runtime only supports 'follow'/'manual' redirects; 'error' throws.
    // 'manual' keeps the no-redirect guarantee: a 3xx response is rejected below.
    const res = await fetch(PLAID_HOST + path, {
      method: 'POST', redirect:'manual', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, client_id: clientId, secret: clientSecret }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 3xx under redirect:'manual' is a redirect we refuse; 4xx/5xx carry Plaid's error_code.
    if (res.status >= 300 && res.status < 400) throw new PlaidFailure('PLAID_UNAVAILABLE');
    const data = await res.json();
    if (!res.ok) throw new PlaidFailure(typeof data.error_code === 'string' ? data.error_code : 'PLAID_UNAVAILABLE');
    return data;
  } catch (error) {
    if (error instanceof PlaidFailure) throw error;
    const wrapped = new PlaidFailure();
    (wrapped as any).detail = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;
    throw wrapped;
  }
}
export function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}
export async function allRecords(entity, query, options = {}) {
  const rows = []; const seen = new Set(); let cursor;
  do {
    const page = await entity.filter(query, { ...options, limit: 100, ...(cursor ? { cursor } : {}) });
    if (!Array.isArray(page.items)) throw new Error('Invalid entity response');
    rows.push(...page.items);
    if (!page.has_more) return rows;
    if (!page.next_cursor || seen.has(page.next_cursor)) throw new Error('Invalid entity cursor');
    cursor = page.next_cursor; seen.add(cursor);
  } while (cursor);
  return rows;
}
export function safeError(error) {
  const codes = ['ITEM_LOGIN_REQUIRED','INVALID_ACCESS_TOKEN','ITEM_NOT_FOUND','PRODUCT_NOT_READY','TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION','NOT_CONFIGURED'];
  return error instanceof PlaidFailure && codes.includes(error.code) ? error.code : 'SYNC_FAILED';
}