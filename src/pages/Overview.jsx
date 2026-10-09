import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import SummaryCard from '@/components/finance/SummaryCard';
import PeriodSelector from '@/components/overview/PeriodSelector';
import ChartPlaceholder from '@/components/overview/ChartPlaceholder';
import NextSteps from '@/components/overview/NextSteps';
import AskAveraDrawer from '@/components/askavera/AskAveraDrawer';
import { hasChosenMode } from '@/lib/mode';

/* Summary figures show "—" in Stage 0: no fabricated totals, ever. */
const SUMMARY = [
  { label: 'Available cash', note: 'Appears once accounts or balances are added.' },
  { label: 'Monthly income', note: 'Appears once income is added.' },
  { label: 'Monthly expenses', note: 'Appears once bills are added.' },
  { label: 'Projected remaining', note: 'Calculated after income and expenses exist.' },
  { label: 'Upcoming bills', note: 'Appears once bills with due dates are added.' },
];

export default function Overview() {
  const navigate = useNavigate();
  const launcherRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* First-run: route to the mode-entry screen before showing the shell. */
  useEffect(() => {
    if (!hasChosenMode()) navigate('/welcome', { replace: true });
  }, [navigate]);

  const handleDrawerChange = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Overview"
        subtitle="A calm view of your household money."
        actions={
          <>
            <PeriodSelector />
            <Button ref={launcherRef} onClick={() => setDrawerOpen(true)} className="min-h-11 rounded-xl px-4">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Ask Avera
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SUMMARY.map((card) => (
          <SummaryCard key={card.label} label={card.label} note={card.note} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPlaceholder />
        </div>
        <NextSteps />
      </div>
      <AskAveraDrawer open={drawerOpen} onOpenChange={handleDrawerChange} />
    </div>
  );
}