/**
 * Income-versus-spending chart placeholder. Uses the ordered chart palette
 * for its legend; the real chart arrives with data services (Stage 1+).
 */
export default function ChartPlaceholder() {
  const legend = [
    { label: 'Income', className: 'bg-chart-1' },
    { label: 'Spending', className: 'bg-chart-2' },
  ];
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-foreground">Income versus spending</h2>
        <div className="flex items-center gap-4" aria-hidden="true">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className={`h-3 w-3 rounded-sm ${l.className}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-subtle p-6 text-center">
        <p className="max-w-xs text-base text-muted-foreground">
          This chart appears once income and bills are added. Monthly values with a comparison legend, never color-only.
        </p>
      </div>
    </section>
  );
}