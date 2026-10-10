import { cn } from '@/lib/utils';

/** Page header. Titles match the navigation labels (design system §17). */
export default function PageHeader({ title, subtitle, actions = undefined, className = '' }) {
  return (
    <header
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 max-w-2xl text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}