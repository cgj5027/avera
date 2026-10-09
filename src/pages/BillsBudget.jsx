import DestinationShell from '@/components/states/DestinationShell';

export default function BillsBudget() {
  return (
    <DestinationShell
      title="Bills & Budget"
      subtitle="Due dates, recurring bills, and category budgets."
      highlights={[
        'Upcoming bills with amount, due date, status, and recurrence',
        'Budget categories showing spent, limit, and remaining',
        'Manual entry, Plaid Sandbox test accounts, and Sample data modes',
      ]}
    />
  );
}