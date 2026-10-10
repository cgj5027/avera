import React from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { projectYearlyPlan, round2 } from '../src/services/financialCalculations';
import { monthlyAllocation } from '../src/services/overviewAllocation';
import MonthlyAllocationChart from '../src/components/overview/MonthlyAllocationChart';
import OverviewChart from '../src/components/overview/OverviewChart';
import Overview from '../src/pages/Overview';
import { setModeOwner, setDataMode } from '../src/lib/mode';
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
    const result = monthlyAllocation(plan());
    expect(result).toMatchObject({ income: 3000, expenses: 1500, unallocated: 1500, shortfall: 0 });
    expect(result.slices.map(s => [s.name, s.value, s.incomePercent])).toEqual([
      ['Bills', 600, 20], ['Budget limits', 300, 10], ['Mortgage & property', 600, 20], ['Unallocated', 1500, 50],
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
  it('uses a single estimated spending bucket when manual plans are absent', () => {
    const result = monthlyAllocation(projectYearlyPlan({ estimate: { income: 2000, expenses: 700 } }));
    expect(result.slices.map(s => [s.name, s.value])).toEqual([['Estimated spending', 700], ['Unallocated', 1300]]);
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
});
