import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SourceChip from '@/components/states/SourceChip';
import { FREQUENCIES } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/**
 * Recurring charges detected in the linked test-bank transactions, offered as
 * tracked bills. Adding one saves a Bill the user can later edit or delete.
 */
export default function SuggestedBills({ candidates, busy, onAdd }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">Suggested bills from your linked accounts</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Recurring charges detected in your linked test-bank transactions. Adding one creates a bill you can edit or delete later.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {candidates.map((candidate) => (
          <li key={candidate.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="text-base font-medium text-foreground">{candidate.name}</p>
              <p className="text-sm text-muted-foreground">
                {candidate.category} · {FREQUENCIES[candidate.frequency]?.label ?? 'Monthly'} · seen in {candidate.months_seen} month
                {candidate.months_seen === 1 ? '' : 's'} · last charged {formatDate(candidate.last_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                  {formatCurrency(candidate.amount)}
                </span>
                <SourceChip source="Plaid Sandbox" />
              </span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAdd(candidate)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add bill
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}