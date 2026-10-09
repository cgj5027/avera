import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const STEPS = [
  { label: 'Explore Demo Mode', path: '/welcome' },
  { label: 'Add your first bill', path: '/bills-budget' },
  { label: 'Create a savings goal', path: '/goals-opportunities' },
  { label: 'Connect a test bank', path: '/settings' },
];

/** Suggested next steps, each routing one step deeper. */
export default function NextSteps() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="font-heading text-base font-semibold text-foreground">Suggested next steps</h2>
      <ul className="mt-3">
        {STEPS.map((step) => (
          <li key={step.path}>
            <Link
              to={step.path}
              className="flex min-h-11 items-center justify-between rounded-xl px-3 text-base text-foreground transition-colors duration-200 hover:bg-surface-subtle"
            >
              {step.label}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}