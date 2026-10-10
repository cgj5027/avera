import { useEffect, useState } from 'react';
import { Check, ChevronDown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/utils/format';

/** Typical household spending categories with a starting monthly limit. */
const SUGGESTIONS = [
  { name: 'Mortgage', monthly_limit: 1600 },
  { name: 'Rent', monthly_limit: 1600 },
  { name: 'Groceries', monthly_limit: 600 },
  { name: 'Gas & Fuel', monthly_limit: 200 },
  { name: 'Car Payment', monthly_limit: 450 },
  { name: 'Car Insurance', monthly_limit: 150 },
  { name: 'Utilities', monthly_limit: 250 },
  { name: 'Phone & Internet', monthly_limit: 140 },
  { name: 'Dining Out', monthly_limit: 200 },
  { name: 'Healthcare', monthly_limit: 150 },
  { name: 'Home Insurance', monthly_limit: 120 },
  { name: 'Subscriptions', monthly_limit: 40 },
];

const DECLINED_KEY = 'avera-declined-budget-suggestions';

/**
 * Pre-suggested budget categories the user can confirm (added with the
 * suggested limit, editable afterwards) or decline. Declined suggestions
 * stay hidden on this device.
 */
export default function SuggestedBudgetCategories({ categories, busy, onConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const [declined, setDeclined] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DECLINED_KEY) ?? '[]');
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(DECLINED_KEY, JSON.stringify(declined));
    } catch {
      /* storage unavailable — suggestions simply reappear next visit */
    }
  }, [declined]);

  const existing = new Set(categories.map((c) => String(c.name ?? '').toLowerCase()));
  const suggestions = SUGGESTIONS.filter(
    (s) => !existing.has(s.name.toLowerCase()) && !declined.includes(s.name)
  );
  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="font-heading text-base font-semibold text-foreground">
        <Sparkles className="mr-2 inline h-4 w-4 text-clay" aria-hidden="true" />
        Typical budget categories
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Common household categories to get started — confirm the ones you'd like to track, or decline to hide them.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {(expanded ? suggestions : suggestions.slice(0, 4)).map((s) => (
          <li
            key={s.name}
            className="flex items-center gap-2 rounded-full border border-border bg-surface-subtle py-1.5 pl-3 pr-1.5"
          >
            <span className="text-sm font-medium text-foreground">{s.name}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(s.monthly_limit)}/mo</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onConfirm(s.name, s.monthly_limit)}
              disabled={busy}
              className="min-h-7 gap-1 rounded-full px-2 text-xs"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeclined((d) => [...d, s.name])}
              aria-label={`Decline ${s.name}`}
              className="min-h-7 w-7 rounded-full p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      {suggestions.length > 4 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 min-h-8"
        >
          {expanded ? 'Show fewer' : `Show all ${suggestions.length} suggestions`}
          <ChevronDown
            className={`ml-1 h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </Button>
      )}
    </section>
  );
}