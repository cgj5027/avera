/**
 * Plaid Sandbox client — frontend seam. Every credential-bearing call runs in
 * a Base44 backend function (base44/functions/plaid*), so the browser never
 * sees a credential. This module only orchestrates the Link widget and
 * invokes those functions.
 */
import { base44 } from '@/api/base44Client';

export const PLAID_LABEL = 'Plaid Sandbox — Test account';
export const PLAID_SOURCE_LABEL = 'Plaid Sandbox';

let scriptPromise = null;
function loadPlaidLink() {
  if (window.Plaid && window.Plaid.create) return Promise.resolve(window.Plaid);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => resolve(window.Plaid);
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the Plaid Link widget. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Opens the Plaid Link widget; resolves after the token exchange completes. */
export function connectBank() {
  return base44.functions.invoke('plaidCreateLinkToken').then(({ data }) =>
    loadPlaidLink().then(
      (Plaid) =>
        new Promise((resolve, reject) => {
          let settled = false;
          const handler = Plaid.create({
            token: data.link_token,
            onSuccess: async (publicToken, metadata) => {
              try {
                const res = await base44.functions.invoke('plaidExchangeToken', {
                  public_token: publicToken,
                  institution_id: (metadata.institution && metadata.institution.institution_id) || '',
                  institution_name: (metadata.institution && metadata.institution.name) || 'Test bank'
                });
                settled = true;
                resolve(res.data);
              } catch (e) {
                settled = true;
                reject(e);
              }
            },
            onExit: (err) => {
              if (settled) return;
              settled = true;
              reject(new Error((err && err.error_message) || 'Connection cancelled'));
            }
          });
          handler.open();
        })
    )
  );
}

/** Syncs all connected test banks: refreshes balances and imports transactions. */
export function syncConnections() {
  return base44.functions.invoke('plaidSync').then(({ data }) => data);
}