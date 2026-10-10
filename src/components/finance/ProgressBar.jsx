import { cn } from '@/lib/utils';

const TONES = { primary: 'bg-primary', warning: 'bg-chart-5', danger: 'bg-danger' };

/** Progress bar. The percent is always shown as text beside it — never color-only. */
export default function ProgressBar({ percent, tone = 'primary', className }) {
  const width = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-subtle', className)}
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-300', TONES[tone] ?? TONES.primary)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}