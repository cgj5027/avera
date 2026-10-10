// Plaid Sandbox API helper — credentials live ONLY in Base44 secure secrets.
import { secrets } from 'base44:runtime';

export const PLAID_HOST = 'https://sandbox.plaid.com';

export async function plaidRequest(path, body, timeoutMs = 20000) {
  const clientId = secrets.get('PLAID_CLIENT_ID');
  const clientSecret = secrets.get('PLAID_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Plaid credentials are not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in app secrets.');
  }
  const res = await fetch(PLAID_HOST + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret: clientSecret, ...body }),
    signal: AbortSignal.timeout(timeoutMs)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error_message || data.error_type || 'Plaid request failed';
    throw new Error(message);
  }
  return data;
}

export function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}