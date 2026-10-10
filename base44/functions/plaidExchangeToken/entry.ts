import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { plaidRequest, chunk } from '../../shared/plaid.ts';

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
    const publicToken = typeof body.public_token === 'string' ? body.public_token : '';
    const institutionId = typeof body.institution_id === 'string' ? body.institution_id : '';
    const institutionName = typeof body.institution_name === 'string' && body.institution_name ? body.institution_name : 'Test bank';
    if (!publicToken) return Response.json({ error: 'public_token is required' }, { status: 400 });

    const exchanged = await plaidRequest('/item/public_token/exchange', { public_token: publicToken });
    const service = base44.asServiceRole;

    await service.entities.PlaidItem.upsert([{
      item_id: exchanged.item_id,
      institution_id: institutionId,
      institution_name: institutionName,
      access_token: exchanged.access_token,
      products: ['transactions'],
      sync_cursor: '',
      status: 'active',
      last_synced_at: '',
      last_sync_error: '',
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
        institution: institutionName,
        source: 'Plaid Sandbox',
        notes: 'Imported from Plaid Sandbox',
        plaid_item_id: exchanged.item_id,
        plaid_account_id: acc.account_id,
        balance_available: balances.available || 0,
        balance_limit: isCredit ? (balances.limit || 0) : 0,
        created_by_id: user.id
      };
    });
    for (const batch of chunk(accountRows, 200)) {
      await service.entities.Account.upsert(batch, { key: 'plaid_account_id' });
    }

    return Response.json({ item_id: exchanged.item_id, institution_name: institutionName, accounts_imported: accountRows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}