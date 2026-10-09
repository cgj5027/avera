/**
 * Plaid Sandbox client — external-API layer (Stage 0: stub).
 *
 * Architecture decision: Plaid credentials (client ID / secret) live ONLY in
 * Base44 secure environment secrets, and every Plaid call runs inside a
 * Base44 backend function (base44/functions/...). The browser never sees a
 * credential. Stage 0 ships no Plaid calls — this module documents the seam
 * that Stage 1+ will implement.
 */
export const PLAID_ENVIRONMENT = 'sandbox';
export const PLAID_LABEL = 'Plaid Sandbox — Test account';

export function createLinkToken() {
  throw new Error(
    'createLinkToken is a Stage 0 stub — implement as a Base44 backend function reading PLAID_CLIENT_ID / PLAID_SECRET from secure environment secrets.'
  );
}

export function exchangePublicToken() {
  throw new Error(
    'exchangePublicToken is a Stage 0 stub — implement as a Base44 backend function; never call Plaid directly from the browser.'
  );
}