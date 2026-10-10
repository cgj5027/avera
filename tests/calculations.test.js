import { describe, it, expect } from 'vitest';
import * as c from '../src/services/financialCalculations';
import { formatCurrency, formatDate } from '../src/utils/format';
import { safeReturnTo } from '../src/lib/authReturnTo';

describe('financial calculations', () => {
  it.each(Object.entries(c.FREQUENCIES))('normalizes %s', (frequency, { perYear }) => {
    expect(c.monthlyFromFrequency(120, frequency)).toBe(perYear * 10);
  });
  it('excludes inactive income and uses original annual frequency precision', () => {
    const p = c.projectYearlyPlan({ incomes: [{ amount: 100, frequency: 'weekly' }, { amount: 999, active: false }] });
    expect(p.monthlyIncome).toBe(433.33);
    expect(p.annualIncome).toBe(5200);
    expect(p.rows).toHaveLength(12);
  });
  it.each([[1.005, 1.01], [-1.005, -1.01], [Infinity, 0], [NaN, 0]])('rounds %s safely', (input, expected) => expect(c.round2(input)).toBe(expected));
  it('clamps monthly, annual and quarterly dates to calendar boundaries', () => {
    expect(c.addFrequency('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(c.addFrequency('2024-02-29', 'annual')).toBe('2025-02-28');
    expect(c.addFrequency('2026-01-31', 'quarterly')).toBe('2026-04-30');
    expect(() => c.addFrequency('garbage', 'monthly')).toThrow();
  });
  it('keeps the next bill cycle visible after paying the previous cycle', () => {
    const bill = { paid_this_cycle: true, last_paid_date: '2026-01-15', next_due_date: '2026-02-15' };
    expect(c.billStatus(bill, new Date(2026, 1, 15, 23)).key).toBe('due-soon');
    expect(c.upcomingBills([bill], 30, new Date(2026, 1, 1))).toHaveLength(1);
  });
  it('filters spending by month/category and excludes income', () => {
    expect(c.spentInMonth([{amount:10,type:'expense',category:'Food',date:'2026-01-01'}, {amount:20,type:'income',category:'Food',date:'2026-01-02'}, {amount:100,date:'2025-12-31'}], 'Food', c.monthRange(new Date(2026,0,1)))).toBe(10);
  });
  it('calculates goals, missing deadlines, negative capacity and completed goals', () => {
    const goal = { target_amount: 1000, saved_amount: 400, target_date: '2026-02-01' };
    expect(c.goalRequiredMonthly(goal, new Date(2026,0,2))).toBe(600);
    expect(c.calculateIncomeGap(goal, {monthlyIncome:100,monthlyExpenses:200}, new Date(2026,0,2)).shortfall).toBe(700);
    expect(c.goalRequiredMonthly({...goal,target_date:'invalid'})).toBeNull();
    expect(c.goalPace({...goal,saved_amount:1000},0).key).toBe('reached');
  });
  it('matches multiple properties with their own liabilities and costs', () => {
    const properties=[{id:'a',estimated_value:100000,taxes_monthly:100},{id:'b',estimated_value:50000}];
    const mortgages=[{property_id:'b',outstanding_balance:60000,monthly_payment:200},{property_id:'a',monthly_payment:300}];
    expect(c.propertyMonthlyCostsTotal(properties,mortgages)).toBe(600);
    expect(c.propertyEquity(properties[1],mortgages[0])).toBe(-10000);
    expect(c.totalMonthlyExpenses({properties,mortgages,bills:[{amount:20}],budgetCategories:[{monthly_limit:30}]})).toBe(650);
  });
  it.each([null, undefined, '', ' ', Infinity, NaN, true])('does not display invalid money %s as a financial result', v => expect(formatCurrency(v)).toBe('—'));
  it('handles invalid dates and real zero values', () => {expect(formatDate('invalid')).toBe('—');expect(formatCurrency(0)).toBe('$0.00');});
});
describe('auth return URLs', () => {
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/.//evil.example'])('rejects unsafe destination %s', raw => {
    window.history.replaceState({}, '', '/login?returnTo='+encodeURIComponent(raw)); expect(safeReturnTo()).toBe('/');
  });
  it('preserves internal paths while removing injected bootstrap fields', () => {
    window.history.replaceState({}, '', '/login?returnTo='+encodeURIComponent('/properties?app_id=bad&foo=ok')); expect(safeReturnTo()).toBe('/properties?foo=ok');
  });
});
it('projection rows reconcile with exact annual income, expenses and year-end cash', () => {
  const p=c.projectYearlyPlan({incomes:[{amount:100,frequency:'weekly'}],bills:[{amount:100,frequency:'annual'}],accounts:[{balance:10}],startingFrom:new Date(2026,0,1)});
  expect(c.round2(p.rows.reduce((s,r)=>s+r.income,0))).toBe(p.annualIncome);
  expect(c.round2(p.rows.reduce((s,r)=>s+r.expenses,0))).toBe(p.annualExpenses);
  expect(p.annualSavings).toBe(5100);
  expect(p.rows[11].cumulative).toBe(p.yearEndCash);
});
it('preserves monthly anchors and uses two calendar cycles per month', () => {
  expect(c.addFrequency('2026-02-28','monthly',31)).toBe('2026-03-31');
  expect(c.addFrequency('2026-02-15','semimonthly')).toBe('2026-02-28');
  expect(c.addFrequency('2026-02-28','semimonthly')).toBe('2026-03-15');
});
it('does not invent equity when the value or mortgage balance is unknown', () => {
  expect(c.propertyEquity({},null)).toBeNull();
  expect(c.propertyEquity({estimated_value:100},{outstanding_balance:null})).toBeNull();
});
it('marks unfinished expired goals behind regardless of future capacity', () => {
  expect(c.goalPace({target_amount:100,saved_amount:0,target_date:'2020-01-01'},1000).key).toBe('behind');
});
