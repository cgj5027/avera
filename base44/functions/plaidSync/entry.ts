import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { plaidRequest, allRecords, safeError } from '../../shared/plaid.ts';
import { mapAccounts, credentialFor, persistImported } from '../../shared/plaidRecords.ts';
export async function collectChanges(token, startCursor) {
  for (let attempt=0; attempt<3; attempt++) {
    let cursor=startCursor; const changes=new Map(); const removed=new Set(); const seen=new Set();
    try {
      for (let page=0; page<2000; page++) {
        const sync=await plaidRequest('/transactions/sync',{access_token:token,cursor,count:100});
        if (!Array.isArray(sync.added) || !Array.isArray(sync.modified) || !Array.isArray(sync.removed) || typeof sync.next_cursor !== 'string' || typeof sync.has_more !== 'boolean') throw new Error('Invalid sync');
        for (const t of [...sync.added,...sync.modified]) {
          if (!t.transaction_id || !Number.isFinite(t.amount) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !Number.isFinite(Date.parse(t.date+'T00:00:00Z')) || new Date(t.date+'T00:00:00Z').toISOString().slice(0,10)!==t.date || !t.account_id || t.iso_currency_code && t.iso_currency_code !== 'USD') throw new Error('Invalid transaction');
          if (t.pending) {removed.add(t.transaction_id); changes.delete(t.transaction_id);}
          else {changes.set(t.transaction_id,t);removed.delete(t.transaction_id);}
          if (t.pending_transaction_id) removed.add(t.pending_transaction_id);
        }
        for (const t of sync.removed) {if (!t.transaction_id) throw new Error('Invalid removal'); removed.add(t.transaction_id);changes.delete(t.transaction_id);}
        cursor=sync.next_cursor;
        if (!sync.has_more) return {changes:[...changes.values()],removed,cursor};
        if (!cursor || seen.has(cursor)) throw new Error('Invalid sync pagination');
        seen.add(cursor);
      }
      throw new Error('Sync pagination limit exceeded; cursor retained');
    } catch (error) {
      if (error.code !== 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' || attempt===2) throw error;
    }
  }
}
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me();
    if (!user?.id) return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json().catch(()=>({}));
    const items=await allRecords(base44.entities.PlaidItem,{created_by_id:user.id,...(typeof body.item_id==='string'?{item_id:body.item_id}:{})});
    const results=[];
    for (const item of items.filter(i=>i.status!=='disconnected')) {
      const result={item_id:item.item_id,institution:item.institution_name,status:'synced',transactions:0,accounts:0,error:''};
      try {
        const credential=await credentialFor(base44,user,item);
        if ((item.demo_profile || '') !== (credential.demo_profile || '')) throw new Error('Invalid dataset tag');
        const res=await plaidRequest('/accounts/get',{access_token:credential.access_token});
        const accounts=mapAccounts(res.accounts,item,user.id);
        const delta=await collectChanges(credential.access_token,credential.sync_cursor || '');
        const existing=await allRecords(base44.entities.Transaction,{created_by_id:user.id,plaid_item_id:item.item_id});
        const previous=new Map(existing.map(t=>[t.plaid_transaction_id,t]));
        const rows=delta.changes.map(t=>({
          description:t.name || t.merchant_name || 'Plaid transaction', amount:Math.abs(t.amount), type:t.amount<0?'income':'expense',
          category:previous.has(t.transaction_id)?previous.get(t.transaction_id).category ?? '':t.amount<0?'Income':t.personal_finance_category?.primary || t.category?.[0] || '',
          exclude_from_cashflow:['TRANSFER_IN','TRANSFER_OUT'].includes(t.personal_finance_category?.primary),
          date:t.date, source:'Plaid Sandbox', notes:previous.get(t.transaction_id)?.notes || '',
          plaid_item_id:item.item_id,plaid_account_id:t.account_id,plaid_transaction_id:t.transaction_id,
          import_key:`${user.id}:${item.item_id}:${t.transaction_id}`, ...(item.demo_profile?{demo_profile:item.demo_profile}:{}),
        }));
        // Stable keys make retrying partial writes safe. Cursor commits only after every write/removal.
        await persistImported(base44.entities.Account,accounts,user.id,item.item_id,'plaid_account_id',true);
        await persistImported(base44.entities.Transaction,rows,user.id,item.item_id,'plaid_transaction_id');
        for (const row of existing) if (delta.removed.has(row.plaid_transaction_id) && row.source==='Plaid Sandbox') await base44.entities.Transaction.delete(row.id);
        await base44.asServiceRole.entities.PlaidCredential.update(credential.id,{sync_cursor:delta.cursor});
        await base44.entities.PlaidItem.update(item.id,{last_synced_at:new Date().toISOString(),status:'active',last_sync_error:''});
        result.accounts=accounts.length;result.transactions=rows.length;
      } catch(error) {
        const code=safeError(error);
        console.error('Sandbox sync failed', { code }); result.status='error';result.error=code;
        await base44.entities.PlaidItem.update(item.id,{status:['ITEM_LOGIN_REQUIRED','INVALID_ACCESS_TOKEN','ITEM_NOT_FOUND'].includes(code)?'needs_reauth':'error',last_sync_error:code});
      }
      results.push(result);
    }
    return Response.json({results});
  } catch {return Response.json({error:'Sandbox sync could not complete. Please retry.'},{status:502});}
}