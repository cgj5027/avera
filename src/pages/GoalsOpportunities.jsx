import { useEffect, useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import GoalCard from '@/components/goals/GoalCard';
import GoalDialog from '@/components/goals/GoalDialog';
import GoalContributionDialog from '@/components/goals/GoalContributionDialog';
import IncomeGapPanel from '@/components/goals/IncomeGapPanel';
import { base44 } from '@/api/base44Client';
import { createRecord, updateRecord, deleteRecord } from '@/services/dataService';
import * as calc from '@/services/financialCalculations';
import { round2 } from '@/services/financialCalculations';

/** Goals & Opportunities: savings goals with pace, plus the income-gap calculator. */
export default function GoalsOpportunities() {
  const [goals, setGoals] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [goalDialog, setGoalDialog] = useState({ open: false, goal: null });
  const [contribution, setContribution] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      base44.entities.Goal.filter({}),
      base44.entities.IncomeSource.filter({}),
      base44.entities.Bill.filter({}),
      base44.entities.BudgetCategory.filter({}),
      base44.entities.Property.filter({}),
      base44.entities.MortgageRecord.filter({}),
    ])
      .then(([g, incomes, bills, budgetCategories, properties, mortgages]) => {
        if (!cancelled) {
          setGoals(g);
          setInputs({ incomes, bills, budgetCategories, properties, mortgages });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      if (message) toast({ title: message });
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState message="We couldn't load your goals. Your data is safe — try again." onRetry={reload} />
      </div>
    );
  }
  if (!goals || !inputs) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <LoadingState label="Loading Goals & Opportunities" />
      </div>
    );
  }

  const monthlyIncome = calc.monthlyIncomeTotal(inputs.incomes);
  const monthlyExpenses = calc.totalMonthlyExpenses(inputs);
  const monthlyCapacity = round2(monthlyIncome - monthlyExpenses);

  const saveGoal = (payload) =>
    run(
      () => (goalDialog.goal ? updateRecord('goal', goalDialog.goal.id, payload) : createRecord('goal', payload)),
      goalDialog.goal ? 'Goal updated' : 'Goal added'
    );

  const applyContribution = (amount) =>
    run(
      () =>
        updateRecord('goal', contribution.id, {
          saved_amount: round2((Number(contribution.saved_amount) || 0) + amount),
        }),
      'Contribution logged'
    ).then(() => setContribution(null));

  const confirmDelete = async () => {
    if (!deleteGoal) return;
    await run(() => deleteRecord('goal', deleteGoal.id), 'Goal deleted');
    setDeleteGoal(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Goals & Opportunities"
        subtitle="Savings goals, the income-gap calculator, and optional work discovery."
        actions={
          <Button onClick={() => setGoalDialog({ open: true, goal: null })} className="min-h-11 rounded-xl px-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add goal
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {goals.length === 0 ? (
          <EmptyState
            heading="No savings goals yet"
            description="Set a target, what you have saved, and an optional deadline. Avera shows your pace against your real monthly savings capacity — never a guess."
          />
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              monthlyCapacity={monthlyCapacity}
              busy={busy}
              onEdit={(g) => setGoalDialog({ open: true, goal: g })}
              onDelete={setDeleteGoal}
              onLogContribution={setContribution}
            />
          ))
        )}
      </div>

      <div className="mt-6">
        <IncomeGapPanel goals={goals} monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-heading text-base font-semibold text-foreground">Opportunities</h2>
        </div>
        <p className="mt-2 text-base text-muted-foreground">
          Job and gig discovery arrives in a later stage and will show only real, sourced listings — never fabricated ones.
        </p>
      </section>

      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog((d) => ({ ...d, open }))}
        goal={goalDialog.goal}
        onSave={saveGoal}
      />
      {contribution && (
        <GoalContributionDialog
          open
          onOpenChange={(open) => {
            if (!open) setContribution(null);
          }}
          goal={contribution}
          onSave={applyContribution}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteGoal)}
        onOpenChange={(open) => {
          if (!open) setDeleteGoal(null);
        }}
        title={`Delete ${deleteGoal?.name ?? 'goal'}?`}
        description="This removes the goal and its progress. This cannot be undone."
        onConfirm={confirmDelete}
        busy={busy}
      />
    </div>
  );
}