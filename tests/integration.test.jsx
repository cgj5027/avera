import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { readFileSync, readdirSync } from 'node:fs';
const sdk = vi.hoisted(() => ({ auth: { me: vi.fn(), logout: vi.fn(), loginViaEmailPassword: vi.fn(), register: vi.fn(), verifyOtp: vi.fn(), setToken: vi.fn(), resendOtp: vi.fn(), loginWithProvider: vi.fn() }, app: { getPublicSettings: vi.fn() }, entities: {} }));
vi.mock('@/api/base44Client', () => ({ base44: sdk }));
vi.mock('@/lib/app-params', () => ({ appParams: { token: 'test-token' } }));
import { appParams } from '@/lib/app-params';
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { AuthenticatedApp } from '../src/App';
import BillDialog from '../src/components/bills/BillDialog';
import CategoryDialog from '../src/components/budget/CategoryDialog';
import GoalDialog from '../src/components/goals/GoalDialog';
import PropertyDialog from '../src/components/properties/PropertyDialog';
import GoalContributionDialog from '../src/components/goals/GoalContributionDialog';
import PropertyCard from '../src/components/properties/PropertyCard';
import BillsBudget from '../src/pages/BillsBudget';
import Properties from '../src/pages/Properties';
import Goals from '../src/pages/GoalsOpportunities';
import YearlyPlan from '../src/pages/YearlyPlan';
import * as data from '../src/services/dataService';

let rows;
let user;
beforeEach(() => {
  vi.clearAllMocks();
  user = { id: 'user-a' };
  appParams.token = 'test-token';
  rows = {};
  sdk.auth.me.mockImplementation(async () => user);
  sdk.app.getPublicSettings.mockResolvedValue({ id:'app' });
  for (const name of Object.values(data.DATA_ENTITIES)) {
    rows[name] = [];
    sdk.entities[name] = {
      filter: vi.fn(async q => ({ items:rows[name].filter(x => Object.entries(q).every(([k,v]) => x[k] === v)), has_more:false,next_cursor:null })),
      get: vi.fn(async id => rows[name].find(x => x.id === id)),
      create: vi.fn(async payload => {const x={...payload,id:String(rows[name].length+1),created_by_id:user.id};rows[name].push(x);return x;}),
      update: vi.fn(async (id,payload) => {const x=rows[name].find(x=>x.id===id);Object.assign(x,payload);return x;}),
      delete: vi.fn(async id => {rows[name]=rows[name].filter(x=>x.id!==id);}),
    };
  }
});
describe('owner-scoped persistence with mocked SDK (not deployed RLS)', () => {
  it('isolates two users, strips forged ownership, persists CRUD', async () => {
    const a=await data.createRecord('incomeSource',{name:'Salary',amount:100,created_by_id:'user-b'});
    user={id:'user-b'};
    expect(await data.listRecords('incomeSource')).toEqual([]);
    await expect(data.updateRecord('incomeSource',a.id,{amount:200})).rejects.toThrow('cannot access');
    await expect(data.deleteRecord('incomeSource',a.id)).rejects.toThrow('cannot access');
    user={id:'user-a'};
    await data.updateRecord('incomeSource',a.id,{amount:200});
    expect((await data.listRecords('incomeSource'))[0].amount).toBe(200);
    await data.deleteRecord('incomeSource',a.id);
    expect(await data.listRecords('incomeSource')).toEqual([]);
  });
  it('rejects unauthenticated calls before financial operations', async () => {
    user=null;
    await expect(data.createRecord('goal',{})).rejects.toThrow('Sign in');
    expect(sdk.entities.Goal.create).not.toHaveBeenCalled();
  });
  it('loads all cursor pages and rejects repeated cursors', async () => {
    sdk.entities.Bill.filter.mockResolvedValueOnce({items:[{id:'a'}],has_more:true,next_cursor:'next'}).mockResolvedValueOnce({items:[{id:'b'}],has_more:false});
    expect(await data.listRecords('bill')).toHaveLength(2);
    expect(sdk.entities.Bill.filter.mock.calls[1][1].cursor).toBe('next');
    sdk.entities.Bill.filter.mockResolvedValue({items:[],has_more:true,next_cursor:'loop'});
    await expect(data.listRecords('bill')).rejects.toThrow('pagination');
  });
  it('upserts the existing household profile', async () => {
    await data.saveHouseholdProfile({household_name:'A'});
    await data.saveHouseholdProfile({household_name:'B'});
    expect(rows.HouseholdProfile).toHaveLength(1);
    expect(rows.HouseholdProfile[0].household_name).toBe('B');
  });
  it('every financial schema requires owner-only RLS including admins', () => {
    const dir=process.cwd()+'/base44/entities/';
    for(const file of readdirSync(dir).filter(x=>x!=='User.jsonc')) {
      const schema=JSON.parse(readFileSync(dir+file,'utf8'));
      // Create may anchor ownership on either accepted form; both restrict to the signed-in owner.
      expect(
        [{user_condition:{id:'{{user.id}}'}}, {created_by_id:'{{user.id}}'}].some(r => JSON.stringify(r) === JSON.stringify(schema.rls.create)),
        `${file}:create must be owner-anchored`
      ).toBe(true);
      for(const op of ['read','update','delete']) {
        expect(schema.rls[op],`${file}:${op} must be owner-only, including admins`).toEqual({created_by_id:'{{user.id}}'});
      }
    }
  });
});
describe('auth route integration', () => {
  function Guarded() {return <AuthProvider><MemoryRouter><Routes><Route element={<ProtectedRoute unauthenticatedElement={<p>Sign in required</p>} />}><Route path="/" element={<p>Private content</p>} /></Route></Routes></MemoryRouter></AuthProvider>;}
  it('shows authenticated content only after verification', async () => {
    render(<Guarded />);expect(screen.queryByText('Private content')).toBeNull();expect(await screen.findByText('Private content')).toBeTruthy();
  });
  it('blocks expired sessions', async () => {
    sdk.auth.me.mockRejectedValue({status:401});render(<Guarded />);expect(await screen.findByText('Sign in required')).toBeTruthy();expect(screen.queryByText('Private content')).toBeNull();
  });
  it('login and registration routes are reachable even if public settings fail', async () => {
    sdk.app.getPublicSettings.mockRejectedValue({status:503});
    render(<AuthProvider><MemoryRouter initialEntries={['/login']}><AuthenticatedApp /></MemoryRouter></AuthProvider>);
    expect(screen.getByRole('heading',{name:'Welcome back'})).toBeTruthy();
    fireEvent.click(screen.getByRole('link',{name:'Create one'}));
    expect(await screen.findByRole('heading',{name:'Create your account'})).toBeTruthy();
  });
  it('logout immediately hides protected content and clears session mode', async () => {
    function Control(){const {logout}=useAuth();return <button onClick={()=>logout(false)}>Sign out</button>;}
    sessionStorage.setItem('avera_data_mode','manual');
    render(<AuthProvider><Control /><MemoryRouter><Routes><Route element={<ProtectedRoute unauthenticatedElement={<p>Signed out</p>} />}><Route path="/" element={<p>Private content</p>} /></Route></Routes></MemoryRouter></AuthProvider>);
    await screen.findByText('Private content');fireEvent.click(screen.getByText('Sign out'));expect(await screen.findByText('Signed out')).toBeTruthy();expect(sessionStorage.getItem('avera_data_mode')).toBeNull();expect(sdk.auth.logout).toHaveBeenCalled();
  });
});
describe('financial UI integration', () => {
  it('retains a failed form and announces the save error', async () => {
    const close=vi.fn();render(<CategoryDialog open category={null} onOpenChange={close} onSave={vi.fn().mockRejectedValue(new Error('offline'))} />);
    fireEvent.change(screen.getByLabelText('Category name'),{target:{value:'Food'}});fireEvent.change(screen.getByLabelText('Monthly limit'),{target:{value:'100'}});fireEvent.click(screen.getByRole('button',{name:'Add category'}));
    expect(await screen.findByRole('alert')).toBeTruthy();expect(close).not.toHaveBeenCalled();expect(screen.getByLabelText('Category name').value).toBe('Food');
  });
  it('renders the manual valuation rather than reading a Promise', () => {
    render(<PropertyCard property={{nickname:'Home',estimated_value:100000,valuation_date:'2026-01-01'}} mortgage={{outstanding_balance:40000}} />);
    expect(screen.getByText('$100,000.00')).toBeTruthy();expect(screen.getByText('$60,000.00')).toBeTruthy();expect(screen.getByText('User-provided estimate, as of Jan 1, 2026')).toBeTruthy();
  });
  it('bill create, reload, payment and next-cycle action work together', async () => {
    render(<BillsBudget />);fireEvent.click(await screen.findByRole('button',{name:'Add bill'}));
    fireEvent.change(screen.getByLabelText('Bill name'),{target:{value:'Rent'}});
    fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'1000'}});
    fireEvent.change(screen.getByLabelText('Next due date'),{target:{value:'2026-01-31'}});
    const buttons=screen.getAllByRole('button',{name:'Add bill'});fireEvent.click(buttons[buttons.length-1]);
    expect(await screen.findByText('Rent')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Mark paid'}));
    await waitFor(()=>expect(rows.Bill[0].next_due_date).toBe('2026-02-28'));
    expect(rows.Bill[0].paid_this_cycle).toBe(false);
    expect(await screen.findByRole('button',{name:'Mark paid'})).toBeTruthy();
  });
});

describe('budget relationships', () => {
  it('renaming a category retains its spending and disallows duplicate names', async () => {
    const c=await data.createRecord('budgetCategory',{name:'Food',monthly_limit:100});
    await data.createRecord('transaction',{category:'Food',amount:20,type:'expense',date:'2026-01-01'});
    await data.updateRecord('budgetCategory',c.id,{name:'Groceries'});
    expect(rows.Transaction[0].category).toBe('Groceries');
    await expect(data.createRecord('budgetCategory',{name:'Groceries'})).rejects.toThrow('already exists');
  });
});


describe('primary manual workflows with SDK fixtures', () => {
  it('adds two properties with separate mortgages, edits a valuation, cascades deletion', async () => {
    render(<Properties />);
    for(const [nickname,value,balance] of [['Home','100000','40000'],['Rental','80000','30000']]) {
      fireEvent.click(await screen.findByRole('button',{name:'Add property'}));
      fireEvent.change(screen.getByLabelText('Nickname'),{target:{value:nickname}});
      fireEvent.change(screen.getByLabelText('Estimated value'),{target:{value}});
      fireEvent.change(screen.getByLabelText('Outstanding balance'),{target:{value:balance}});
      const buttons=screen.getAllByRole('button',{name:'Add property'});fireEvent.click(buttons[buttons.length-1]);
      await screen.findByText(nickname);
      await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    }
    expect(rows.Property).toHaveLength(2);expect(rows.MortgageRecord).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button',{name:'Edit property'})[0]);
    fireEvent.change(screen.getByLabelText('Estimated value'),{target:{value:'120000'}});
    fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
    expect(await screen.findByText('$120,000.00')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button',{name:'Delete property'})[0]);fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));
    await waitFor(()=>expect(rows.Property).toHaveLength(1));expect(rows.MortgageRecord).toHaveLength(1);expect(rows.Property[0].nickname).toBe('Rental');
  });
  it('adds a goal, records savings, edits it and deletes it', async () => {
    render(<Goals />);fireEvent.click(await screen.findByRole('button',{name:'Add goal'}));
    fireEvent.change(screen.getByLabelText('Goal name'),{target:{value:'Emergency'}});
    fireEvent.change(screen.getByLabelText('Target amount'),{target:{value:'1000'}});
    const adds=screen.getAllByRole('button',{name:'Add goal'});fireEvent.click(adds[adds.length-1]);
    await screen.findByRole('heading',{name:'Emergency'});
    fireEvent.click(screen.getByRole('button',{name:'Log contribution'}));
    fireEvent.change(screen.getByLabelText('Contribution amount'),{target:{value:'100'}});
    const logs=screen.getAllByRole('button',{name:'Log contribution'});fireEvent.click(logs[logs.length-1]);
    await waitFor(()=>expect(rows.Goal[0].saved_amount).toBe(100));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button',{name:'Edit goal'}));
    fireEvent.change(screen.getByLabelText('Target amount'),{target:{value:'1500'}});
    fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
    await waitFor(()=>expect(rows.Goal[0].target_amount).toBe(1500));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button',{name:'Delete goal'}));fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));
    await waitFor(()=>expect(rows.Goal).toHaveLength(0));
  });
  it('adds income, derives the yearly projection, saves and deletes a forecast', async () => {
    render(<YearlyPlan />);fireEvent.click(await screen.findByRole('button',{name:'Add income source'}));
    fireEvent.change(screen.getByLabelText('Source name'),{target:{value:'Salary'}});
    fireEvent.change(screen.getByLabelText('Amount per paycheck'),{target:{value:'2000'}});
    const adds=screen.getAllByRole('button',{name:'Add income source'});fireEvent.click(adds[adds.length-1]);
    await waitFor(()=>expect(rows.IncomeSource).toHaveLength(1));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(screen.getByRole('button',{name:'Save snapshot'}));
    await waitFor(()=>expect(rows.ForecastRecord).toHaveLength(1));expect(rows.ForecastRecord[0].projected_income).toBe(24000);
    fireEvent.click(await screen.findByRole('button',{name:'Delete snapshot'}));
    fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));
    await waitFor(()=>expect(rows.ForecastRecord).toHaveLength(0));
  });
});

it.fails('concurrent goal contributions retain both persisted updates (known defect)', async () => {
  const goal = await data.createRecord('goal', {name:'Savings',target_amount:1000,saved_amount:100});
  // Two sessions read before either writes, as applyContribution currently does.
  const first = { ...(await data.listRecords('goal'))[0] };
  const second = { ...(await data.listRecords('goal'))[0] };
  await Promise.all([
    data.updateRecord('goal', goal.id, {saved_amount:first.saved_amount+10}),
    data.updateRecord('goal', goal.id, {saved_amount:second.saved_amount+20}),
  ]);
  expect((await data.listRecords('goal'))[0].saved_amount).toBe(130);
});

it('edits and deletes logged spending through the budget UI', async () => {
  await data.createRecord('budgetCategory',{name:'Food',monthly_limit:100});
  await data.createRecord('transaction',{description:'Lunch',category:'Food',amount:10,type:'expense',date:'2026-10-01'});
  render(<BillsBudget />);
  const tab=await screen.findByRole('tab',{name:'Budget',exact:true});
  fireEvent.mouseDown(tab,{button:0,ctrlKey:false});fireEvent.click(tab);
  fireEvent.click(await screen.findByRole('button',{name:/View transactions/}));
  fireEvent.click(await screen.findByRole('button',{name:'Edit spending Lunch'}));
  fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'15'}});
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(rows.Transaction[0].amount).toBe(15));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Save changes'})).toBeNull());
  fireEvent.click(screen.getByRole('button',{name:'Delete spending Lunch'}));
  fireEvent.click(screen.getByRole('button',{name:'Delete',exact:true}));
  await waitFor(()=>expect(rows.Transaction).toHaveLength(0));
});


it('redirects a signed-out user from a financial route to the local login page', async () => {
  appParams.token = null;
  render(<AuthProvider><MemoryRouter initialEntries={['/properties']}><AuthenticatedApp /></MemoryRouter></AuthProvider>);
  expect(await screen.findByRole('heading',{name:'Welcome back'})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Add property'})).toBeNull();
  expect(sdk.entities.Property.filter).not.toHaveBeenCalled();
});
it('registration validates matching passwords and transitions to email verification', async () => {
  sdk.auth.register.mockResolvedValue({});
  render(<AuthProvider><MemoryRouter initialEntries={['/register']}><AuthenticatedApp /></MemoryRouter></AuthProvider>);
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'audit@example.test'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'test-password'}});
  fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'wrong-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Create account'}));
  expect(await screen.findByRole('alert')).toBeTruthy();expect(sdk.auth.register).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'test-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Create account'}));
  expect(await screen.findByRole('heading',{name:'Verify your email'})).toBeTruthy();
  expect(sdk.auth.register).toHaveBeenCalledWith({email:'audit@example.test',password:'test-password'});
  expect(screen.getByLabelText('Email verification code')).toBeTruthy();
});

it('login calls the SDK and announces invalid credentials', async () => {
  sdk.auth.loginViaEmailPassword.mockRejectedValue(new Error('Invalid credentials'));
  render(<AuthProvider><MemoryRouter initialEntries={['/login']}><AuthenticatedApp /></MemoryRouter></AuthProvider>);
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'audit@example.test'}});
  fireEvent.change(screen.getByLabelText('Password'),{target:{value:'invalid-test-password'}});
  fireEvent.click(screen.getByRole('button',{name:'Log in',exact:true}));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(sdk.auth.loginViaEmailPassword).toHaveBeenCalledWith('audit@example.test','invalid-test-password');
});

it('an accidentally dismissed add-bill draft survives reopening and clears after cancel', async () => {
  const close = vi.fn();
  const view = render(<BillDialog open bill={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  fireEvent.change(screen.getByLabelText('Bill name'),{target:{value:'Rent'}});
  fireEvent.change(screen.getByLabelText('Amount'),{target:{value:'1000'}});
  view.rerender(<BillDialog open={false} bill={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<BillDialog open bill={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Bill name').value).toBe('Rent');
  expect(screen.getByLabelText('Amount').value).toBe('1000');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);
  view.rerender(<BillDialog open={false} bill={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<BillDialog open bill={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Bill name').value).toBe('');
});

it('an accidentally dismissed add-goal draft survives reopening and clears after cancel', async () => {
  const close = vi.fn();
  const view = render(<GoalDialog open goal={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  fireEvent.change(screen.getByLabelText('Goal name'),{target:{value:'Emergency fund'}});
  fireEvent.change(screen.getByLabelText('Target amount'),{target:{value:'5000'}});
  fireEvent.change(screen.getByLabelText('Target date (optional)'),{target:{value:'2026-12-31'}});
  view.rerender(<GoalDialog open={false} goal={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<GoalDialog open goal={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Goal name').value).toBe('Emergency fund');
  expect(screen.getByLabelText('Target amount').value).toBe('5000');
  expect(screen.getByLabelText('Target date (optional)').value).toBe('2026-12-31');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);
  view.rerender(<GoalDialog open={false} goal={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<GoalDialog open goal={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Goal name').value).toBe('');
});

it('an accidentally dismissed add-property draft survives reopening and clears after cancel', async () => {
  const close = vi.fn();
  const view = render(<PropertyDialog open property={null} mortgage={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  fireEvent.change(screen.getByLabelText('Nickname'),{target:{value:'Maple Street'}});
  fireEvent.change(screen.getByLabelText('Estimated value'),{target:{value:'320000'}});
  fireEvent.change(screen.getByLabelText('Maintenance /mo'),{target:{value:'250'}});
  view.rerender(<PropertyDialog open={false} property={null} mortgage={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<PropertyDialog open property={null} mortgage={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Nickname').value).toBe('Maple Street');
  expect(screen.getByLabelText('Estimated value').value).toBe('320000');
  expect(screen.getByLabelText('Maintenance /mo').value).toBe('250');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);
  view.rerender(<PropertyDialog open={false} property={null} mortgage={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  view.rerender(<PropertyDialog open property={null} mortgage={null} onOpenChange={close} onSave={vi.fn().mockResolvedValue({})} />);
  expect(screen.getByLabelText('Nickname').value).toBe('');
});

it('a dismissed contribution draft survives reopening for the same goal and clears after cancel', async () => {
  const close = vi.fn();
  const goal = { id:'g1', name:'Vacation', target_amount:2000, saved_amount:500 };
  const save = vi.fn().mockResolvedValue({});
  const view = render(<GoalContributionDialog open goal={goal} onOpenChange={close} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Contribution amount'),{target:{value:'250'}});
  view.rerender(<GoalContributionDialog open={false} goal={goal} onOpenChange={close} onSave={save} />);
  view.rerender(<GoalContributionDialog open goal={goal} onOpenChange={close} onSave={save} />);
  expect(screen.getByLabelText('Contribution amount').value).toBe('250');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  expect(close).toHaveBeenCalledWith(false);
  view.rerender(<GoalContributionDialog open={false} goal={goal} onOpenChange={close} onSave={save} />);
  view.rerender(<GoalContributionDialog open goal={goal} onOpenChange={close} onSave={save} />);
  expect(screen.getByLabelText('Contribution amount').value).toBe('');
  view.rerender(<GoalContributionDialog open goal={{...goal,id:'g2'}} onOpenChange={vi.fn()} onSave={save} />);
  expect(screen.getByLabelText('Contribution amount').value).toBe('');
});

it('editing bill details preserves a month-end recurrence anchor', async () => {
  const save=vi.fn().mockResolvedValue({});
  render(<BillDialog open bill={{name:'Rent',amount:1000,frequency:'monthly',next_due_date:'2026-02-28',recurrence_day:31}} onOpenChange={vi.fn()} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Bill name'),{target:{value:'Housing'}});
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(save).toHaveBeenCalled());expect(save.mock.calls[0][0].recurrence_day).toBe(31);
});