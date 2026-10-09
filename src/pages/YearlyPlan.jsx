import DestinationShell from '@/components/states/DestinationShell';

export default function YearlyPlan() {
  return (
    <DestinationShell
      title="Yearly Plan"
      subtitle="Projected income, spending, savings, and monthly trends."
      highlights={[
        'Calendar-month outlook separating past actuals from projections',
        'Trend comparisons for income, spending, and savings',
        'Assumptions shown alongside every projection',
      ]}
    />
  );
}