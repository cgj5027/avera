import { Inbox } from 'lucide-react';

/** Designed empty state (design system §18: every analytic card needs one). */
export default function EmptyState({ icon: Icon = Inbox, heading, description, action = undefined }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-selected">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h2 className="mt-4 font-heading text-lg font-semibold text-foreground">{heading}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}