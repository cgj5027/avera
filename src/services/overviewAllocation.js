import { round2 } from './financialCalculations';
import { estimateFromTransactions, importedTransactions } from './plaidEstimates';

/** Presentation breakdown of the existing projection, without adding actual transactions again. */
export function monthlyAllocation(projection, records) {
  if (!projection || typeof projection !== 'object') return null;
  const { monthlyIncome: income, monthlyExpenses: expenses, budgetTotal, propertyCosts, billsBreakdown = [], estimateUsed = {} } = projection;
  if (!Array.isArray(billsBreakdown) || !estimateUsed || typeof estimateUsed !== 'object') return null;
  const amounts = [income, expenses, budgetTotal, propertyCosts, ...billsBreakdown.map(b => b?.monthly)];
  if (amounts.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) return null;

  if (typeof projection.plannedCategoryTotal !== 'number' || expenses !== (estimateUsed.expenses > 0 ? estimateUsed.expenses : projection.plannedCategoryTotal)) return null;
  const groups = new Map();
  const group = name => {
    const label = typeof name === 'string' && name.trim() ? name.trim() : 'Uncategorized';
    const key = label.toLocaleLowerCase('en-US');
    if (!groups.has(key)) groups.set(key, { key: `category:${key}`, name: label, obligations: 0, limit: 0 });
    return groups.get(key);
  };
  if (!records) group('').obligations = expenses;
  else if (estimateUsed.expenses > 0) {
    if (!Array.isArray(records.transactions || [])) return null;
    const transactions = importedTransactions(records.transactions || []);
    const estimate = estimateFromTransactions(transactions);
    if (!estimate.hasData || estimate.monthlyExpenses !== expenses) return null;
    for (const transaction of transactions.filter(t => t.type !== 'income')) group(transaction.category).obligations += Number(transaction.amount) / estimate.months;
  } else {
    const { bills = [], budgetCategories = [] } = records;
    if (!Array.isArray(bills) || !Array.isArray(budgetCategories) || bills.length !== billsBreakdown.length || [...bills, ...budgetCategories].some(record => !record || typeof record !== 'object')) return null;
    const limits = budgetCategories.map(category => category.monthly_limit ?? 0);
    if (limits.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0) || round2(limits.reduce((sum, value) => sum + value, 0)) !== budgetTotal) return null;
    budgetCategories.forEach((category, index) => { group(category.name).limit += limits[index]; });
    bills.forEach((bill, index) => { group(bill.category).obligations += billsBreakdown[index].monthly; });
    if (propertyCosts > 0) group('').obligations += propertyCosts;
  }
  const buckets = [...groups.values()].map(item => ({ key: item.key, name: item.name, value: round2(Math.max(item.obligations, item.limit)) })).filter(item => item.value > 0);
  // Per-category rounding must preserve the estimated monthly total exactly.
  if (estimateUsed.expenses > 0 && buckets.length) {
    buckets.sort((a, b) => b.value - a.value);
    buckets[0].value = round2(buckets[0].value + round2(expenses - buckets.reduce((sum, item) => sum + item.value, 0)));
  }
  buckets.sort((a, b) => Number(a.key === 'category:uncategorized') - Number(b.key === 'category:uncategorized') || a.name.localeCompare(b.name));
  const plannedExpenses = round2(buckets.reduce((sum, bucket) => sum + bucket.value, 0));
  if (plannedExpenses !== expenses) return null;
  const unallocated = round2(Math.max(0, income - plannedExpenses));
  const shortfall = round2(Math.max(0, plannedExpenses - income));
  if (unallocated > 0) buckets.push({ key: 'unallocated', name: 'Unallocated income', value: unallocated });
  return {
    income, expenses: plannedExpenses, overlap: round2(expenses - plannedExpenses), unallocated, shortfall,
    slices: buckets.map((bucket, index) => ({ ...bucket, color: `chart-${index % 6 + 1}`, incomePercent: income > 0 ? Math.round(bucket.value / income * 1000) / 10 : null })),
  };
}
