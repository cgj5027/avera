import { allRecords, plaidRequest, chunk } from './plaid.ts';
export function mapAccounts(accounts, item, owner) {
  if (!Array.isArray(accounts)) throw new Error('Invalid accounts');
  return accounts.map(acc => {
    if (acc.balances?.iso_currency_code && acc.balances.iso_currency_code !== 'USD') throw new Error('Unsupported currency');
    if (!acc.account_id || !acc.balances || !Number.isFinite(acc.balances.current) && !Number.isFinite(acc.balances.available)) throw new Error('Invalid balance');
    const credit = acc.type === 'credit';
    const type = acc.type === 'depository' ? (['checking','savings'].includes(acc.subtype) ? acc.subtype : 'cash') : credit ? 'credit_card' : ['investment','brokerage'].includes(acc.type) ? 'investment' : 'other';
    const balance = credit ? -acc.balances.current : acc.balances.available ?? acc.balances.current;
    if (!Number.isFinite(balance)) throw new Error('Unknown balance');
    return { name: acc.name || 'Linked account', type, balance, institution: item.institution_name,
      source:'Plaid Sandbox', notes:'Imported from Plaid Sandbox', plaid_item_id:item.item_id,
      plaid_account_id:acc.account_id, ...(Number.isFinite(acc.balances.available)?{balance_available:acc.balances.available}:{}),
      ...(Number.isFinite(acc.balances.limit)?{balance_limit:acc.balances.limit}:{}), balance_as_of:new Date().toISOString(),
      import_key:`${owner}:${item.item_id}:${acc.account_id}`, ...(item.demo_profile ? {demo_profile:item.demo_profile} : {}),
    };
  });
}
export async function storeConnection(base44, user, exchanged, metadata) {
  if (!exchanged.item_id || typeof exchanged.access_token !== 'string' || !exchanged.access_token.startsWith('access-sandbox-')) throw new Error('Invalid Sandbox exchange');
  const vault = base44.asServiceRole.entities.PlaidCredential;
  await vault.upsert([{ owner_id:user.id, item_id:exchanged.item_id, access_token:exchanged.access_token, sync_cursor:'',
    credential_key:`${user.id}:${exchanged.item_id}`, ...(metadata.demo_profile ? {demo_profile:metadata.demo_profile}: {}) }], {key:'credential_key'});
  const item = { ...metadata, item_id:exchanged.item_id, products:['transactions'], sync_cursor:'', status:'error', last_synced_at:'', last_sync_error:'' };
  await base44.entities.PlaidItem.upsert([item], {key:'item_id'});
  const res = await plaidRequest('/accounts/get', {access_token:exchanged.access_token});
  const rows = mapAccounts(res.accounts, item, user.id);
  await persistImported(base44.entities.Account,rows,user.id,item.item_id,'plaid_account_id',true);
  const saved=await allRecords(base44.entities.PlaidItem,{created_by_id:user.id,item_id:item.item_id});
  if(saved.length!==1) throw new Error('Connection metadata missing');
  await base44.entities.PlaidItem.update(saved[0].id,{status:'active'});
  return {item_id:item.item_id,institution_name:item.institution_name,accounts_imported:rows.length};
}
export async function credentialFor(base44, user, item) {
  if (item.created_by_id !== user.id) throw new Error('Item ownership failed');
  const rows = await allRecords(base44.asServiceRole.entities.PlaidCredential,{owner_id:user.id,item_id:item.item_id});
  if (rows.length !== 1 || !rows[0].access_token?.startsWith('access-sandbox-')) throw new Error('Reconnect this Sandbox Item');
  return rows[0];
}
export async function persistImported(entity, rows, owner, itemId, idField, prune = false) {
  const existing=await allRecords(entity,{created_by_id:owner,plaid_item_id:itemId,source:'Plaid Sandbox'});
  const byExternal=new Map();
  for(const record of existing) {
    const group=byExternal.get(record[idField]) || [];group.push(record);byExternal.set(record[idField],group);
  }
  const fresh=[];
  for(const row of rows) {
    const matches=byExternal.get(row[idField]);
    if(matches?.length) {
      await entity.update(matches[0].id,row);
      for(const duplicate of matches.slice(1)) await entity.delete(duplicate.id);
    } else fresh.push(row);
  }
  for(const batch of chunk(fresh,200)) await entity.upsert(batch,{key:'import_key'});
  if (prune) {
    const current = new Set(rows.map(r => r[idField]));
    for (const old of existing) if (!current.has(old[idField])) await entity.delete(old.id);
  }
}
