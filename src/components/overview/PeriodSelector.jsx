import { useState } from 'react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

/** Period selector with a persistent visible label (design system §22). */
export default function PeriodSelector({ className = '' }) {
  const [period, setPeriod] = useState('month');
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="hidden text-base text-muted-foreground sm:inline">Period</span>
      <div className="flex rounded-xl border border-border bg-surface p-1" role="group" aria-label="Period">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            onClick={() => setPeriod(o.id)}
            aria-pressed={period === o.id}
            className={cn(
              'min-h-10 rounded-lg px-3 text-sm transition-colors duration-200',
              period === o.id
                ? 'bg-surface-selected font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}