import { Pencil, Trash2, CircleDollarSign, ArrowRight, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgressBar from '@/components/finance/ProgressBar';
import StatusPill from '@/components/states/StatusPill';
import SourceChip from '@/components/states/SourceChip';
import { formatCurrency } from '@/utils/format';

/** One budget category: limit, spent this month, remaining, progress with text label. */
export default function CategoryCard({ category, spent, onEdit, onDelete, onLogSpending, onViewTransactions, transactionCount = 0, busy }) {
  const limit = Number(category.monthly_limit) || 0;
  const remaining = limit - spent;
  const percent = limit > 0 ? (spent / limit) * 100 : spent > 0 ? 100 : 0;
  const tone = percent >= 100 ? 'danger' : percent >= 85 ? 'warning' : 'primary';

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">{category.name}</h3>
        <p className="font-heading text-base font-semibold tabular-nums text-foreground">
          {formatCurrency(limit)}
          <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>
        </p>
      </div>
      <ProgressBar label={`${category.name} budget used`} className="mt-3" percent={percent} tone={tone} />
      <p className="mt-2 text-sm text-muted-foreground">
        Spent <span className="tabular-nums text-foreground">{formatCurrency(spent)}</span> of {formatCurrency(limit)} ·{' '}
        {Math.round(percent)}% of limit used ·{' '}
        {remaining >= 0 ? (
          <span className="tabular-nums text-success-text">{formatCurrency(remaining)} remaining</span>
        ) : (
          <span className="tabular-nums text-danger-text">{formatCurrency(-remaining)} over</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SourceChip source="Manual" />
        {remaining < 0 && <StatusPill tone="danger" icon={CircleDollarSign}>Over limit</StatusPill>}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onViewTransactions(category)} disabled={busy}>
          <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
          View transactions{transactionCount > 0 ? ` (${transactionCount})` : ''}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onLogSpending(category)} disabled={busy}>
          <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
          Log spending
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(category)} disabled={busy}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit category
        </Button>
        <Button size="sm" variant="outline" className="text-danger-text hover:bg-danger-surface" onClick={() => onDelete(category)} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete category
        </Button>
      </div>
    </article>
  );
}