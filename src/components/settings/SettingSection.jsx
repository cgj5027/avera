import { cn } from '@/lib/utils';

/** Grouped settings section: porcelain card, clear title, supporting copy. */
export default function SettingSection({ title, description, children, className = '' }) {
  return (
    <section className={cn('rounded-2xl border border-border bg-surface p-5 sm:p-6', className)}>
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 text-base text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}