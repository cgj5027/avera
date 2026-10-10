import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/states/EmptyState';
import GoalCard from './GoalCard';
import GoalDialog from './GoalDialog';
import GoalContributionDialog from './GoalContributionDialog';
import IncomeGapPanel from './IncomeGapPanel';
import { round2 } from '@/services/financialCalculations';

/** Goals tab content: savings goals with pace, plus the income-gap calculator. */
export default function GoalsSection({ goals, monthlyIncome, monthlyExpenses, busy, onSaveGoal, onApplyContribution, onDelete }) {
  const [goalDialog, setGoalDialog] = useState({ open: false, goal: null });
  const [contribution, setContribution] = useState(null);
  const monthlyCapacity = round2(monthlyIncome - monthlyExpenses);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setGoalDialog({ open: true, goal: null })} className="min-h-11 rounded-xl px-4">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add goal
        </Button>
      </div>
      <p className="text-base text-muted-foreground">Goal cards compare each goal independently. The income gap breakdown below also reserves the monthly requirements of other dated goals.</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {goals.length === 0 ? (
          <EmptyState
            heading="No savings goals yet"
            description="Set a target, what you have saved, and an optional deadline. Avera shows your pace against your recorded planning capacity."
          />
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              monthlyCapacity={monthlyCapacity}
              busy={busy}
              onEdit={(g) => setGoalDialog({ open: true, goal: g })}
              onDelete={onDelete}
              onLogContribution={setContribution}
            />
          ))
        )}
      </div>

      <IncomeGapPanel goals={goals} monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />

      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog((d) => ({ ...d, open }))}
        goal={goalDialog.goal}
        onSave={(payload) => onSaveGoal(goalDialog.goal, payload)}
      />
      {/* Mounted even when closed so a dismissed draft survives reopening. */}
      <GoalContributionDialog
        open={Boolean(contribution)}
        onOpenChange={(open) => {
          if (!open) setContribution(null);
        }}
        goal={contribution}
        onSave={(amount, requestId) => onApplyContribution(contribution.id, amount, requestId)}
      />
    </div>
  );
}