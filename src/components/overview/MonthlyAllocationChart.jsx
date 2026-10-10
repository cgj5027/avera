import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import InfoHint from '@/components/states/InfoHint';
import { monthlyAllocation } from '@/services/overviewAllocation';
import { formatCurrency } from '@/utils/format';

/** Uses the same projected monthly totals as the adjacent outlook. */
export default function MonthlyAllocationChart({ projection, records, hasIncome, hasExpenses }) {
  const allocation = monthlyAllocation(projection, records);
  const canChart = allocation && hasIncome && allocation.income > 0;
  return (
    <section aria-label="Monthly income allocation" className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">Monthly spending plan</h2>
        <InfoHint label="About monthly allocation" text="Planned monthly spending grouped by assigned budget category. Each category uses the larger of its budget limit or categorized obligations, so bills within a budget are counted once. Expenses without a category, including property costs, are Uncategorized. Unallocated income is not guaranteed savings." />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Projected income / month</p>
      <p className="mt-1 break-words font-heading text-2xl font-semibold tabular-nums text-foreground">{allocation && hasIncome ? formatCurrency(allocation.income) : '—'}</p>
      {canChart ? <>
        <div className="mt-3 h-44" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie data={allocation.slices} dataKey="value" nameKey="name" rootTabIndex={-1} outerRadius="85%" stroke="hsl(var(--surface))" strokeWidth={2} isAnimationActive={false}>
                {allocation.slices.map(slice => <Cell key={slice.key} fill={`hsl(var(--${slice.color}))`} />)}
              </Pie>
              <Tooltip formatter={value => formatCurrency(value)} contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <dl className="mt-3 space-y-3" aria-label="Monthly allocation amounts and shares of income">
          {allocation.slices.map(slice => <div key={slice.key} className="flex items-start justify-between gap-2">
            <dt className="flex min-w-0 items-start gap-2 text-sm text-foreground">
              <span aria-hidden="true" className="mt-1 h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: `hsl(var(--${slice.color}))` }} />
              <span className="min-w-0 break-words">{slice.name}</span>
            </dt>
            <dd className="shrink-0 text-right text-sm tabular-nums text-foreground">
              {formatCurrency(slice.value)}
              <span className="block text-xs text-muted-foreground">{slice.incomePercent}% of income</span>
            </dd>
          </div>)}
        </dl>
        {allocation.shortfall > 0 && <p className="mt-4 text-sm text-danger-text">{formatCurrency(allocation.shortfall)} projected monthly shortfall. Expenses exceed income; slices show the expense mix.</p>}
        {!hasExpenses && <p className="mt-4 text-sm text-muted-foreground">No expense records yet. Add bills or budget limits to complete this allocation.</p>}
      </> : <p className="mt-4 rounded-xl border border-dashed border-border-strong bg-surface-subtle p-4 text-base text-muted-foreground">
        {!allocation ? 'Allocation is unavailable because projected amounts are invalid or inconsistent.' : 'Add an active income source in Yearly Plan to see how projected income is allocated.'}
      </p>}
      <p className="mt-4 text-xs text-muted-foreground">{projection.estimateUsed?.expenses > 0 ? 'Spending estimated from linked transactions. ' : 'Planned spending by category. '}Categorized bills count within their budget, not in addition to it. Unallocated income is not guaranteed savings.</p>
    </section>
  );
}
