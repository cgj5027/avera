import SourceChip from '@/components/states/SourceChip';
import { Pencil, Trash2, CheckCircle2, Repeat, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import { billStatus, FREQUENCIES } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/** One recurring bill: status pill (label + tone), schedule, reminder, and actions. */
export default function BillCard({ bill, onEdit, onDelete, onMarkPaid, busy }) {
  const status = billStatus(bill);
  return (
    <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-foreground">{bill.name}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{bill.category || 'Uncategorized'}</p>
        </div>
        <p className="font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(bill.amount)}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Repeat className="h-4 w-4" aria-hidden="true" />
          {FREQUENCIES[bill.frequency]?.label ?? 'Monthly'}
        </span>
        <span className="text-sm text-muted-foreground">Next due {formatDate(bill.next_due_date)}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Bell className="h-4 w-4" aria-hidden="true" />
          Reminder {bill.reminder_days ?? 3} days before
        </span>
      </div>
      <div className="mt-3"><SourceChip source="Manual" /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {status.key !== 'paid' && (
          <Button size="sm" variant="outline" onClick={() => { void onMarkPaid(bill).catch(() => {}); }} disabled={busy}>
            <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Mark paid
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(bill)} disabled={busy}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit bill
        </Button>
        <Button size="sm" variant="outline" className="text-danger-text hover:bg-danger-surface" onClick={() => onDelete(bill)} disabled={busy}>
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete bill
        </Button>
      </div>
    </article>
  );
}