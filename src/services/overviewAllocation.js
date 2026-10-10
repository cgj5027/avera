import { round2 } from './financialCalculations';

/** Presentation breakdown of the existing projection, without adding actual transactions again. */
export function monthlyAllocation(projection) {
  if (!projection || typeof projection !== 'object') return null;
  const { monthlyIncome: income, monthlyExpenses: expenses, budgetTotal, propertyCosts, billsBreakdown = [], estimateUsed = {} } = projection;
  if (!Array.isArray(billsBreakdown) || !estimateUsed || typeof estimateUsed !== 'object') return null;
  const amounts = [income, expenses, budgetTotal, propertyCosts, ...billsBreakdown.map(b => b?.monthly)];
  if (amounts.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return null;
  const buckets = estimateUsed.expenses > 0
    ? [{ key: 'estimated', name: 'Estimated spending', value: expenses, color: 'chart-1' }]
    : [
        { key: 'bills', name: 'Bills', value: round2(billsBreakdown.reduce((sum, bill) => sum + bill.monthly, 0)), color: 'chart-1' },
        { key: 'budget', name: 'Budget limits', value: budgetTotal, color: 'chart-2' },
        { key: 'property', name: 'Mortgage & property', value: propertyCosts, color: 'chart-3' },
      ];
  if (Math.abs(round2(buckets.reduce((sum, bucket) => sum + bucket.value, 0)) - expenses) > 0.001) return null;
  const unallocated = round2(Math.max(0, income - expenses));
  const shortfall = round2(Math.max(0, expenses - income));
  if (unallocated > 0) buckets.push({ key: 'unallocated', name: 'Unallocated', value: unallocated, color: estimateUsed.expenses > 0 ? 'chart-2' : 'chart-4' });
  return {
    income, expenses, unallocated, shortfall,
    slices: buckets.filter(bucket => bucket.value > 0).map(bucket => ({ ...bucket, incomePercent: income > 0 ? Math.round(bucket.value / income * 1000) / 10 : null })),
  };
}
