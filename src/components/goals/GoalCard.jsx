import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProgressBar from '@/components/finance/ProgressBar';
import StatusPill from '@/components/states/StatusPill';
import SourceChip from '@/components/states/SourceChip';
import { goalPace, goalRequiredMonthly } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/** One savings goal: progress, pace status (label + tone), and actions. */
export default function GoalCard({ goal, monthlyCapacity, onEdit, onDelete, onLogContribution, busy }) {
  const target = Number(goal.target_amount) || 0;
  const saved = Number(goal.saved_amount) || 0;
  const percent = target > 0 ? (saved / target) * 100 : 0;
  const pace = goalPace(goal, monthlyCapacity);
  const required = goalRequiredMonthly(goal);

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">{goal.name}</h3>
        <StatusPill tone={pace.tone}>{pace.label}</StatusPill>
      </div>
      <ProgressBar label={`Savings toward ${goal.name}`} className="mt-3" percent={percent} />
      <p className="mt-2 text-sm text-muted-foreground">
        <span className="tabular-nums text-foreground">{formatCurrency(saved)}</span> of{' '}
        <span className="tabular-nums text-foreground">{formatCurrency(target)}</span> · {Math.round(percent)}% saved
        {goal.target_date ? ` · by ${formatDate(goal.target_date)}` : ''}
      </p>
      {required !== null && (
        <p className="mt-1 text-sm text-muted-foreground">
          Needs <span className="tabular-nums text-foreground">{formatCurrency(required)}</span>/mo to stay on pace.
        </p>
      )}
      <div className="mt-3">
        <SourceChip source={goal.source || 'Manual'} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onLogContribution(goal)} disabled={busy}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Log contribution
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(goal)} disabled={busy}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit goal
        </Button>
        <Button size="sm" variant="outline" className="text-danger-text hover:bg-danger-surface" onClick={() => onDelete(goal)} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete goal
        </Button>
      </div>
    </article>
  );
}