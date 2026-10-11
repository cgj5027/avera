import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FlaskConical, PencilLine, ShieldCheck, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { setDataMode as setMode } from '@/lib/mode';
import { DEMO_PROFILES, DEMO_PROFILE_KEYS } from '@/services/demoProfiles';
import { loadDemoProfile } from '@/services/demoMode';

/**
 * Mode-entry onboarding (design system §21) with the Stage 3B Demo Mode
 * experience: Plaid Sandbox test-bank connection as a demo profile,
 * preconfigured demo profiles, or manual entry. The profile datasets are
 * Avera-owned sample data, always labeled as such.
 */
export default function ModeEntry() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(null); // 'plaid' | 'profiles' | null
  const [busyKey, setBusyKey] = useState(null); // `${profile}:${plaid ? 'plaid' : 'local'}`
  const [error, setError] = useState('');

  const startDemo = async (profileKey, viaPlaid) => {
    if (busyKey) return;
    setBusyKey(`${profileKey}:${viaPlaid ? 'plaid' : 'local'}`);
    setError('');
    setMode('demo');
    try {
      const result = await loadDemoProfile(profileKey, { viaPlaid });
      if (result.warning) toast({ title: 'Loaded sample data', description: result.warning });
      navigate('/');
    } catch {
      setError('Demo Mode could not be set up. Please try again.');
    } finally {
      setBusyKey(null);
    }
  };

  const expand = (which) => setExpanded((current) => (current === which ? null : which));

  const profileRow = (profileKey, viaPlaid) => {
    const profile = DEMO_PROFILES[profileKey];
    const busy = busyKey === `${profileKey}:${viaPlaid ? 'plaid' : 'local'}`;
    return (
      <div
        key={profileKey}
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-selected text-base font-semibold text-primary">
          {profile.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-base font-semibold text-foreground">{profile.label}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{profile.tagline}</span>
        </span>
        <Button
          type="button"
          size="sm"
          className="min-h-9 shrink-0 rounded-lg"
          onClick={() => startDemo(profileKey, viaPlaid)}
          disabled={Boolean(busyKey)}
        >
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {viaPlaid ? 'Connect as this profile' : 'Load profile'}
        </Button>
      </div>
    );
  };

  const cards = [
    {
      key: 'plaid',
      icon: Building2,
      title: 'Connect a Test Bank using Plaid Sandbox',
      description:
        'Link a simulated bank as one of the demo profiles. Uses the real Plaid Sandbox flow with simulated funds — no real credentials, ever.',
      expandable: true,
    },
    {
      key: 'profiles',
      icon: FlaskConical,
      title: 'Explore a Preconfigured Demo Profile',
      description:
        'Load one of three ready-made financial scenarios as labeled Avera sample data and explore every feature.',
      expandable: true,
    },
    {
      key: 'manual',
      icon: PencilLine,
      title: 'Start using Avera today',
      description: 'Ready to get started? Enter your own income and bills to build your financial plan.',
      onClick: () => {
        setMode('manual');
        navigate('/bills-budget');
      },
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-5 sm:px-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
          A
        </span>
        <div>
          <p className="text-lg font-semibold tracking-tight text-foreground">Avera</p>
          <p className="text-sm text-muted-foreground">Your finances. Your rules. Your control.</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-12 pt-8 sm:px-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Get started with Avera
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="max-w-xl text-base text-muted-foreground">
            Explore with sample data, connect a test bank, or get started with your own information.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.key}
              className="flex min-h-48 flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-selected">
                <card.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="mt-3 font-heading text-lg font-semibold text-foreground">{card.title}</span>
              <span className="mt-1 text-base text-muted-foreground">{card.description}</span>
              <Button
                type="button"
                variant={card.expandable ? 'outline' : 'default'}
                className="mt-auto"
                aria-expanded={card.expandable ? expanded === card.key : undefined}
                onClick={() => (card.expandable ? expand(card.key) : card.onClick())}
                disabled={Boolean(busyKey)}
              >
                {card.key === 'plaid' && (expanded === 'plaid' ? 'Hide profiles' : 'Choose a profile')}
                {card.key === 'profiles' && (expanded === 'profiles' ? 'Hide profiles' : 'Pick a profile')}
                {card.key === 'manual' && 'Enter my information'}
              </Button>
            </div>
          ))}
        </div>

        {expanded && (
          <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-label="Demo profiles">
            <h2 className="font-heading text-base font-semibold text-foreground">
              {expanded === 'plaid' ? 'Connect a test bank as a demo profile' : 'Load a preconfigured demo profile'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {expanded === 'plaid'
                ? 'Accounts and transactions arrive through the Plaid Sandbox connection; bills, budgets, and goals are labeled Avera sample data.'
                : 'Everything is Avera sample data, labeled as such throughout the app — never presented as a bank import.'}
            </p>
            <div className="mt-4 space-y-3">{DEMO_PROFILE_KEYS.map((key) => profileRow(key, expanded === 'plaid'))}</div>
          </section>
        )}

        {error && (
          <p role="alert" className="mt-4 text-base text-danger-text">
            {error}
          </p>
        )}

        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success-text" aria-hidden="true" />
          No payment execution, transfers, or banking authorization — Avera never moves your money.
        </p>
      </main>
    </div>
  );
}