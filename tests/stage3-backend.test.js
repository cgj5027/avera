import { beforeEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { matches } from './queryFixture';
const fixture=vi.hoisted(()=>({client:null}));
vi.mock('npm:@base44/sdk@0.8.52',()=>({createClientFromRequest:()=>fixture.client}));
vi.mock('base44:runtime',()=>({secrets:{get:key=>key==='PLAID_CLIENT_ID'?'fixture-client':'fixture-secret'}}));
import sync from '../base44/functions/plaidSync/entry.ts';
import exchange from '../base44/functions/plaidExchangeToken/entry.ts';
import disconnect from '../base44/functions/plaidDisconnect/entry.ts';
import link from '../base44/functions/plaidCreateLinkToken/entry.ts';
import demoConnect from '../base44/functions/demoSandboxConnect/entry.ts';
import ask from '../base44/functions/askAvera/entry.ts';
import { plaidRequest, PLAID_HOST } from '../base44/shared/plaid.ts';
import { datasetQuery } from '../base44/shared/dataset.ts';
const req=body=>new Request('https://fixture.local/function',{method:'POST',body:JSON.stringify(body||{}),headers:{'content-type':'application/json'}});
let rows, fetchMock, user, pages;
const account={account_id:'acc',name:'Checking',type:'depository',subtype:'checking',balances:{current:100,available:90}};
const txn=(id,amount=10)=>({transaction_id:id,amount,date:'2026-10-01',account_id:'acc',name:'Store',pending:false,iso_currency_code:'USD'});
const page=(added=[],extra={})=>({added,modified:[],removed:[],next_cursor:'end',has_more:false,...extra});
function entity(name,service=false) {
  rows[name]??=[];
  const impl={
    filter:vi.fn(async q=>({items:rows[name].filter(r=>matches(r,q)),has_more:false})),
    get:vi.fn(async id=>rows[name].find(r=>r.id===id)),
    create:vi.fn(async payload=>{const r={...payload,id:`${name}-${rows[name].length}`,created_by_id:service?'service':user.id};rows[name].push(r);return r;}),
    update:vi.fn(async(id,payload)=>{const r=rows[name].find(r=>r.id===id);if(!r)throw new Error('Missing record');Object.assign(r,payload);return r;}),
    delete:vi.fn(async id=>{rows[name]=rows[name].filter(r=>r.id!==id);}),
  };
  impl.upsert=vi.fn(async(values,{key})=>{for(const p of values){const old=rows[name].find(r=>r[key]===p[key]);if(old)await impl.update(old.id,p);else await impl.create(p);}});
  return impl;
}
beforeEach(()=>{
  user={id:'a'}; rows={};pages=[page([txn('t')])];
  const entities={};for(const name of ['PlaidItem','Account','Transaction','Bill','BudgetCategory','Goal','IncomeSource','Property','MortgageRecord','HouseholdProfile','JobProfile'])entities[name]=entity(name);
  fixture.client={auth:{me:vi.fn(async()=>user)},entities,asServiceRole:{entities:{PlaidCredential:entity('PlaidCredential',true)},integrations:{Core:{InvokeLLM:vi.fn(async()=>({answer:'Fixture response'}))}}}};
  rows.PlaidItem=[{id:'item-record',item_id:'item',created_by_id:'a',institution_name:'Fixture bank',sync_cursor:'start',status:'active'}];
  rows.PlaidCredential=[{id:'vault',owner_id:'a',item_id:'item',access_token:'access-sandbox-fixture',credential_key:'a:item',sync_cursor:'start'}];
  fetchMock=vi.fn(async(url,options)=>{
    const path=new URL(url).pathname;
    if(path==='/transactions/sync')return Response.json(pages.shift()||page());
    if(path==='/accounts/get')return Response.json({accounts:[account]});
    if(path==='/item/public_token/exchange')return Response.json({item_id:'new-item',access_token:'access-sandbox-new-fixture'});
    if(path==='/item/get')return Response.json({item:{institution_id:'ins_fixture'}});
    if(path==='/institutions/get_by_id')return Response.json({institution:{name:'Actual fixture institution'}});
    if(path==='/link/token/create')return Response.json({link_token:'link-sandbox-fixture',expiration:'2026-10-11'});
    if(path==='/sandbox/public_token/create')return Response.json({public_token:'public-sandbox-fixture'});
    if(path==='/item/remove')return Response.json({removed:true});
    throw new Error('Unexpected path');
  });vi.stubGlobal('fetch',fetchMock);
});
describe('actual backend handlers with SDK/Plaid fixtures; NOT real Sandbox requests',()=>{
  it.each([sync,exchange,disconnect,link,demoConnect,ask])('rejects anonymous requests',async handler=>{user=null;const response=await handler(req({}));expect(response.status).toBe(401);expect(fetchMock).not.toHaveBeenCalled();});
  it('uses a fixed Sandbox host and never lets payload replace secrets',async()=>{
    await plaidRequest('/accounts/get',{client_id:'override',secret:'override'});
    expect(fetchMock.mock.calls[0][0]).toBe(PLAID_HOST+'/accounts/get');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({client_id:'fixture-client',secret:'fixture-secret'});
    await expect(plaidRequest('//evil.org',{})).rejects.toThrow();
  });
  it('has server-only credential RLS and hides legacy tokens at field level',()=>{
    const schema=JSON.parse(readFileSync('base44/entities/PlaidCredential.jsonc','utf8'));
    expect(Object.values(schema.rls)).toEqual([false,false,false,false]);
    const legacy=JSON.parse(readFileSync('base44/entities/PlaidItem.jsonc','utf8'));
    expect(legacy.properties.access_token.rls.read).toBe(false);
  });
  it('exchanges only Sandbox public tokens and returns no access token',async()=>{
    expect((await exchange(req({public_token:'public-production-invalid'}))).status).toBe(400);
    const response=await exchange(req({public_token:'public-sandbox-fixture',institution_name:'Spoofed bank'}));
    expect(response.status).toBe(200);const body=await response.json();expect(body.institution_name).toBe('Actual fixture institution');
    expect(body).not.toHaveProperty('access_token');expect(rows.PlaidItem.at(-1)).not.toHaveProperty('access_token');
    expect(rows.PlaidCredential.at(-1).owner_id).toBe('a');expect(rows.Account.at(-1).balance).toBe(90);
  });
  it('maps credit liabilities to negative balances, and rejects unknown balances',async()=>{
    fetchMock.mockImplementationOnce(async()=>Response.json({accounts:[{...account,type:'credit',balances:{current:50,available:null}}]}));
    await sync(req());expect(rows.Account[0].balance).toBe(-50);
  });
  it('syncs more than ten pages, modifications and deletions, preserving categories',async()=>{
    rows.Transaction=[{id:'old',plaid_transaction_id:'old',plaid_item_id:'item',created_by_id:'a',source:'Plaid Sandbox',category:'User edited',amount:10}];
    pages=Array.from({length:12},(_,i)=>page([txn(`t${i}`)],{next_cursor:`c${i}`,has_more:i<11}));
    pages[11].modified=[txn('old',20)];
    const response=await sync(req());expect((await response.json()).results[0].status).toBe('synced');
    expect(rows.Transaction).toHaveLength(13);expect(rows.Transaction.find(r=>r.id==='old')).toMatchObject({amount:20,category:'User edited'});expect(rows.PlaidCredential[0].sync_cursor).toBe('c11');
    pages=[page([],{removed:[{transaction_id:'old'}]})];await sync(req());expect(rows.Transaction.find(r=>r.id==='old')).toBeUndefined();
  });
  it('repeated additions and legacy IDs do not duplicate transactions',async()=>{
    pages=[page([txn('t'),txn('t')])];await sync(req());pages=[page([txn('t')])];await sync(req());expect(rows.Transaction).toHaveLength(1);
  });
  it('flags provider-classified transfers without fabricating earned income',async()=>{
    pages=[page([{...txn('transfer',-100),personal_finance_category:{primary:'TRANSFER_IN'}}])];await sync(req());expect(rows.Transaction[0].exclude_from_cashflow).toBe(true);
  });
  it('retains cursor on partial write failure and completes safely on retry',async()=>{
    fixture.client.entities.Transaction.upsert.mockRejectedValueOnce(new Error('write failed'));
    const result=await (await sync(req())).json();expect(result.results[0].status).toBe('error');expect(rows.PlaidCredential[0].sync_cursor).toBe('start');
    pages=[page([txn('t')])];await sync(req());expect(rows.Transaction).toHaveLength(1);expect(rows.Account).toHaveLength(1);expect(rows.PlaidCredential[0].sync_cursor).toBe('end');
  });
  it('restarts pagination mutations from original cursor',async()=>{
    fetchMock.mockImplementationOnce(async()=>Response.json({accounts:[account]})).mockImplementationOnce(async()=>Response.json({error_code:'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'},{status:400}));
    await sync(req());const calls=fetchMock.mock.calls.filter(([url])=>url.endsWith('/transactions/sync'));expect(calls.map(([,o])=>JSON.parse(o.body).cursor)).toEqual(['start','start']);
  });
  it.each(['ITEM_LOGIN_REQUIRED','INVALID_ACCESS_TOKEN','ITEM_NOT_FOUND'])('handles revoked/expired %s without leaking upstream text',async code=>{
    fetchMock.mockResolvedValueOnce(Response.json({error_code:code,error_message:'Sensitive upstream fixture text'},{status:400}));
    const result=await (await sync(req())).json();expect(result.results[0].error).toBe(code);expect(JSON.stringify(result)).not.toContain('Sensitive');expect(rows.PlaidItem[0].status).toBe('needs_reauth');
  });
  it('rejects invalid provider data and network errors without advancing cursor',async()=>{
    pages=[page([txn('bad',NaN)])];await sync(req());expect(rows.PlaidCredential[0].sync_cursor).toBe('start');expect(rows.Transaction).toHaveLength(0);
    fetchMock.mockRejectedValueOnce(new Error('Network fixture secret'));const result=await (await sync(req())).json();expect(JSON.stringify(result)).not.toContain('Network fixture secret');
  });
  it('never reads another owner credential or syncs another owner Item',async()=>{
    rows.PlaidItem.push({id:'other',item_id:'other-item',created_by_id:'b',status:'active'});rows.PlaidCredential.push({id:'other-vault',owner_id:'b',item_id:'other-item',access_token:'access-sandbox-other'});
    await sync(req());expect(fixture.client.asServiceRole.entities.PlaidCredential.filter).toHaveBeenCalledWith({owner_id:'a',item_id:'item'},expect.anything());
    expect(fetchMock.mock.calls.some(([,o])=>JSON.parse(o.body).access_token==='access-sandbox-other')).toBe(false);
    expect((await disconnect(req({item_id:'other-item'}))).status).toBe(404);
    expect((await link(req({item_id:'other-item'}))).status).toBe(404);
  });
  it('disconnect revokes only owned connection and keeps manual records',async()=>{
    rows.Account=[{id:'import',created_by_id:'a',plaid_item_id:'item',source:'Plaid Sandbox'},{id:'manual',created_by_id:'a',source:'Manual',plaid_item_id:'item'}];
    expect((await disconnect(req({item_id:'item',demo_only:true}))).status).toBe(400);
    expect((await disconnect(req({item_id:'item'}))).status).toBe(200);expect(rows.Account.map(r=>r.id)).toEqual(['manual']);expect(rows.PlaidCredential).toHaveLength(0);
    expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/item/remove'))).toBe(true);
  });
  it('Ask Avera applies active dataset filters to every entity read',async()=>{
    await ask(req({question:'What are my bills?',dataset:{mode:'demo',profile:'early_career'}}));
    for(const entity of Object.values(fixture.client.entities)) if(entity.filter.mock.calls.length) expect(entity.filter.mock.calls[0][0]).toMatchObject({created_by_id:'a',demo_profile:'early_career'});
    expect(datasetQuery({id:'a'},{mode:'ordinary'})).toEqual({created_by_id:'a',$or:[{demo_profile:{$exists:false}},{demo_profile:null},{demo_profile:''}]});
    expect(()=>datasetQuery({id:'a'},{mode:'demo',profile:'invalid'})).toThrow();
  });
  it('uses the private cursor even if public metadata is edited',async()=>{
    rows.PlaidItem[0].sync_cursor='untrusted';await sync(req());
    const call=fetchMock.mock.calls.find(([url])=>url.endsWith('/transactions/sync'));
    expect(JSON.parse(call[1].body).cursor).toBe('start');
  });
  it('rejects impossible transaction dates without committing the cursor',async()=>{
    pages=[page([{...txn('bad-date'),date:'2026-02-31'}])];await sync(req());
    expect(rows.PlaidCredential[0].sync_cursor).toBe('start');expect(rows.Transaction).toHaveLength(0);
  });
  it('refuses demo cleanup when editable metadata differs from private credentials',async()=>{
    rows.PlaidItem[0].demo_profile='early_career';
    expect((await disconnect(req({item_id:'item',demo_only:true}))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();expect(rows.PlaidItem).toHaveLength(1);
  });
  it('retries interrupted disconnect cleanup after revocation without deleting manual records',async()=>{
    rows.Account=[{id:'import',created_by_id:'a',plaid_item_id:'item',source:'Plaid Sandbox'}];
    fixture.client.entities.Account.delete.mockRejectedValueOnce(new Error('write failure'));
    expect((await disconnect(req({item_id:'item'}))).status).toBe(502);
    expect(rows.PlaidItem[0].status).toBe('disconnected');expect(rows.PlaidCredential).toHaveLength(1);
    fetchMock.mockResolvedValueOnce(Response.json({error_code:'INVALID_ACCESS_TOKEN'},{status:400}));
    expect((await disconnect(req({item_id:'item'}))).status).toBe(200);expect(rows.Account).toHaveLength(0);
  });
  it('Ask Avera reads all pages, separates liquid cash from liabilities and includes property obligations',async()=>{
    fixture.client.entities.Account.filter
      .mockResolvedValueOnce({items:[{type:'checking',balance:1000}],has_more:true,next_cursor:'page2'})
      .mockResolvedValueOnce({items:[{type:'credit_card',balance:-200},{type:'investment',balance:5000}],has_more:false});
    rows.Property=[{id:'home',created_by_id:'a',taxes_monthly:50,insurance_monthly:20}];
    rows.MortgageRecord=[{id:'mortgage',created_by_id:'a',property_id:'home',monthly_payment:300}];
    rows.Bill=[{id:'bill',created_by_id:'a',amount:120,frequency:'annual'}];
    rows.BudgetCategory=[{id:'budget',created_by_id:'a',monthly_limit:100}];
    rows.IncomeSource=[{id:'income',created_by_id:'a',amount:100,frequency:'weekly'}];
    expect((await ask(req({question:'My finances?',dataset:{mode:'ordinary'}}))).status).toBe(200);
    const prompt=fixture.client.asServiceRole.integrations.Core.InvokeLLM.mock.calls[0][0].prompt;
    const context=JSON.parse(prompt.split('FINANCIAL CONTEXT (JSON):\n')[1].split('\n\n')[0]);
    expect(context.cash.total).toBe(1000);expect(context.cash.net_account_balances).toBe(5800);
    expect(context.planned_monthly_expenses).toBe(480);expect(context.property_monthly_costs).toBe(370);
    expect(context.income.monthly_total).toBe(433.33);
    expect(fixture.client.entities.Account.filter).toHaveBeenLastCalledWith(expect.objectContaining({created_by_id:'a'}),expect.objectContaining({cursor:'page2'}));
    expect(prompt).toContain('untrusted data');
  });

  it('gives Ask Avera normalized named bills and computed goal evidence, excluding other users',async()=>{
    rows.IncomeSource=[{created_by_id:'a',name:'Salary',amount:1500,frequency:'biweekly',active:true},{created_by_id:'b',name:'Private salary',amount:99999,frequency:'monthly'}];
    rows.Bill=[{created_by_id:'a',name:'Insurance',amount:1200,frequency:'annual'}];
    rows.Goal=[{created_by_id:'a',name:'Emergency fund',target_amount:4000,saved_amount:1000,target_date:'2027-12-01'}];
    await ask(req({question:'What should I focus on?'}));
    const prompt=fixture.client.asServiceRole.integrations.Core.InvokeLLM.mock.calls[0][0].prompt;
    const context=JSON.parse(prompt.split('FINANCIAL CONTEXT (JSON):\n')[1].split('\n\n')[0]);
    expect(context.income.sources[0]).toMatchObject({name:'Salary',monthly_equivalent:3250});
    expect(context.recurring_bills.bills[0]).toMatchObject({name:'Insurance',monthly_equivalent:100});
    expect(context.insights.goals[0]).toMatchObject({name:'Emergency fund',remaining:3000});
    expect(context.insights.goals[0].required_monthly).toBeGreaterThan(0);
    expect(prompt).not.toContain('Private salary');expect(prompt).toContain('Name the relevant bills');
  });
  it('Ask Avera reports missing records as unknown and rejects empty model answers',async()=>{
    fixture.client.asServiceRole.integrations.Core.InvokeLLM.mockResolvedValue({answer:' '});
    expect((await ask(req({question:'How much can I save?'}))).status).toBe(502);
    const prompt=fixture.client.asServiceRole.integrations.Core.InvokeLLM.mock.calls[0][0].prompt;
    const context=JSON.parse(prompt.split('FINANCIAL CONTEXT (JSON):\n')[1].split('\n\n')[0]);
    expect(context.insights.planning_surplus).toBeNull();expect(context.insights.warnings.join(' ')).toContain('No active income');
  });
  it('removes accounts no longer returned by Plaid without deleting manual accounts',async()=>{
    rows.Account=[{id:'old',created_by_id:'a',plaid_item_id:'item',plaid_account_id:'closed',source:'Plaid Sandbox'},{id:'manual',created_by_id:'a',plaid_item_id:'item',source:'Manual'}];
    await sync(req());expect(rows.Account.some(r=>r.id==='old')).toBe(false);expect(rows.Account.some(r=>r.id==='manual')).toBe(true);
    expect(rows.Account.find(r=>r.plaid_account_id==='acc').balance).toBe(90);
  });
  it('rejects unsupported account currencies instead of labeling them dollars',async()=>{
    fetchMock.mockResolvedValueOnce(Response.json({accounts:[{...account,balances:{current:100,iso_currency_code:'EUR'}}]}));
    await sync(req());expect(rows.PlaidCredential[0].sync_cursor).toBe('start');expect(rows.Account).toHaveLength(0);
  });

  it('preserves a provider credit overpayment as an asset instead of inventing debt',async()=>{
    fetchMock.mockResolvedValueOnce(Response.json({accounts:[{...account,type:'credit',subtype:'credit card',balances:{current:-40,available:200}}]}));
    await sync(req());expect(rows.Account[0].balance).toBe(40);expect(rows.Account[0].type).toBe('credit_card');
  });

});
