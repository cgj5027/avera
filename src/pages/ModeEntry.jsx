import { useNavigate } from 'react-router-dom';
import { Sparkles, Building2, PencilLine, ShieldCheck } from 'lucide-react';
import { setDataMode as setMode } from '@/lib/mode';

const OPTIONS = [
  {
    mode: 'demo',
    icon: Sparkles,
    title: 'Explore Demo Mode',
    description: 'Look around with sample data. Nothing touches real finances.',
    destination: '/',
    cta: 'Explore',
  },
  {
    mode: 'sandbox',
    icon: Building2,
    title: 'Connect a Test Bank',
    description: 'Use the Plaid Sandbox to link a simulated institution — never a real account.',
    destination: '/settings',
    cta: 'Connect',
  },
  {
    mode: 'manual',
    icon: PencilLine,
    title: 'Enter Finances Manually',
    description: 'Type in income and bills yourself. You stay in control of every figure.',
    destination: '/bills-budget',
    cta: 'Enter',
  },
];

/** Mode-entry onboarding (design system §21). Nothing is persisted; no Plaid connection is made. */
export default function ModeEntry() {
  const navigate = useNavigate();
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
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 pb-12 sm:px-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Get started with Avera
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Experience Avera using simulated financial data. No real banking credentials are required.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((o) => (
            <button
              key={o.mode}
              onClick={() => {
                setMode(o.mode);
                navigate(o.destination);
              }}
              className="group flex min-h-48 flex-col rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-colors duration-200 hover:bg-surface-selected focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-selected">
                <o.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="mt-3 font-heading text-lg font-semibold text-foreground">{o.title}</span>
              <span className="mt-1 text-base text-muted-foreground">{o.description}</span>
              <span className="mt-auto pt-4 text-base font-medium text-primary">{o.cta}</span>
            </button>
          ))}
        </div>
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          No payment execution, transfers, or banking authorization — Avera never moves your money.
        </p>
      </main>
    </div>
  );
}