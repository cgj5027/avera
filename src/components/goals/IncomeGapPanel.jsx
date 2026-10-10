import { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import EmptyState from '@/components/states/EmptyState';
import SourceChip from '@/components/states/SourceChip';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateIncomeGapAllocated, goalMonthsRemaining } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/**
 * Income-gap breakdown for one goal: required monthly contribution vs. the
 * household's available monthly savings capacity.
 */
export default function IncomeGapPanel({ goals, monthlyIncome, monthlyExpenses }) {
  const [selectedId, setSelectedId] = useState('');
  if (goals.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="font-heading text-base font-semibold text-foreground">Income gap</h2>
        <div className="mt-3">
          <EmptyState
            heading="Add a goal to calculate your income gap"
            description="The gap compares what a goal needs each month with the savings capacity your income leaves over."
          />
        </div>
      </section>
    );
  }

  const goal = goals.find((g) => g.id === selectedId) ?? goals[0];
  const gap = calculateIncomeGapAllocated(goal, goals, { monthlyIncome, monthlyExpenses });
  const months = goalMonthsRemaining(goal.target_date);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-base font-semibold text-foreground">Income gap</h2>
      <p className="mt-1 text-base text-muted-foreground">
        What one goal needs each month versus what your income leaves over.
      </p>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="gap-goal">Goal</Label>
        <Select value={goal.id} onValueChange={setSelectedId}>
          <SelectTrigger id="gap-goal" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {goals.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3"><SourceChip source="Projected" /></div>
      {!gap && <p role="status" className="mt-4 text-base text-muted-foreground">A valid deadline and valid financial amounts are needed to calculate the monthly income gap. Review this goal and other dated goals.</p>}
      {months === 0 && <p role="status" className="mt-3 text-base text-muted-foreground">The deadline has passed or is today. The calculation shows the remaining amount over one month; it cannot meet the original deadline.</p>}
      {gap && (
        <dl className="mt-4 grid gap-3 text-base sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Target by {goal.target_date ? formatDate(goal.target_date) : 'no deadline'}</dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(goal.target_amount)}
              {months !== null ? ` · ${months} month${months === 1 ? '' : 's'} left` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Already saved</dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(goal.saved_amount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Required monthly</dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(gap.required)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Monthly savings capacity</dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">{formatCurrency(gap.capacity)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              After other goals reserve {formatCurrency(gap.otherReserve)}/mo
            </dt>
            <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(gap.allocatedCapacity)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Result</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              {gap.shortfall > 0 ? (
                <>
                  <StatusPill tone="danger" icon={CircleDollarSign}>Monthly shortfall</StatusPill>
                  <span className="tabular-nums text-foreground">{formatCurrency(gap.shortfall)}/mo additional take-home income needed after other goals</span>
                </>
              ) : (
                <>
                  <StatusPill tone="success" icon={CircleDollarSign}>Covered</StatusPill>
                  <span className="tabular-nums text-foreground">{formatCurrency(gap.surplus)}/mo of capacity remains after other goals</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      )}
      <div className="mt-4 rounded-xl bg-surface-subtle p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">How this is calculated</p>
        <p className="mt-1">
          Required monthly = (Target − Saved) ÷ months to deadline. Savings capacity = monthly income − bills − budget
          limits − property costs. Capacity after reservations = capacity − the required monthly of every other goal.
        </p>
        <p className="mt-1">
          Assumptions: every figure comes from your saved records (Manual); pay and bill frequencies are amortized to
          monthly; a goal without a deadline reserves nothing; enter take-home income to estimate a net gap — saved income has no gross/net classification; property equity is not counted as income.
        </p>
      </div>
    </section>
  );
}