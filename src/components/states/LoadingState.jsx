import { Loader2 } from 'lucide-react';

/** Designed loading state: visible text label plus calm skeleton rows. */
export default function LoadingState({ label = 'Loading' }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <p className="text-base font-medium text-foreground">{label}…</p>
      </div>
      <div className="mt-6 space-y-3" aria-hidden="true">
        <div className="h-4 w-1/3 animate-pulse rounded-full bg-surface-subtle" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-subtle" />
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-surface-subtle" />
      </div>
    </div>
  );
}