import DestinationShell from '@/components/states/DestinationShell';

export default function GoalsOpportunities() {
  return (
    <DestinationShell
      title="Goals & Opportunities"
      subtitle="Savings goals, the income-gap calculator, and optional work discovery."
      highlights={[
        'Goal cards with target, saved amount, deadline, and pace',
        'Income-gap breakdown: goal, deadline, savings, net shortfall',
        'Optional job and gig discovery with real sources — never fabricated',
      ]}
    />
  );
}