import { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import EmptyState from '@/components/states/EmptyState';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateIncomeGap, goalMonthsRemaining } from '@/services/financialCalculations';
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
  const gap = calculateIncomeGap(goal, { monthlyIncome, monthlyExpenses });
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
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Result</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              {gap.shortfall > 0 ? (
                <>
                  <StatusPill tone="danger" icon={CircleDollarSign}>Monthly shortfall</StatusPill>
                  <span className="tabular-nums text-foreground">{formatCurrency(gap.shortfall)}/mo extra income or budget room needed</span>
                </>
              ) : (
                <>
                  <StatusPill tone="success" icon={CircleDollarSign}>Covered</StatusPill>
                  <span className="tabular-nums text-foreground">{formatCurrency(gap.surplus)}/mo of capacity remains</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}