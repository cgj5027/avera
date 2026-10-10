import SourceChip from '@/components/states/SourceChip';
import InfoHint from '@/components/states/InfoHint';

/**
 * Summary card primitive for dashboard figures. Financial values use
 * tabular numerals and always carry a data-origin label. The `note` is a
 * concise subheading; a longer explanation goes in `hint` (info icon).
 */
export default function SummaryCard({ label, value = '—', source = null, note = undefined, hint = undefined, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      <dl>
      <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {label}
        <InfoHint text={hint} />
      </dt>
      <dd className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-heading text-[clamp(1.25rem,1.5vw,1.5rem)] font-semibold tabular-nums leading-tight text-foreground [overflow-wrap:anywhere]">{value}</span>
        {source != null && <SourceChip source={source} />}
      </dd>
      </dl>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}