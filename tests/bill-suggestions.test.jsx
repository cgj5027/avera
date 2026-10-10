import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { matches } from './queryFixture';
import { recurringCandidates } from '../base44/shared/recurringBills.ts';
const fixture=vi.hoisted(()=>({client:null,request:vi.fn()}));
vi.mock('npm:@base44/sdk@0.8.52',()=>({createClientFromRequest:()=>fixture.client}));
vi.mock('@/services/billSuggestions',()=>({billSuggestionRequest:fixture.request}));
import handler from '../base44/functions/suggestBills/entry.ts';
import BillSuggestions from '../src/components/bills/BillSuggestions';
const now=new Date('2026-10-10T12:00:00Z');
const payments=(name='Power',category='Utilities')=>['2026-07-05','2026-08-05','2026-09-05','2026-10-05'].map((date,i)=>({id:String(i),created_by_id:'a',description:name,type:'expense',category,amount:80,date}));
const candidates=(t=payments(),b=[],m=[],d=[])=>recurringCandidates(t,b,m,d,now);
const req=body=>new Request('https://fixture.test',{method:'POST',body:JSON.stringify(body)});
let rows,user,llm;
beforeEach(()=>{
 cleanup(); user={id:'a'}; rows={Transaction:payments(),Bill:[],MortgageRecord:[],BillSuggestionDismissal:[]};
 llm=vi.fn(async()=>({accepted:[0]}));
 fixture.client={auth:{me:async()=>user},entities:Object.fromEntries(Object.keys(rows).map(name=>[name,{filter:vi.fn(async q=>({items:rows[name].filter(r=>matches(r,q)),has_more:false})),create:vi.fn(async data=>{const r={...data,id:'new-'+rows[name].length,created_by_id:user.id};rows[name].push(r);return r;})}])),asServiceRole:{integrations:{Core:{InvokeLLM:llm}}}};
 fixture.request.mockReset();
});
describe('conservative recurrence evidence',()=>{
 it('derives amounts, monthly cadence and a future estimated date',()=>{expect(candidates()[0]).toMatchObject({amount:80,frequency:'monthly',next_due_date:'2026-11-05',confidence:'High'});});
 it('clamps month-end dates without shifting the recurrence anchor',()=>{
  const t=['2026-07-31','2026-08-31','2026-09-30'].map((date,i)=>({...payments()[i],date}));
  expect(candidates(t)[0].next_due_date).toBe('2026-10-30');
 });
 it('allows new evidence to resurface a previously dismissed candidate',()=>{
  const fingerprint=candidates()[0].fingerprint;
  const t=[...payments(),{...payments()[0],id:'next',date:'2026-11-05'}];
  expect(recurringCandidates(t,[],[],[{fingerprint}],new Date('2026-11-10'))).toHaveLength(1);
 });
 it('requires at least three payments',()=>expect(candidates(payments().slice(0,2))).toEqual([]));
 it.each(['Groceries','Dining Out','Shopping','Gas station','Travel'])('excludes routine %s',category=>expect(candidates(payments('Merchant',category))).toEqual([]));
 it('rejects irregular cadence, varying amounts and outdated history',()=>{
  expect(candidates(payments().map((t,i)=>({...t,date:['2026-07-05','2026-08-18','2026-09-07','2026-10-05'][i]})))).toEqual([]);
  expect(candidates(payments().map((t,i)=>({...t,amount:i===1?300:80})))).toEqual([]);
  expect(candidates(payments().slice(0,3),[],[],[]).length).toBe(1);
  expect(recurringCandidates(payments(),[],[],[],new Date('2027-01-01'))).toEqual([]);
 });
 it('excludes income, pending, transfer, invalid amounts and impossible dates',()=>{
  for(const fields of [{type:'income'},{pending:true},{exclude_from_cashflow:true},{amount:NaN},{amount:-1},{date:'2026-02-30'},{date:'invalid'}])expect(candidates(payments().map(t=>({...t,...fields})))).toEqual([]);
 });
 it('deduplicates imported identifiers and honors user exclusions',()=>{
  const t=payments().map(r=>({...r,plaid_item_id:'i',plaid_transaction_id:r.id}));
  expect(candidates([...t,...t])[0].evidence).toHaveLength(4);
  expect(candidates(payments().map((t,i)=>({...t,not_recurring:i===0})))).toEqual([]);
 });
 it('suppresses existing bills, tracked mortgages and unchanged dismissals',()=>{
  expect(candidates(payments(),[{name:' POWER '}])).toEqual([]);
  expect(candidates(payments(),[{name:'My renamed utility',suggestion_merchant:'power'}])).toEqual([]);
  expect(candidates(payments(),[],[{lender:'Power',monthly_payment:80}])).toEqual([]);
  const fingerprint=candidates()[0].fingerprint;
  expect(candidates(payments(),[],[],[{fingerprint}])).toEqual([]);
  expect(candidates([...payments(),{...payments()[0],id:'next',date:'2026-11-05'}],[],[],[{fingerprint}])).toEqual([]); // future records excluded
 });
});
describe('actual backend handler with SDK and AI fixtures',()=>{
 it('protects dismissal records with ownership rules on every operation',()=>{
  const schema=JSON.parse(readFileSync('base44/entities/BillSuggestionDismissal.jsonc','utf8'));
  expect(Object.values(schema.rls)).toEqual(Array(4).fill({created_by_id:'{{user.id}}'}));
 });
 it('scopes demo suggestions and saves to the requested owned demo workspace',async()=>{
  rows.Transaction=payments('Demo utility').map(t=>({...t,demo_profile:'early_career'}));
  rows.Transaction.push(...payments('Other scenario').map(t=>({...t,demo_profile:'multi_income'})));
  const dataset={mode:'demo',profile:'early_career'};
  const data=await (await handler(req({dataset}))).json();expect(data.suggestions.map(c=>c.name)).toEqual(['Demo utility']);
  const c=data.suggestions[0];expect((await handler(req({action:'add',dataset,fingerprint:c.fingerprint,bill:c}))).status).toBe(200);
  expect(rows.Bill[0]).toMatchObject({created_by_id:'a',demo_profile:'early_career',source:'Sample data'});
 });
 it('rejects anonymous users before reading records',async()=>{user=null;expect((await handler(req({}))).status).toBe(401);expect(llm).not.toHaveBeenCalled();});
 it('isolates users and active datasets, ignoring supplied context',async()=>{
  rows.Transaction.push(...payments('Other private').map(t=>({...t,created_by_id:'b'})),...payments('Demo private').map(t=>({...t,demo_profile:'early_career'})));
  const result=await (await handler(req({user_id:'b',transactions:payments('Injected')}))).json();
  expect(result.suggestions.map(s=>s.name)).toEqual(['Power']);
  const prompt=llm.mock.calls[0][0].prompt;expect(prompt).not.toContain('private');expect(prompt).not.toContain('Injected');
 });
 it('retrieves subsequent transaction pages',async()=>{
  fixture.client.entities.Transaction.filter=vi.fn(async(q,opts)=>opts.cursor?{items:rows.Transaction.slice(2),has_more:false}:{items:rows.Transaction.slice(0,2),has_more:true,next_cursor:'page2'});
  expect((await (await handler(req({}))).json()).suggestions).toHaveLength(1);
 });
 it('rejects invalid demo profiles',async()=>expect((await handler(req({dataset:{mode:'demo',profile:'bad'}}))).status).toBe(400));
 it('does not trust fabricated AI candidates or fail open',async()=>{llm.mockResolvedValue({accepted:[99]});expect(await (await handler(req({}))).json()).toMatchObject({suggestions:[],ai_available:false});});
 it('handles provider failure without exposing errors',async()=>{llm.mockRejectedValue(new Error('secret provider detail'));const data=await (await handler(req({}))).json();expect(data).toMatchObject({suggestions:[],ai_available:false});expect(JSON.stringify(data)).not.toContain('secret');});
 it('persists owner-scoped dismissals without changing financial records',async()=>{const fingerprint=candidates()[0].fingerprint;expect((await handler(req({action:'dismiss',fingerprint}))).status).toBe(200);expect(rows.BillSuggestionDismissal[0].created_by_id).toBe('a');expect(rows.Bill).toHaveLength(0);expect((await (await handler(req({}))).json()).suggestions).toEqual([]);});
 it('adds only a reviewed valid candidate and rejects duplicate retries',async()=>{
  const c=candidates()[0];const body={action:'add',fingerprint:c.fingerprint,bill:{...c,name:'Power',category:'Utilities'}};
  expect((await handler(req(body))).status).toBe(200);expect(rows.Bill[0]).toMatchObject({amount:80,created_by_id:'a',source:'Estimated',demo_profile:''});expect((await handler(req(body))).status).toBe(409);
 });
 it('rejects invalid values and fabricated candidates',async()=>{const c=candidates()[0];expect((await handler(req({action:'add',fingerprint:c.fingerprint,bill:{...c,amount:-5}}))).status).toBe(400);expect((await handler(req({action:'add',fingerprint:'fake',bill:c}))).status).toBe(409);expect(rows.Bill).toHaveLength(0);});
});
describe('individual review UI',()=>{
 it('starts unselected, supports editing, saves only kept suggestions',async()=>{
  const c=candidates()[0]; fixture.request.mockResolvedValueOnce({suggestions:[c,{...c,fingerprint:'second',name:'Insurance'}],ai_available:true});fixture.request.mockResolvedValue({bill:{id:'saved'}});const onAdded=vi.fn();
  render(<BillSuggestions onAdded={onAdded}/>);fireEvent.click(screen.getByRole('button',{name:'Suggest bills'}));
  await screen.findByText('Insurance');expect(screen.getByRole('button',{name:'Add selected bills (0)'}).disabled).toBe(true);
  fireEvent.change(screen.getAllByLabelText('Amount (estimated)')[0],{target:{value:'90'}});fireEvent.click(screen.getAllByRole('button',{name:'Keep'})[0]);fireEvent.click(screen.getByRole('button',{name:'Add selected bills (1)'}));
  await waitFor(()=>expect(onAdded).toHaveBeenCalledOnce());expect(fixture.request.mock.calls[1]).toEqual(['add',expect.objectContaining({fingerprint:c.fingerprint,bill:expect.objectContaining({amount:90})})]);expect(screen.getByText('Insurance')).toBeTruthy();
 });
 it('dismisses individual suggestions and keeps failed dismissals visible',async()=>{const c=candidates()[0];fixture.request.mockResolvedValueOnce({suggestions:[c],ai_available:true}).mockRejectedValueOnce(new Error('Network unavailable'));render(<BillSuggestions onAdded={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Suggest bills'}));await screen.findByText('Power');fireEvent.click(screen.getByRole('button',{name:'Dismiss'}));await screen.findByRole('alert');expect(screen.getByText('Power')).toBeTruthy();});
});
