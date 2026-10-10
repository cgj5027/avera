import SourceChip from '@/components/states/SourceChip';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INCOME_TYPES, FREQUENCIES, monthlyFromFrequency } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/** One income source: per-paycheck amount plus its monthly equivalent. */
export default function IncomeCard({ income, onEdit, onDelete, busy }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{income.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {INCOME_TYPES[income.type] ?? 'Other'} · {FREQUENCIES[income.frequency]?.label ?? 'Monthly'} · {income.income_basis==='net'?'Net (take-home)':income.income_basis==='gross'?'Gross (before deductions)':'Basis not specified'}
          </p>
        </div>
        <div className="text-right">
          <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(income.amount)}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            ≈ {formatCurrency(monthlyFromFrequency(income.amount, income.frequency))}/mo
          </p>
        </div>
      </div>
      <div className="mt-3"><SourceChip source={income.source || 'Manual'} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(income)} disabled={busy}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit source
        </Button>
        <Button size="sm" variant="outline" className="text-danger-text hover:bg-danger-surface" onClick={() => onDelete(income)} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete source
        </Button>
      </div>
    </article>
  );
}