import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

const STATES = [
  { id: 'empty', label: 'Empty' },
  { id: 'loading', label: 'Loading' },
  { id: 'error', label: 'Error' },
];

/**
 * Shell for the six destinations in Stage 0: designed empty, loading, and
 * error states with zero data logic. The preview control lets reviewers
 * see each designed state; it disappears once real data services arrive.
 */
export default function DestinationShell({ title, subtitle, intro, highlights }) {
  const [state, setState] = useState('empty');

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
            <span className="hidden px-2 text-sm text-muted-foreground sm:inline">Preview</span>
            {STATES.map((s) => (
              <button
                key={s.id}
                onClick={() => setState(s.id)}
                aria-pressed={state === s.id}
                className={cn(
                  'min-h-9 rounded-lg px-3 text-sm transition-colors duration-200',
                  state === s.id
                    ? 'bg-surface-selected font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />
      {intro && <p className="mt-1 max-w-2xl text-base text-muted-foreground">{intro}</p>}
      <div className="mt-6 space-y-6">
        {state === 'empty' && (
          <>
            <EmptyState
              heading={`${title} is ready for your data`}
              description="This destination is a designed shell in Stage 0. Your information will live here once financial data services are connected."
            />
            {highlights && (
              <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <h2 className="font-heading text-base font-semibold text-foreground">
                  What you will find here
                </h2>
                <ul className="mt-3 space-y-2">
                  {highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-base text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {state === 'loading' && <LoadingState label={`Loading ${title}`} />}
        {state === 'error' && (
          <ErrorState
            message={`We couldn't load ${title}. Your data is safe — try again.`}
            onRetry={() => setState('empty')}
          />
        )}
      </div>
    </div>
  );
}