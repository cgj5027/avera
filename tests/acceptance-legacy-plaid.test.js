// Acceptance regression: SDK fixtures only; no Plaid requests or real records.
import { expect, it, vi } from 'vitest';
import { credentialFor } from '../base44/shared/plaidRecords.ts';
it('legacy migration returns a persisted vault ID needed by first sync/disconnect',async()=>{
 const rows=[];
 const item={id:'legacy-item',item_id:'sandbox-item',created_by_id:'fixture-user',sync_cursor:'old-cursor',demo_profile:'early_career'};
 const vault={filter:vi.fn(async()=>({items:rows,has_more:false})),upsert:vi.fn(async(values)=>{rows.push(...values.map(value=>({...value,id:'persisted-vault-id'})));})};
 const client={asServiceRole:{entities:{PlaidCredential:vault,PlaidItem:{filter:vi.fn(async()=>({items:[{...item,access_token:'access-sandbox-fixture-only'}],has_more:false})),update:vi.fn(async()=>{})}}}};
 const credential=await credentialFor(client,{id:'fixture-user'},item);
 expect(rows).toHaveLength(1);
 expect(credential.sync_cursor).toBe('');
 expect(client.asServiceRole.entities.PlaidItem.update).toHaveBeenCalledWith(item.id,{access_token:''});
 // plaidSync.update(credential.id, ...) and plaidDisconnect.delete(credential.id)
 // need the saved row ID. An unsaved payload cannot fulfill that contract.
 expect(credential.id).toBe('persisted-vault-id');
});

it('legacy adoption rejects another owner before storing or clearing a token',async()=>{
 const item={id:'legacy',item_id:'sandbox-item',created_by_id:'a'};
 const vault={filter:vi.fn(async()=>({items:[],has_more:false})),upsert:vi.fn()};
 const legacy={filter:vi.fn(async()=>({items:[{...item,created_by_id:'b',access_token:'access-sandbox-fixture-only'}],has_more:false})),update:vi.fn()};
 await expect(credentialFor({asServiceRole:{entities:{PlaidCredential:vault,PlaidItem:legacy}}},{id:'a'},item)).rejects.toThrow('ownership');
 expect(vault.upsert).not.toHaveBeenCalled();expect(legacy.update).not.toHaveBeenCalled();
});
it('does not retire the legacy token if the persisted vault row cannot be verified',async()=>{
 const item={id:'legacy',item_id:'sandbox-item',created_by_id:'a'};
 const vault={filter:vi.fn(async()=>({items:[],has_more:false})),upsert:vi.fn()};
 const legacy={filter:vi.fn(async()=>({items:[{...item,access_token:'access-sandbox-fixture-only'}],has_more:false})),update:vi.fn()};
 await expect(credentialFor({asServiceRole:{entities:{PlaidCredential:vault,PlaidItem:legacy}}},{id:'a'},item)).rejects.toThrow('incomplete');
 expect(legacy.update).not.toHaveBeenCalled();
});
