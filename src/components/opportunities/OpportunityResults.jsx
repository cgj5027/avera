import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import SourceChip from '@/components/states/SourceChip';
import { searchOpportunities } from '@/services/assistantService';
import { jobTypeLabel } from './jobTypes';

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

/** Maps a server-side match score to a clearly labeled fit tier. */
function fitTier(score) {
  if (score >= 4) return { label: 'Strong fit', tone: 'success' };
  if (score >= 2) return { label: 'Good fit', tone: 'info' };
  return { label: 'Possible fit', tone: 'neutral' };
}

function OpportunityItem({ item }) {
  const roleType = jobTypeLabel(item.employment_type);

  return (
    <li className="break-words rounded-2xl border border-border bg-surface-subtle p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {item.publisher && <SourceChip source={item.publisher} />}
            {typeof item.match_score === 'number' && (
              <StatusPill tone={fitTier(item.match_score).tone}>
                {fitTier(item.match_score).label}
              </StatusPill>
            )}
            <p className="font-heading text-base font-semibold text-foreground">{item.title}</p>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {item.company}
            {item.location ? ` · ${item.location}` : ''}
            {item.posted_at ? ` · Posted ${item.posted_at}` : ''}
          </p>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-base text-primary transition-colors duration-200 hover:bg-surface-subtle"
          >
            View source listing
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
      <p className="mt-2 break-all text-sm text-muted-foreground">Source: {new URL(item.url).hostname} · Posting availability and freshness not verified</p>
      {item.match_reasons?.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {item.match_reasons.map((reason, i) => (
            <li key={i} className="rounded-lg bg-surface-selected px-2.5 py-1 text-sm text-foreground">
              {reason}
            </li>
          ))}
        </ul>
      )}
      {(item.compensation || roleType) && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {item.compensation && (
            <div>
              <dt className="text-muted-foreground">Pay range</dt>
              <dd className="mt-0.5 font-medium tabular-nums text-foreground">{item.compensation}</dd>
            </div>
          )}
          {roleType && (
            <div>
              <dt className="text-muted-foreground">Role type</dt>
              <dd className="mt-0.5 font-medium text-foreground">{roleType}</dd>
            </div>
          )}
        </dl>
      )}
    </li>
  );
}

/**
 * Income-opportunity results. Calls the searchJobOpportunities backend
 * function; when the external jobs service is not configured (or fails) it
 * shows a transparent unavailable state plus clearly labeled demonstration
 * listings — never fabricated listings presented as live postings.
 */
export default function OpportunityResults({ profile }) {
  const [status, setStatus] = useState('idle'); // idle | loading | live | none | unavailable
  const [items, setItems] = useState([]);

  const search = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const opportunities = await searchOpportunities(profile);
      setItems(opportunities);
      setStatus(opportunities.length === 0 ? 'none' : 'live');
    } catch {
      setItems([]);
      setStatus('unavailable');
    }
  };

  return (
    <div className="mt-6" aria-live="polite" aria-busy={status === 'loading'}>
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
        {status === 'live' && <StatusPill tone="success">Source-linked results</StatusPill>}
        {status === 'unavailable' && <StatusPill tone="warning">Not connected</StatusPill>}
        {status === 'none' && <StatusPill tone="neutral">No matches found</StatusPill>}
      </div>

      {status === 'unavailable' && (
        <div className="mt-4 rounded-2xl border border-border bg-info-surface p-4">
          <StatusPill tone="info">Demonstration listings</StatusPill>
          <p className="mt-2 text-base text-info">
            Job search could not be completed or its results could not be validated. The service may be unavailable or unconfigured. The listings below are clearly labeled samples for layout only and are never presented as live
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
              <OpportunityItem key={item.url ?? i} item={item} />
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Listings are ranked by how well each one fits your profile — preferred roles, role type, and experience level (results that clearly do not match your experience level or role type are excluded).{' '}
            Pay ranges appear only when the posting lists one and are shown as advertised, before taxes and deductions. Postings come from public web search; coverage is not exhaustive and availability is not verified.
          </p>
        </>
      )}

      {status === 'none' && (
        <p className="mt-4 text-base text-muted-foreground">
          The search returned no matches for this profile. Try broadening your skills, roles, or
          location.
        </p>
      )}
    </div>
  );
}