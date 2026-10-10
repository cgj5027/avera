import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import SourceChip from '@/components/states/SourceChip';
import { FREQUENCIES } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/**
 * Recurring charges detected in the linked test-bank transactions, offered as
 * tracked bills. Selecting a suggestion reveals its "Add bill" action; adding
 * one saves a Bill the user can later edit or delete.
 */
export default function SuggestedBills({ candidates, busy, onAdd }) {
  const [selectedName, setSelectedName] = useState(null);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">Suggested bills from your linked accounts</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Recurring charges detected in your linked test-bank transactions. Select one to reveal the Add bill action.
        </p>
      </div>
      <ul className="mt-4 divide-y divide-border">
        {candidates.map((candidate) => {
          const isSelected = selectedName === candidate.name;
          return (
            <li key={candidate.name} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`suggested-bill-${candidate.name}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => setSelectedName(checked ? candidate.name : null)}
                  disabled={busy}
                  aria-label={`Select ${candidate.name}`}
                />
                <div>
                  <Label
                    htmlFor={`suggested-bill-${candidate.name}`}
                    className="text-base font-medium text-foreground"
                  >
                    {candidate.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {candidate.category} · {FREQUENCIES[candidate.frequency]?.label ?? 'Monthly'} · seen in {candidate.months_seen} month
                    {candidate.months_seen === 1 ? '' : 's'} · last charged {formatDate(candidate.last_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(candidate.amount)}
                  </span>
                  <SourceChip source="Plaid Sandbox" />
                </span>
                {isSelected && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setSelectedName(null);
                      onAdd(candidate);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Add bill
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}