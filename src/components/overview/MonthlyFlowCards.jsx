/**
 * Overview middle row: three cards for monthly income, recurring expenses,
 * and additional (non-recurring) expenses. The income and recurring cards
 * pair the projected figure with the tracked activity for the current month.
 */
function FlowCard({ title, projected, tracked }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-3">
        <p className="text-sm text-muted-foreground">{projected.label}</p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground [overflow-wrap:anywhere]">{projected.value}</p>
        {projected.note && <p className="mt-1 text-sm text-muted-foreground">{projected.note}</p>}
      </div>
      {tracked && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">{tracked.label}</p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground [overflow-wrap:anywhere]">{tracked.value}</p>
          {tracked.note && <p className="mt-1 text-sm text-muted-foreground">{tracked.note}</p>}
        </div>
      )}
    </section>
  );
}

export default function MonthlyFlowCards({ flow }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FlowCard title="Income" projected={flow.income.projected} tracked={flow.income.tracked} />
      <FlowCard title="Recurring expenses" projected={flow.recurring.projected} tracked={flow.recurring.tracked} />
      <FlowCard title="Additional expenses" projected={flow.additional.projected} />
    </div>
  );
}