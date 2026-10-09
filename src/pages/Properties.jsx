import DestinationShell from '@/components/states/DestinationShell';

export default function Properties() {
  return (
    <DestinationShell
      title="Properties"
      subtitle="Property values, liabilities, equity, and monthly ownership costs."
      highlights={[
        'Property cards with nickname, type, estimate source, and date',
        'Calculated equity: estimated value minus outstanding debt',
        'Editable valuation overrides with clear origin',
      ]}
    />
  );
}