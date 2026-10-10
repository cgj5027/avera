import { CheckCircle2, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  success: 'bg-success-surface text-success',
  info: 'bg-info-surface text-info',
  warning: 'bg-warning-surface text-warning',
  danger: 'bg-danger-surface text-danger',
  approval: 'bg-approval-surface text-approval',
  neutral: 'bg-surface-subtle text-muted-foreground',
};

/**
 * Status pill pairing a semantic color with an icon and explicit text label —
 * color is never the sole indicator (design system §7).
 */
export default function StatusPill({ tone = 'neutral', icon = undefined, children, className = '' }) {
  const Icon = icon ?? ({ success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle }[tone] ?? Info);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-sm font-medium',
        TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
}