import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SourceChip from '@/components/states/SourceChip';
import { FREQUENCIES } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/**
 * Income transactions (linked or manually added) offered as possible income
 * sources. Adding one projects its annual earnings with AI before saving.
 */
export default function PossibleIncomeSources({ candidates, busy, onAdd }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">Possible income sources from your transactions</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Recurring deposits detected in your linked and manually entered transactions — one-off deposits are excluded. Adding one projects its annual earnings with Avera AI, and you can adjust the figures before saving.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {candidates.map((candidate) => (
          <li key={candidate.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <p className="text-base font-medium text-foreground">{candidate.name}</p>
              <p className="text-sm text-muted-foreground">
                {FREQUENCIES[candidate.frequency]?.label ?? 'Monthly'} cadence · {candidate.occurrences} deposit
                {candidate.occurrences === 1 ? '' : 's'} across {candidate.months_seen} month
                {candidate.months_seen === 1 ? '' : 's'} · last seen {formatDate(candidate.last_date)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                  {formatCurrency(candidate.amount)}
                </span>
                <SourceChip source={candidate.source} />
              </span>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAdd(candidate)}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add as income source
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}