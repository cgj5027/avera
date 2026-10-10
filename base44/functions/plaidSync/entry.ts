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
    // User-scoped entity access: records are owned by the end user, so reads
    // and writes must use the user's token — service-role writes get stamped
    // with the service identity and would be invisible to the user.
    const itemsPage = await base44.entities.PlaidItem.filter({ created_by_id: user.id }, { limit: 50 });
    const items = itemsPage.items || [];

    const results = [];
    for (const item of items) {
      const result = { item_id: item.item_id, institution: item.institution_name, status: 'synced', transactions: 0, accounts: 0, error: '' };
      try {
        // Refresh account balances
        const accountsRes = await plaidRequest('/accounts/get', { access_token: item.access_token });
        const accountRows = accountsRes.accounts.map((acc) => {
          const balances = acc.balances || {};
          const isCredit = (acc.type || '') === 'credit';
          return {
            name: acc.name || 'Linked account',
            type: mapAccountType(acc.type || '', acc.subtype || ''),
            balance: isCredit ? (balances.current || 0) : (balances.available ?? balances.current ?? 0),
            institution: item.institution_name,
            source: 'Plaid Sandbox',
            notes: 'Imported from Plaid Sandbox',
            plaid_item_id: item.item_id,
            plaid_account_id: acc.account_id,
            balance_available: balances.available || 0,
            balance_limit: isCredit ? (balances.limit || 0) : 0,
            created_by_id: user.id
          };
        });
        for (const batch of chunk(accountRows, 200)) {
          await base44.entities.Account.upsert(batch, { key: 'plaid_account_id' });
        }
        result.accounts = accountRows.length;

        // Pull transactions from the stored cursor
        let cursor = item.sync_cursor || '';
        const added = [];
        for (let page = 0; page < 10; page++) {
          const sync = await plaidRequest('/transactions/sync', { access_token: item.access_token, cursor, count: 100 });
          for (const t of sync.added || []) {
            if (!t.pending && t.transaction_id) added.push(t);
          }
          cursor = sync.next_cursor || cursor;
          if (!sync.has_more) break;
        }
        // Categories the user edited between syncs win over the Plaid mapping.
        const existingPage = await base44.entities.Transaction.filter(
          { created_by_id: user.id, plaid_item_id: item.item_id },
          { limit: 1000, fields: ['plaid_transaction_id', 'category'] }
        );
        const existingCategories = new Map(
          (existingPage.items || []).map((r) => [r.plaid_transaction_id, r.category ?? ''])
        );
        const rows = added.map((t) => {
          const isIncome = (t.amount || 0) <= 0;
          const plaidCategory = isIncome ? 'Income' : (Array.isArray(t.category) ? (t.category[0] || '') : '');
          return {
          description: t.name || t.merchant_name || 'Plaid transaction',
          amount: Math.abs(t.amount || 0),
          type: isIncome ? 'income' : 'expense',
          category: existingCategories.has(t.transaction_id) ? (existingCategories.get(t.transaction_id) || '') : plaidCategory,
          date: (t.date || '').slice(0, 10),
          source: 'Plaid Sandbox',
          notes: '',
          plaid_item_id: item.item_id,
          plaid_account_id: t.account_id || '',
          plaid_transaction_id: t.transaction_id,
          created_by_id: user.id
          };
        }).filter((r) => r.date);
        for (const batch of chunk(rows, 200)) {
          await base44.entities.Transaction.upsert(batch, { key: 'plaid_transaction_id' });
        }
        result.transactions = rows.length;

        await base44.entities.PlaidItem.update(item.id, {
          sync_cursor: cursor,
          last_synced_at: new Date().toISOString(),
          status: 'active',
          last_sync_error: ''
        });
      } catch (err) {
        result.status = 'error';
        result.error = err.message;
        await base44.entities.PlaidItem.update(item.id, { status: 'error', last_sync_error: err.message });
      }
      results.push(result);
    }
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}