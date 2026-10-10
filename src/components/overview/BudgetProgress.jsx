import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProgressBar from '@/components/finance/ProgressBar';
import { spentInMonth, monthRange } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/** Budget progress rows for the Overview: spent, limit, remaining, and a text-labeled bar. */
export default function BudgetProgress({ categories, transactions }) {
  const range = monthRange();
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">Budget progress</h2>
        <Link to="/bills-budget" className="flex items-center text-sm font-medium text-primary underline-offset-2 hover:underline">
          Manage budget <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {categories.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">No budget categories yet — add them in Bills &amp; Budget.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {categories.map((c) => {
            const limit = Number(c.monthly_limit) || 0;
            const spent = spentInMonth(transactions, c.name, range);
            const remaining = limit - spent;
            const percent = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
            const tone = percent >= 100 ? 'danger' : percent >= 85 ? 'warning' : 'primary';
            return (
              <li key={c.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-medium text-foreground">{c.name}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatCurrency(spent)} of {formatCurrency(limit)} · {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(-remaining)} over`}
                  </p>
                </div>
                <ProgressBar className="mt-2" percent={percent} tone={tone} />
                <p className="mt-1 text-xs text-muted-foreground">{Math.round(percent)}% of limit used</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}