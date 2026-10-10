import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/utils/format';

const shortMoney = (v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`);

/** Income-versus-spending outlook for the next months, from the yearly projection. */
export default function OverviewChart({ rows }) {
  const data = rows.slice(0, 6);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-foreground">Income versus spending outlook</h2>
        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-1" />Income
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-2" />Spending
          </span>
        </div>
      </div>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={shortMoney} tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar dataKey="income" name="Income" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenses" name="Spending" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Projected from your saved income, bills, budget limits, and property costs. Source: Estimated.
      </p>
    </section>
  );
}