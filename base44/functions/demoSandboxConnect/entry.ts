// Demo Mode: connects the selected profile's Plaid Sandbox custom user.
// Uses the real Sandbox flow (public token → exchange → accounts), stores the
// Item demo-tagged so reset can remove only this demo workspace's data.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { plaidRequest, chunk } from '../../shared/plaid.ts';
import { demoSandboxConfig } from '../../shared/demoPlaidConfigs.ts';

function mapAccountType(type, subtype) {
  const s = subtype || '';
  if (type === 'depository') {
    if (s === 'checking') return 'checking';
    if (s === 'savings') return 'savings';
    return 'cash';
  }
  if (type === 'credit') return 'credit_card';
  if (type === 'investment' || type === 'brokerage') return 'investment';
  return 'other';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const profileKey = typeof body.profile_key === 'string' ? body.profile_key : '';
    let config;
    try {
      config = demoSandboxConfig(profileKey);
    } catch {
      return Response.json({ error: 'Unknown demo profile' }, { status: 400 });
    }

    // Real Plaid Sandbox connection behavior: public token for the custom
    // user, then a standard token exchange.
    const token = await plaidRequest('/sandbox/public_token/create', {
      institution_id: config.institution_id,
      initial_products: config.products,
      options: {
        override_username: 'user_custom',
        override_password: JSON.stringify({ override_accounts: config.accounts }),
      },
    });
    const exchanged = await plaidRequest('/item/public_token/exchange', { public_token: token.public_token });

    // User-scoped write so the Item is visible only to this end user, and
    // demo-tagged so demo reset can find and remove it safely.
    await base44.entities.PlaidItem.upsert([{
      item_id: exchanged.item_id,
      institution_id: config.institution_id,
      institution_name: config.institution_name,
      access_token: exchanged.access_token,
      products: config.products,
      sync_cursor: '',
      status: 'active',
      last_synced_at: '',
      last_sync_error: '',
      demo_profile: profileKey,
      created_by_id: user.id
    }], { key: 'item_id' });

    const accountsRes = await plaidRequest('/accounts/get', { access_token: exchanged.access_token });
    const accountRows = accountsRes.accounts.map((acc) => {
      const balances = acc.balances || {};
      const isCredit = (acc.type || '') === 'credit';
      return {
        name: acc.name || 'Linked account',
        type: mapAccountType(acc.type || '', acc.subtype || ''),
        balance: isCredit ? (balances.current || 0) : (balances.available ?? balances.current ?? 0),
        institution: config.institution_name,
        source: 'Plaid Sandbox',
        notes: 'Imported from Plaid Sandbox (Demo Mode)',
        plaid_item_id: exchanged.item_id,
        plaid_account_id: acc.account_id,
        balance_available: balances.available || 0,
        balance_limit: isCredit ? (balances.limit || 0) : 0,
        created_by_id: user.id
      };
    });
    for (const batch of chunk(accountRows, 200)) {
      await base44.entities.Account.upsert(batch, { key: 'plaid_account_id' });
    }

    return Response.json({
      item_id: exchanged.item_id,
      institution_name: config.institution_name,
      accounts_imported: accountRows.length,
      profile_key: profileKey
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}