import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import InfoHint from '@/components/states/InfoHint';
import { formatCurrency } from '@/utils/format';

const shortMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format;

/** Income-versus-spending outlook for the next months, from the yearly projection. */
export default function OverviewChart({ rows }) {
  const data = rows.slice(0, 4).map(row => ({ ...row, label: row.month.split(' ')[0] }));
  return (
    <section aria-label="Income and spending outlook" className="flex h-full min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-semibold text-foreground">Income & spending</h2>
          <InfoHint label="About the income and spending outlook" text="Projected income and spending for the current month and next three months. Bills are averaged by frequency. Each category uses the larger of its budget limit or categorized obligations; uncategorized property costs are included. Linked transaction estimates fill gaps when manual plans are absent. These are projections, not actual transactions." />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-1" />Income
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-2" />Spending
          </span>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{data[0]?.month} – {data.at(-1)?.month} · Projected USD / month</p>
      <div className="mt-4 h-56 sm:h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart accessibilityLayer={false} data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" interval={0} tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={shortMoney} tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={label => data.find(row => row.label === label)?.month ?? label}
              contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }}
            />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="expenses" name="Spending" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Based on saved plans; linked-account estimates fill missing plans. Source: Estimated.
      </p>
      <details className="mt-3">
        <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View monthly values</summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm tabular-nums text-foreground">
            <caption className="sr-only">Projected monthly income and spending in US dollars</caption>
            <thead><tr className="border-b border-border"><th scope="col" className="py-2 pr-2">Month</th><th scope="col" className="py-2 pr-2 text-right">Income</th><th scope="col" className="py-2 text-right">Spending</th></tr></thead>
            <tbody>{data.map(row => <tr key={row.key} className="border-b border-border"><th scope="row" className="py-2 pr-2 font-normal">{row.month}</th><td className="py-2 pr-2 text-right">{formatCurrency(row.income)}</td><td className="py-2 text-right">{formatCurrency(row.expenses)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
