import { Info, Link2, PencilLine } from 'lucide-react';
import { getDataMode, modeLabel } from '@/lib/mode';
import { cn } from '@/lib/utils';

const ICONS = { demo: Info, sandbox: Link2, manual: PencilLine };

/**
 * Persistent, neutral-tint data-mode indicator (design system §21):
 * "Demo data", "Plaid Sandbox — Test account", or "Manual".
 */
export default function ModeIndicator({ variant = 'inline', className }) {
  const mode = getDataMode();
  if (!mode) return null;
  const Icon = ICONS[mode] ?? Info;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-sm',
        variant === 'sidebar' ? 'bg-white/10 text-white/90' : 'border border-border bg-surface-subtle text-muted-foreground',
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {modeLabel(mode)}
    </span>
  );
}