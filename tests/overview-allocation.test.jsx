import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, NavLink } from 'react-router-dom';
import { projectYearlyPlan, round2 } from '../src/services/financialCalculations';
import { monthlyAllocation } from '../src/services/overviewAllocation';
import MonthlyAllocationChart from '../src/components/overview/MonthlyAllocationChart';
import OverviewChart from '../src/components/overview/OverviewChart';
import Overview from '../src/pages/Overview';
import { setModeOwner, setDataMode, clearDataMode } from '../src/lib/mode';
import { matches } from './queryFixture';

const sdk = vi.hoisted(() => ({ auth: { me: vi.fn() }, entities: {}, functions: { invoke: vi.fn() } }));
vi.mock('@/api/base44Client', () => ({ base44: sdk }));
const plan = (income = 3000, bills = 600) => projectYearlyPlan({
  incomes: [{ amount: income, frequency: 'monthly', active: true }],
  bills: [{ name: 'Rent', amount: bills, frequency: 'monthly' }],
  budgetCategories: [{ name: 'Groceries', monthly_limit: 300 }],
  properties: [{ id: 'home', taxes_monthly: 100 }],
  mortgages: [{ property_id: 'home', monthly_payment: 500 }],
});

describe('monthly allocation of the existing projection', () => {
  it('allocates the complete monthly income without re-adding tracked transactions', () => {
    const result = monthlyAllocation(plan(), { bills: [{ category: 'Housing' }], budgetCategories: [{ name: 'Groceries', monthly_limit: 300 }] });
    expect(result).toMatchObject({ income: 3000, expenses: 1500, unallocated: 1500, shortfall: 0 });
    expect(result.slices.map(s => [s.name, s.value, s.incomePercent])).toEqual([
      ['Groceries', 300, 10], ['Housing', 600, 20], ['Uncategorized', 600, 20], ['Unallocated income', 1500, 50],
    ]);
    expect(round2(result.slices.reduce((sum, s) => sum + s.value, 0))).toBe(result.income);
  });
  it('normalizes weekly and annual obligations using the existing calculation service', () => {
    const projection = projectYearlyPlan({ incomes: [{ amount: 500, frequency: 'weekly' }], bills: [{ amount: 120, frequency: 'annual' }, { amount: 10, frequency: 'weekly' }] });
    const result = monthlyAllocation(projection);
    expect(result.income).toBe(2166.67);
    expect(result.slices[0].value).toBe(53.33);
    expect(result.unallocated).toBe(2113.34);
    expect(round2(result.slices.reduce((sum, s) => sum + s.value, 0))).toBe(2166.67);
  });
  it('shows a shortfall rather than a negative or fabricated remainder', () => {
    const result = monthlyAllocation(plan(1000));
    expect(result).toMatchObject({ expenses: 1500, unallocated: 0, shortfall: 500 });
    expect(result.slices.some(s => s.key === 'unallocated')).toBe(false);
    expect(result.slices.reduce((sum, s) => sum + s.incomePercent, 0)).toBe(150);
    render(<MonthlyAllocationChart projection={plan(1000)} hasIncome hasExpenses />);
    expect(screen.getByText(/\$500.00 projected monthly shortfall/)).toBeTruthy();
    expect(screen.getByText(/slices show the expense mix/)).toBeTruthy();
  });
  it('leaves estimates without supplied categories Uncategorized', () => {
    const result = monthlyAllocation(projectYearlyPlan({ estimate: { income: 2000, expenses: 700 } }));
    expect(result.slices.map(s => [s.name, s.value])).toEqual([['Uncategorized', 700], ['Unallocated income', 1300]]);
  });
  it('counts categorized bills within their budget and preserves uncategorized obligations', () => {
    const bills = [{ category: ' housing ', amount: 1200, frequency: 'monthly' }, { amount: 100, frequency: 'monthly' }];
    const budgetCategories = [{ name: 'Housing', monthly_limit: 1500 }, { name: 'Food', monthly_limit: 300 }];
    const projection = projectYearlyPlan({ incomes: [{ amount: 3000, frequency: 'monthly' }], bills, budgetCategories });
    const result = monthlyAllocation(projection, { bills, budgetCategories });
    expect(result).toMatchObject({ expenses: 1900, overlap: 0, unallocated: 1100 });
    expect(result.slices.map(s => [s.name, s.value])).toEqual([['Food', 300], ['Housing', 1500], ['Uncategorized', 100], ['Unallocated income', 1100]]);
  });
  it('keeps obligations above the category limit rather than hiding an overrun', () => {
    const bills = [{ category: 'Housing', amount: 1200 }, { category: 'Housing', amount: 800 }];
    const budgetCategories = [{ name: 'Housing', monthly_limit: 1500 }];
    const result = monthlyAllocation(projectYearlyPlan({ incomes: [{ amount: 1000 }], bills, budgetCategories }), { bills, budgetCategories });
    expect(result).toMatchObject({ expenses: 2000, shortfall: 1000, unallocated: 0 });
    expect(result.slices).toHaveLength(1);
    expect(result.slices[0].name).toBe('Housing');
  });
  it('groups linked estimates by assigned transaction categories without duplicate imports', () => {
    const transactions = ['2026-08-01', '2026-09-01'].flatMap((date, index) => [
      { date, amount: 300, type: 'expense', category: 'Food', plaid_item_id: 'item', plaid_transaction_id: `food-${index}` },
      { date, amount: 100, type: 'expense', category: '', plaid_item_id: 'item', plaid_transaction_id: `other-${index}` },
    ]);
    transactions.push(transactions[0]);
    const result = monthlyAllocation(projectYearlyPlan({ estimate: { income: 2000, expenses: 400 } }), { transactions });
    expect(result.slices.map(s => [s.name, s.value])).toEqual([['Food', 300], ['Uncategorized', 100], ['Unallocated income', 1600]]);
  });
  it('preserves cents when category averages round independently', () => {
    const transactions = ['A', 'B', 'C'].map((category, index) => ({ date: `2026-0${index + 1}-01`, amount: 1, type: 'expense', category, plaid_item_id: 'item', plaid_transaction_id: category }));
    const result = monthlyAllocation(projectYearlyPlan({ incomes: [{ amount: 2 }], estimate: { expenses: 1 } }), { transactions });
    expect(result.expenses).toBe(1);
    expect(round2(result.slices.reduce((sum, slice) => sum + slice.value, 0))).toBe(2);
    expect(result.slices.filter(slice => slice.key !== 'unallocated').map(slice => slice.value)).toEqual([0.34, 0.33, 0.33]);
  });
  it('avoids division by zero and distinguishes missing income from known zero', () => {
    const projection = plan(0);
    expect(monthlyAllocation(projection).slices.every(s => s.incomePercent === null)).toBe(true);
    const view = render(<MonthlyAllocationChart projection={projection} hasIncome={false} hasExpenses />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText(/monthly shortfall/)).toBeNull();
    view.rerender(<MonthlyAllocationChart projection={projection} hasIncome hasExpenses />);
    expect(screen.getByText('$0.00')).toBeTruthy();
    expect(screen.getByText(/Add an active income source/)).toBeTruthy();
  });
  it.each([null, {}, { ...plan(), monthlyIncome: Infinity }, { ...plan(), monthlyExpenses: -1 }, { ...plan(), monthlyExpenses: 1501 }, { ...plan(), billsBreakdown: null }, { ...plan(), billsBreakdown: [null] }])('rejects missing, invalid and contradictory projection fields', projection => {
    expect(monthlyAllocation(projection)).toBeNull();
  });
  it('shows the current and next three months across a year boundary with accessible values', () => {
    const projection = projectYearlyPlan({ incomes: [{ amount: 1000, frequency: 'monthly' }], months: 6, startingFrom: new Date(2026, 11, 1) });
    render(<OverviewChart rows={projection.rows} />);
    expect(screen.getByRole('heading', { name: 'Income & spending' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'About the income and spending outlook' })).toBeTruthy();
    fireEvent.click(screen.getByText('View monthly values'));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByText('Dec 2026')).toBeTruthy();
    expect(within(table).getByText('Mar 2027')).toBeTruthy();
    expect(within(table).queryByText('Apr 2027')).toBeNull();
  });
});

describe('Overview charts use the active authenticated dataset; SDK fixtures', () => {
  beforeEach(() => {
    vi.resetAllMocks(); sdk.auth.me.mockResolvedValue({ id: 'a' }); setModeOwner('a'); setDataMode('sandbox');
    const records = {
      IncomeSource: [{ id: 'i', created_by_id: 'a', amount: 3000, frequency: 'monthly', demo_profile: null }, { id: 'other', created_by_id: 'b', amount: 99999, frequency: 'monthly' }, { id: 'demo', created_by_id: 'a', amount: 99999, frequency: 'monthly', demo_profile: 'multi_income' }],
      Bill: [{ id: 'b', created_by_id: 'a', name: 'Rent', amount: 600, frequency: 'monthly' }],
      Transaction: [{ created_by_id: 'a', type: 'income', amount: 3000, date: '2026-10-01', plaid_item_id: 'item', plaid_transaction_id: 'income' }, { created_by_id: 'a', type: 'expense', amount: 600, date: '2026-10-01', plaid_item_id: 'item', plaid_transaction_id: 'rent' }],
    };
    for (const name of ['Account', 'IncomeSource', 'Bill', 'BudgetCategory', 'Transaction', 'Property', 'MortgageRecord']) sdk.entities[name] = { filter: vi.fn(async query => ({ items: (records[name] || []).filter(record => matches(record, query)), has_more: false })) };
  });
  it('opens Overview from navigation without a session mode selection', async () => {
    clearDataMode();
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <NavLink to="/">Overview</NavLink>
        <Routes>
          <Route path="/settings" element={<h1>Settings</h1>} />
          <Route path="/" element={<Overview />} />
          <Route path="/welcome" element={<h1>Choose a demo profile</h1>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
    expect(await screen.findByRole('heading', { name: 'Overview', exact: true })).toBeTruthy();
    expect(await screen.findByRole('region', { name: 'Monthly income allocation' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Choose a demo profile' })).toBeNull();
  });
  it('shows row-four allocation and four projected months without doubling manual and imported figures', async () => {
    render(<MemoryRouter><Overview /></MemoryRouter>);
    const allocation = await screen.findByRole('region', { name: 'Monthly income allocation' });
    expect(within(allocation).getByText('$3,000.00')).toBeTruthy();
    expect(within(allocation).getByText('$600.00')).toBeTruthy();
    expect(within(allocation).getByText('20% of income')).toBeTruthy();
    expect(within(allocation).getByText('$2,400.00')).toBeTruthy();
    expect(screen.queryByText('$99,999.00')).toBeNull();
    const outlook = screen.getByRole('region', { name: 'Income and spending outlook' });
    expect(allocation.parentElement).toBe(outlook.parentElement.parentElement);
    fireEvent.click(within(outlook).getByText('View monthly values'));
    expect(within(outlook).getAllByRole('row')).toHaveLength(5);
    expect(within(outlook).getAllByText('$3,000.00')).toHaveLength(4);
    expect(within(outlook).getAllByText('$600.00')).toHaveLength(4);
  });
  it('keeps the Overview outlook consistent with a category that covers its bills', async () => {
    sdk.entities.Bill.filter.mockResolvedValue({ items: [{ name: 'Rent', category: 'Housing', amount: 1200, frequency: 'monthly' }], has_more: false });
    sdk.entities.BudgetCategory.filter.mockResolvedValue({ items: [{ name: 'Housing', monthly_limit: 1500 }], has_more: false });
    render(<MemoryRouter><Overview /></MemoryRouter>);
    const allocation = await screen.findByRole('region', { name: 'Monthly income allocation' });
    expect(within(allocation).getByText('Housing')).toBeTruthy();
    expect(within(allocation).getAllByText('$1,500.00')).toHaveLength(2);
    const outlook = screen.getByRole('region', { name: 'Income and spending outlook' });
    fireEvent.click(within(outlook).getByText('View monthly values'));
    expect(within(outlook).getAllByText('$1,500.00')).toHaveLength(4);
    expect(within(outlook).queryByText('$2,700.00')).toBeNull();
  });
});
