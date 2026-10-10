import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import { billStatus } from '@/services/financialCalculations';
import { formatCurrency, formatDate } from '@/utils/format';

/** Bills due in the next 30 days, soonest first. */
export default function UpcomingBillsList({ bills }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold text-foreground">Due in the next 30 days</h2>
        <Link to="/bills-budget" className="flex items-center text-sm font-medium text-primary underline-offset-2 hover:underline">
          Manage bills <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {bills.length === 0 ? (
        <p className="mt-3 text-base text-muted-foreground">No unpaid bills due in the next 30 days.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {bills.map((bill) => {
            const status = billStatus(bill);
            return (
              <li key={bill.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  <span className="text-base font-medium text-foreground">{bill.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Due {formatDate(bill.next_due_date)}</span>
                  <span className="font-heading text-base font-semibold tabular-nums text-foreground">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}