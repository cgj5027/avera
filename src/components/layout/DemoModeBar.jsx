import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ChevronDown, FlaskConical, RotateCcw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import { useToast } from '@/components/ui/use-toast';
import { DEMO_PROFILES } from '@/services/demoProfiles';
import { resetDemoProfile, exitDemoMode } from '@/services/demoMode';
import { getDemoWorkspace, clearDataMode } from '@/lib/mode';

/**
 * Persistent Demo Mode bar (Stage 3B): labels the experience, names the
 * dataset's source, and offers reset (scoped to the signed-in user's active
 * demo workspace) and exit. Ordinary financial records are never touched.
 */
export default function DemoModeBar({ compact = false }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [resetOpen,setResetOpen]=useState(false);
  const { toast } = useToast();
  const ws = getDemoWorkspace();
  if (!ws) return null;
  const profile = DEMO_PROFILES[ws.profile];
  const Container = compact ? 'details' : 'div';

  const reset = async () => {
    setBusy(true);
    try {
      const result = await resetDemoProfile();
      toast({
        title: 'Demo profile reset',
        description: result.warning || 'The selected profile was restored to its original state.',
      });
      window.location.reload();
    } catch {
      setBusy(false);
      toast({ title: 'Reset failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const exit = async () => {
    setBusy(true);
    try {
      await exitDemoMode(clearDataMode);
      setExitOpen(false);
      navigate('/welcome', { replace: true });
    } catch {
      setBusy(false);
      toast({ title: 'Exit failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Container className={compact ? 'group mb-2 shrink-0 rounded-2xl border border-border bg-surface shadow-sm' : 'mb-6 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm sm:px-6'}>
      {compact ? <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
        <FlaskConical className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <span>Demo Mode — {profile?.label ?? 'Workspace'}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
      </summary> : (
      <span className="flex items-center gap-2 font-heading text-base font-semibold text-foreground">
        <FlaskConical className="h-5 w-5 text-primary" aria-hidden="true" />
        Demo Mode — {profile?.label ?? 'Workspace'}
      </span>
      )}
      <div className={compact ? 'flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-4 py-3 sm:px-6' : 'contents'}>
      <span className="rounded-lg border border-border bg-surface-subtle px-2.5 py-1 text-sm text-muted-foreground">
        {ws.plaid_item_id ? 'Dataset: Plaid Sandbox + Avera sample plans' : 'Dataset: Avera sample data'}
      </span>
      <span className="hidden text-sm text-muted-foreground md:inline">Nothing here moves real money.</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="min-h-11 rounded-xl" onClick={()=>setResetOpen(true)} disabled={busy}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset demo profile
        </Button>
        <Button variant="ghost" size="sm" className="min-h-11 rounded-xl" onClick={() => setExitOpen(true)} disabled={busy}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Exit Demo Mode
        </Button>
      </div>
      </div>
      <ConfirmDeleteDialog open={resetOpen} onOpenChange={setResetOpen} title="Reset this demo profile?" description="This removes and replaces this account’s demo records. Ordinary financial records are preserved." onConfirm={reset} busy={busy} />
      <ConfirmDeleteDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="Exit demo mode?"
        description="Your demo data will be cleared. Your own financial records stay safe."
        confirmLabel="Exit demo"
        cancelLabel="Keep exploring"
        onConfirm={exit}
        busy={busy}
      />
    </Container>
  );
}
