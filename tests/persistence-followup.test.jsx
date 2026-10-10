import React from 'react';
import {beforeEach, describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {matches} from './queryFixture';
const sdk=vi.hoisted(()=>({auth:{me:vi.fn()},entities:{},functions:{invoke:vi.fn()}}));
vi.mock('@/api/base44Client',()=>({base44:sdk}));
import * as data from '../src/services/dataService';
import {setModeOwner,setDataMode,setDemoWorkspace} from '../src/lib/mode';
import {datasetQuery} from '../base44/shared/dataset.ts';
import YearlyPlan from '../src/pages/YearlyPlan';
import OpportunityDiscovery from '../src/components/opportunities/OpportunityDiscovery';
import OpportunityResults from '../src/components/opportunities/OpportunityResults';
let rows;
beforeEach(()=>{
  vi.resetAllMocks();rows={};sdk.auth.me.mockResolvedValue({id:'a'});setModeOwner('a');setDataMode('sandbox');
  for(const name of Object.values(data.DATA_ENTITIES)) {
    rows[name]=[];
    sdk.entities[name]={
      filter:vi.fn(async query=>({items:rows[name].filter(r=>matches(r,query)),has_more:false})),
      get:vi.fn(async id=>rows[name].find(r=>r.id===id)),
      // Reproduce optional fields materialized as null by a hosted API.
      create:vi.fn(async fields=>{const row={...fields,id:`${name}-${rows[name].length}`,created_by_id:'a',demo_profile:fields.demo_profile || null,updated_date:'2026-10-10T12:00:00Z'};rows[name].push(row);return row;}),
      update:vi.fn(async(id,fields)=>{const row=rows[name].find(r=>r.id===id);Object.assign(row,fields,{updated_date:'2026-10-10T13:00:00Z'});return row;}),
      delete:vi.fn(async id=>{rows[name]=rows[name].filter(r=>r.id!==id);}),
    };
  }
});
describe('ordinary persistence regressions; SDK fixtures, not hosted verification',()=>{
  it('reads missing, null and blank ordinary tags without including demo/other-user records',async()=>{
    rows.IncomeSource=[{id:'missing',created_by_id:'a'},{id:'null',created_by_id:'a',demo_profile:null},{id:'blank',created_by_id:'a',demo_profile:''},{id:'demo',created_by_id:'a',demo_profile:'early_career'},{id:'other',created_by_id:'b',demo_profile:null}];
    expect((await data.listRecords('incomeSource')).map(r=>r.id)).toEqual(['missing','null','blank']);
    expect(rows.IncomeSource.filter(r=>matches(r,datasetQuery({id:'a'},{mode:'ordinary'}))).map(r=>r.id)).toEqual(['missing','null','blank']);
    expect((await data.listRecords('incomeSource',{$or:[{id:'blank'},{id:'demo'}]})).map(r=>r.id)).toEqual(['blank']);
    setDemoWorkspace({profile:'early_career'});setDataMode('demo');
    expect((await data.listRecords('incomeSource')).map(r=>r.id)).toEqual(['demo']);
  });
  it('saves income, shows it on its card and retains it after returning to Yearly Plan',async()=>{
    const view=render(<YearlyPlan />);
    fireEvent.click(await screen.findByRole('button',{name:'Add income source'}));
    fireEvent.change(screen.getByLabelText('Source name'),{target:{value:'New salary'}});
    fireEvent.change(screen.getByLabelText('Amount per paycheck'),{target:{value:'2000'}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add income source'}));
    expect(await screen.findByRole('heading',{name:'New salary'})).toBeTruthy();
    expect(rows.IncomeSource).toHaveLength(1);expect(rows.IncomeSource[0].demo_profile).toBeNull();
    view.unmount();render(<YearlyPlan />);
    expect(await screen.findByRole('heading',{name:'New salary'})).toBeTruthy();
    expect(sdk.entities.IncomeSource.create).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText('$24,000.00').length).toBeGreaterThan(0);
  });
  it('creates detected income instead of overwriting a previously edited source',async()=>{
    rows.IncomeSource=[{id:'original',created_by_id:'a',name:'Existing salary',amount:2000,frequency:'monthly',active:true,demo_profile:null}];
    rows.Transaction=['2026-08-01','2026-09-01'].map((date,i)=>({id:`t${i}`,created_by_id:'a',demo_profile:null,type:'income',description:'Second payroll',amount:1000,date,source:'Plaid Sandbox',plaid_item_id:'item'}));
    sdk.functions.invoke.mockResolvedValue({data:{annual_amount:12000,rationale:'Fixture projection'}});
    render(<YearlyPlan />);
    fireEvent.click(await screen.findByRole('button',{name:'Edit source'}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Cancel'}));
    fireEvent.click(screen.getByRole('button',{name:'Add as income source'}));
    await screen.findByRole('dialog');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add income source'}));
    expect(await screen.findByRole('heading',{name:'Second payroll'})).toBeTruthy();
    expect(rows.IncomeSource).toHaveLength(2);expect(rows.IncomeSource.find(r=>r.id==='original').name).toBe('Existing salary');
    expect(sdk.entities.IncomeSource.update).not.toHaveBeenCalled();
  });
  it('persists a work profile and its edits after page unmount/remount',async()=>{
    let view=render(<OpportunityDiscovery />);
    fireEvent.change(await screen.findByLabelText('Skills'),{target:{value:'Bookkeeping'}});
    fireEvent.click(screen.getByRole('button',{name:'Save profile'}));
    await screen.findByText('Saved');expect(rows.JobProfile).toHaveLength(1);
    view.unmount();view=render(<OpportunityDiscovery />);
    await screen.findByText('Saved');expect(screen.getByText('Bookkeeping')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Edit profile'}));
    fireEvent.change(screen.getByLabelText('Skills'),{target:{value:'Bookkeeping, payroll'}});
    fireEvent.click(screen.getByRole('button',{name:'Save profile'}));await screen.findByText('Saved');
    view.unmount();render(<OpportunityDiscovery />);
    await screen.findByText('Saved');expect(screen.getByText('Bookkeeping, payroll')).toBeTruthy();
    expect(rows.JobProfile).toHaveLength(1);expect(sdk.entities.JobProfile.update).toHaveBeenCalledTimes(1);
  });
  it('loads the most recently updated profile when historical duplicates exist',async()=>{
    rows.JobProfile=[{id:'old',created_by_id:'a',skills:'Old',demo_profile:null,updated_date:'2026-01-01T00:00:00Z'},{id:'new',created_by_id:'a',skills:'New',demo_profile:'',updated_date:'2026-10-10T00:00:00Z'}];
    expect((await data.getJobProfile()).id).toBe('new');
    render(<OpportunityDiscovery />);expect(await screen.findByText('New')).toBeTruthy();expect(screen.queryByText('Old')).toBeNull();
  });
  it('keeps a failed income write in the dialog with an explicit error',async()=>{
    sdk.entities.IncomeSource.create.mockRejectedValue(new Error('fixture network failure'));
    render(<YearlyPlan />);fireEvent.click(await screen.findByRole('button',{name:'Add income source'}));
    fireEvent.change(screen.getByLabelText('Source name'),{target:{value:'Salary'}});fireEvent.change(screen.getByLabelText('Amount per paycheck'),{target:{value:'100'}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Add income source'}));
    expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByRole('dialog')).toBeTruthy();expect(rows.IncomeSource).toHaveLength(0);
  });
  it('requires a usable work profile before searching and labels broadened results',async()=>{
    let view=render(<OpportunityResults profile={null} />);expect(screen.getByRole('button',{name:'Find opportunities'}).disabled).toBe(true);
    expect(screen.getByText(/Save your work profile/)).toBeTruthy();expect(sdk.functions.invoke).not.toHaveBeenCalled();
    view.unmount();sdk.functions.invoke.mockResolvedValue({data:{opportunities:[],related_roles_searched:true}});
    render(<OpportunityResults profile={{skills:'Bookkeeping'}} />);fireEvent.click(screen.getByRole('button',{name:'Find opportunities'}));
    expect(await screen.findByText('Also searched related roles')).toBeTruthy();expect(screen.getByText('No matches found')).toBeTruthy();expect(screen.queryByText('Demonstration listings')).toBeNull();
  });
});
