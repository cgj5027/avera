import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Designed error state: calm, recoverable, never a full-page alarm. */
export default function ErrorState({ heading = 'Something went wrong', message, onRetry }) {
  return (
    <div className="rounded-2xl border border-border bg-danger-surface p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface">
        <AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-heading text-lg font-semibold text-danger">{heading}</h2>
      {message && <p className="mx-auto mt-2 max-w-md text-base text-foreground">{message}</p>}
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" className="min-h-11 rounded-xl px-4" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}