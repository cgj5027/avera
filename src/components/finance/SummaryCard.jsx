import SourceChip from '@/components/states/SourceChip';

/**
 * Summary card primitive for dashboard figures. Financial values use
 * tabular numerals and always carry a data-origin label.
 */
export default function SummaryCard({ label, value = '—', source = 'Manual', note = undefined, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}>
      <dl>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
        <span className="font-heading text-2xl font-semibold tabular-nums text-foreground [overflow-wrap:anywhere]">{value}</span>
        <SourceChip source={source} />
      </dd>
      </dl>
      {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}