/**
 * Plaid Sandbox client — frontend seam. Every credential-bearing call runs in
 * a Base44 backend function (base44/functions/plaid*), so the browser never
 * sees a credential. This module only orchestrates the Link widget and
 * invokes those functions.
 */
import { base44 } from '@/api/base44Client';

export const PLAID_LABEL = 'Plaid Sandbox — Test account';
export const PLAID_SOURCE_LABEL = 'Plaid Sandbox';

/** @typedef {{create: (options: {token: string, onSuccess: (token: string, metadata: any) => void, onExit: (error: any) => void}) => {open: () => void, destroy: () => void}}} PlaidSDK */
let scriptPromise = null;
function loadPlaidLink() {
  const plaidWindow = /** @type {Window & {Plaid?: PlaidSDK}} */ (window);
  if (plaidWindow.Plaid && plaidWindow.Plaid.create) return Promise.resolve(plaidWindow.Plaid);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => {
      if (plaidWindow.Plaid?.create) resolve(plaidWindow.Plaid);
      else {scriptPromise = null; reject(new Error('Plaid Link did not initialize. Please retry.'));}
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the Plaid Link widget. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Opens the Plaid Link widget; resolves after the token exchange completes. */
export function connectBank({ itemId = undefined } = {}) {
  return base44.functions.invoke('plaidCreateLinkToken', itemId ? {item_id:itemId} : {}).then(({ data }) =>
    (typeof data?.link_token === 'string' && data.link_token.startsWith('link-sandbox-') ? loadPlaidLink() : Promise.reject(new Error('Sandbox Link token unavailable'))).then(
      (Plaid) =>
        new Promise((resolve, reject) => {
          let settled = false;
          const handler = Plaid.create({
            token: data.link_token,
            onSuccess: async (publicToken, metadata) => {
              if (settled) return;
              settled=true;
              try {
                if (itemId) { settled=true; handler.destroy(); resolve({reconnected:true}); return; }
                const res = await base44.functions.invoke('plaidExchangeToken', {
                  public_token: publicToken,
                  institution_id: (metadata.institution && metadata.institution.institution_id) || '',
                  institution_name: (metadata.institution && metadata.institution.name) || 'Test bank'
                });
                if (!res.data?.item_id || !Number.isInteger(res.data.accounts_imported)) throw new Error('Sandbox exchange did not complete');
                settled = true;
                handler.destroy();
                resolve(res.data);
              } catch (e) {
                settled = true;
                handler.destroy();
                reject(e);
              }
            },
            onExit: (err) => {
              if (settled) return;
              settled = true;
              handler.destroy();
              reject(new Error((err && err.error_message) || 'Connection cancelled'));
            }
          });
          handler.open();
        })
    )
  );
}

/** Syncs all connected test banks: refreshes balances and imports transactions. */
export function syncConnections(itemId = undefined) {
  return base44.functions.invoke('plaidSync', itemId ? {item_id:itemId} : {}).then(({ data }) => data);
}