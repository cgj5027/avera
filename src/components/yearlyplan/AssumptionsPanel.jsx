import SourceChip from '@/components/states/SourceChip';
import { FREQUENCIES, monthlyFromFrequency } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/**
 * Assumptions panel: every input behind the projection is listed with its
 * source, so figures are never opaque (design system §18).
 */
export default function AssumptionsPanel({ projection, incomes, bills }) {
  const { billsBreakdown, budgetTotal, propertyCosts } = projection;
  const isEmpty = incomes.length === 0 && bills.length === 0 && budgetTotal === 0 && propertyCosts === 0;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-base font-semibold text-foreground">Assumptions behind this plan</h2>
      <p className="mt-1 text-base text-muted-foreground">
        Every projection is derived from your saved records. Recurring amounts are averaged across months by frequency.
      </p>
      {isEmpty ? (
        <p className="mt-4 text-base text-muted-foreground">
          Nothing to project yet — add income sources, bills, budget categories, or properties.
        </p>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {incomes.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-foreground">Income sources</dt>
              <dd className="mt-2 space-y-2">
                {incomes.map((i) => (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base text-foreground">{i.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                      {FREQUENCIES[i.frequency]?.label ?? 'Monthly'} · {formatCurrency(monthlyFromFrequency(i.amount, i.frequency))}/mo
                      <SourceChip source="Manual" />
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          )}
          {billsBreakdown.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-foreground">Recurring bills</dt>
              <dd className="mt-2 space-y-2">
                {billsBreakdown.map((b) => (
                  <div key={b.name} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base text-foreground">{b.name}</span>
                    <span className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(b.monthly)}/mo
                      <SourceChip source="Manual" />
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          )}
          {budgetTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-base text-foreground">Budget category limits</dt>
              <dd className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                {formatCurrency(budgetTotal)}/mo
                <SourceChip source="Manual" />
              </dd>
            </div>
          )}
          {propertyCosts > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt className="text-base text-foreground">Property costs</dt>
              <dd className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
                {formatCurrency(propertyCosts)}/mo
                <SourceChip source="Manual" />
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}