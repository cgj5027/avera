import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import { round2 } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/** Monthly cash flow and savings capacity, with an explicit label beside the tone. */
export default function FinancialHealthCard({ monthlyIncome, monthlyExpenses }) {
  const net = round2(monthlyIncome - monthlyExpenses);
  const hasInputs = monthlyIncome > 0 || monthlyExpenses > 0;
  const tone = net > 0 ? 'success' : net < 0 ? 'danger' : 'neutral';
  const Icon = net > 0 ? TrendingUp : net < 0 ? TrendingDown : Scale;
  const label = !hasInputs ? 'No data yet' : net > 0 ? 'Monthly surplus' : net < 0 ? 'Monthly shortfall' : 'Balanced';

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-base font-semibold text-foreground">Financial health</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">
          {hasInputs ? formatCurrency(net) : '—'}
        </span>
        <StatusPill tone={tone} icon={Icon}>{label}</StatusPill>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasInputs
          ? 'Savings capacity is your monthly income after bills, budget limits, and property costs.'
          : 'Add income and expenses to see your monthly cash flow and savings capacity.'}
      </p>
    </section>
  );
}