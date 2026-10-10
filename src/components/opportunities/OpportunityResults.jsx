import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import SourceChip from '@/components/states/SourceChip';
import { base44 } from '@/api/base44Client';
import { formatCurrency } from '@/utils/format';
import { estimatedTakeHomeMonthly, coversTargetPercent, parseHourlyRate } from '@/services/opportunityCalculations';

/**
 * Clearly labeled demonstration listings shown only when the external jobs
 * service is not configured or fails. Never presented as live postings.
 */
const SAMPLE_OPPORTUNITIES = [
  {
    title: 'Sample: Weekend bookkeeping help',
    company: 'Sample listing',
    location: 'Remote (sample)',
    compensation: '$25/hr',
    url: null,
  },
  {
    title: 'Sample: Evening math tutoring',
    company: 'Sample listing',
    location: 'Local (sample)',
    compensation: '$30/hr',
    url: null,
  },
  {
    title: 'Sample: Delivery shift gig',
    company: 'Sample listing',
    location: 'Local (sample)',
    compensation: '$20/hr',
    url: null,
  },
];

function OpportunityItem({ item, profile }) {
  const hours = Number(profile?.weekly_hours) || 0;
  const monthlyTakeHome = estimatedTakeHomeMonthly(
    item.hourly_rate ?? parseHourlyRate(item.compensation),
    hours
  );
  const target = Number(profile?.target_monthly_income) || 0;
  const covers = coversTargetPercent(monthlyTakeHome, target);

  return (
    <li className="rounded-xl border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-heading text-base font-semibold text-foreground">{item.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.company}
            {item.location ? ` · ${item.location}` : ''}
          </p>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-primary transition-colors duration-200 hover:bg-surface-subtle"
          >
            View source listing
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Advertised compensation (gross)</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">{item.compensation ?? '—'}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-muted-foreground">
            Estimated take-home, {hours || '—'} hrs/wk <SourceChip source="Estimated" />
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums text-foreground">
            {monthlyTakeHome !== null ? `${formatCurrency(monthlyTakeHome)}/mo` : '—'}
          </dd>
        </div>
      </dl>
      {covers !== null && target > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          At this pace it would cover about {covers}% of your {formatCurrency(target)}/mo additional-income target.
        </p>
      )}
    </li>
  );
}

/**
 * Income-opportunity results. Calls the searchJobOpportunities backend
 * function; when the external jobs API is not configured (or fails) it shows a
 * transparent unavailable state plus clearly labeled demonstration listings —
 * never fabricated listings presented as live postings.
 */
export default function OpportunityResults({ profile }) {
  const [status, setStatus] = useState('idle'); // idle | loading | live | none | unavailable
  const [items, setItems] = useState([]);

  const search = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const res = await base44.functions.invoke('searchJobOpportunities', {
        skills: profile?.skills ?? '',
        preferred_roles: profile?.preferred_roles ?? '',
        work_mode: profile?.work_mode ?? 'any',
        location: profile?.location ?? '',
        weekly_hours: Number(profile?.weekly_hours) || 0,
        target_monthly_income: Number(profile?.target_monthly_income) || 0,
      });
      const opportunities = Array.isArray(res.data?.opportunities) ? res.data.opportunities : [];
      setItems(opportunities);
      setStatus(opportunities.length === 0 ? 'none' : 'live');
    } catch {
      setItems([]);
      setStatus('unavailable');
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={search} disabled={status === 'loading'} className="min-h-11 rounded-xl px-4">
          {status === 'loading' ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
                aria-hidden="true"
              />
              Searching
            </span>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Find opportunities
            </>
          )}
        </Button>
        {status === 'live' && <StatusPill tone="success">Live listings</StatusPill>}
        {status === 'unavailable' && <StatusPill tone="warning">Not connected</StatusPill>}
        {status === 'none' && <StatusPill tone="neutral">No matches found</StatusPill>}
      </div>

      {status === 'unavailable' && (
        <div className="mt-4 rounded-2xl border border-border bg-info-surface p-4">
          <StatusPill tone="info">Demonstration listings</StatusPill>
          <p className="mt-2 text-base text-foreground">
            Live job search is not connected yet — no external jobs service is configured, so nothing real was
            requested. The listings below are clearly labeled samples for layout only and are never presented as live
            postings.
          </p>
          <ul className="mt-4 space-y-3">
            {SAMPLE_OPPORTUNITIES.map((item) => (
              <li key={item.title} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceChip source="Sample data" />
                  <p className="font-heading text-base font-semibold text-foreground">{item.title}</p>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.company} · {item.location} · {item.compensation} — demonstration only, not a live posting.
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === 'live' && (
        <>
          <ul className="mt-4 space-y-3">
            {items.map((item, i) => (
              <OpportunityItem key={item.url ?? i} item={item} profile={profile} />
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Advertised compensation is gross pay before taxes and deductions. Estimated take-home applies a fixed 78%
            assumption — your actual take-home depends on your tax situation.
          </p>
        </>
      )}

      {status === 'none' && (
        <p className="mt-4 text-base text-muted-foreground">
          The connected jobs service returned no matches for this profile. Try broadening your skills, roles, or
          location.
        </p>
      )}
    </div>
  );
}