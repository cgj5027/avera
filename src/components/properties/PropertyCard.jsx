import { Pencil, Trash2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import SourceChip from '@/components/states/SourceChip';
import { PROPERTY_TYPES, propertyMonthlyCost, propertyEquity } from '@/services/financialCalculations';
import { getValuation } from '@/services/valuationService';
import { formatCurrency, formatDate } from '@/utils/format';

/** One property: manual valuation, mortgage, monthly costs, and calculated equity. */
export default function PropertyCard({ property, mortgage, onEdit, onDelete, busy }) {
  const valuation = getValuation(property);
  const equity = propertyEquity(property, mortgage);
  const monthly = propertyMonthlyCost(property, mortgage);
  const hasDebt = Boolean(mortgage) && Number(mortgage.outstanding_balance) > 0;

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{property.nickname}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{property.address || 'No address entered'}</p>
        </div>
        <StatusPill tone="neutral" icon={Home}>{PROPERTY_TYPES[property.property_type] ?? 'Other'}</StatusPill>
      </div>
      <dl className="mt-4 grid gap-3 text-base sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Estimated value</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="font-heading text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(valuation.value)}
            </span>
            <SourceChip source={property.source || 'Manual'} />
          <p className="mt-0.5 text-sm text-muted-foreground">
            User-provided estimate{valuation.asOf ? `, as of ${formatDate(valuation.asOf)}` : ''}
          </p>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Equity (value − debt) · Estimated</dt>
          <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(equity)}</dd>
        </div>
        {hasDebt && (
          <>
            <div>
              <dt className="text-sm text-muted-foreground">Mortgage balance</dt>
              <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(mortgage.outstanding_balance)}
              {mortgage.interest_rate != null && (
                <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">{mortgage.interest_rate}% APR{mortgage.lender ? ` · ${mortgage.lender}` : ''}</p>
              )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Monthly payment</dt>
              <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">
                {formatCurrency(mortgage.monthly_payment)}
              </dd>
            </div>
          </>
        )}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">
        Recurring costs <span className="tabular-nums text-foreground">{formatCurrency(monthly)}</span>/mo
        (taxes, insurance, HOA, maintenance{hasDebt ? ', mortgage' : ''}).
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(property, mortgage)} disabled={busy}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit property
        </Button>
        <Button size="sm" variant="outline" className="text-danger-text hover:bg-danger-surface" onClick={() => onDelete(property)} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete property
        </Button>
      </div>
    </article>
  );
}