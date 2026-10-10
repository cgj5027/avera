import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { formatCurrency } from '@/utils/format';

const shortMoney = (v) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`);

/** Monthly net cash flow and running cash balance across the projected year. */
export default function MonthlyPlanChart({ rows }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-foreground">Monthly net and cash balance</h2>
        <div className="flex items-center gap-4" aria-hidden="true">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-3" />Monthly net
          </span>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="h-3 w-3 rounded-sm bg-chart-1" />Cash balance
          </span>
        </div>
      </div>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={shortMoney} tick={{ fontSize: 12, fill: 'hsl(var(--text-secondary))' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar dataKey="net" name="Monthly net" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="cumulative" name="Cash balance" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Cash balance starts from your saved account balances. Source: Estimated.
      </p>
    </section>
  );
}