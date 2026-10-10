import InfoHint from '@/components/states/InfoHint';

/**
 * Overview middle row: three cards for monthly income, recurring expenses,
 * and additional (non-recurring) expenses. Each card has a concise
 * subheading; longer explanations live in hover info icons. The income and
 * recurring cards pair the projected figure with the tracked month activity.
 */
function FlowCard({ title, subtitle, projected, tracked = undefined }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div>
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-3">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {projected.label ?? 'Expected monthly'}
          <InfoHint text={projected.note} />
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground [overflow-wrap:anywhere]">{projected.value}</p>
      </div>
      {tracked && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {tracked.label ?? 'Tracked this month'}
            <InfoHint text={tracked.note} />
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-foreground [overflow-wrap:anywhere]">{tracked.value}</p>
        </div>
      )}
    </section>
  );
}

export default function MonthlyFlowCards({ flow }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <FlowCard title="Income" subtitle="What you earn per month" projected={flow.income.projected} tracked={flow.income.tracked} />
      <FlowCard title="Recurring expenses" subtitle="Bills and fixed obligations" projected={flow.recurring.projected} tracked={flow.recurring.tracked} />
      <FlowCard title="Additional expenses" subtitle="Everything else this month" projected={flow.additional.projected} />
    </div>
  );
}