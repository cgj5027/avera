import { useEffect, useState } from 'react';
import { Plug, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { connectBank, syncConnections, PLAID_LABEL } from '@/services/plaidClient';

const ITEM_FIELDS = ['item_id', 'institution_name', 'status', 'last_synced_at', 'last_sync_error'];

const STATUS_VIEW = {
  active: { tone: 'success', icon: Plug, label: 'Connected' },
  needs_reauth: { tone: 'warning', icon: RefreshCw, label: 'Needs re-authentication' },
  error: { tone: 'danger', icon: RefreshCw, label: 'Sync error' },
  disconnected: { tone: 'neutral', icon: Plug, label: 'Disconnected' }
};

/** Bank connections section: Plaid Sandbox linking, sync, and disconnect. */
export default function BankConnections() {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState('');
  const [connectError, setConnectError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const page = await base44.entities.PlaidItem.filter({}, {
      sort: '-created_date',
      limit: 50,
      fields: ITEM_FIELDS
    });
    setItems(page.items);
  };

  useEffect(() => { load(); }, []);

  const handleConnect = async () => {
    setBusy('connect');
    setConnectError('');
    try {
      await connectBank();
      await load();
      toast({ title: 'Test bank connected', description: 'Accounts were imported from the Plaid Sandbox.' });
    } catch (e) {
      setConnectError(e.message || 'Connection cancelled.');
    } finally {
      setBusy('');
    }
  };

  const handleSync = async () => {
    setBusy('sync');
    try {
      await syncConnections();
      await load();
      toast({ title: 'Connections synced', description: 'Balances refreshed and transactions imported.' });
    } catch (e) {
      setConnectError(e.message || 'Sync failed. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const handleDisconnect = async () => {
    const item = pendingDelete;
    if (!item) return;
    setBusy('disconnect');
    try {
      await base44.entities.Account.deleteMany({ plaid_item_id: item.item_id });
      await base44.entities.Transaction.deleteMany({ plaid_item_id: item.item_id });
      await base44.entities.PlaidItem.delete(item.id);
      setPendingDelete(null);
      await load();
      toast({ title: 'Disconnected', description: 'Imported accounts and transactions were removed.' });
    } finally {
      setBusy('');
    }
  };

  const anyConnected = (items || []).length > 0;

  return (
    <div>
      {items === null ? (
        <p className="text-base text-muted-foreground">Checking connections…</p>
      ) : !anyConnected ? (
        <p className="text-base text-muted-foreground">
          No test banks connected yet. {PLAID_LABEL} flow with simulated institutions only — credentials stay in server-side secrets.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const view = STATUS_VIEW[item.status] || STATUS_VIEW.disconnected;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle p-3"
              >
                <div>
                  <p className="font-medium text-foreground">{item.institution_name || 'Test bank'}</p>
                  <p className="text-sm text-muted-foreground">
                    Last synced: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleString() : 'Never'}
                  </p>
                  {item.last_sync_error && (
                    <p className="mt-1 text-sm text-danger-text">{item.last_sync_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill tone={view.tone} icon={view.icon}>{view.label}</StatusPill>
                  <Button variant="outline" size="sm" disabled={busy === 'sync'} onClick={handleSync}>
                    <RefreshCw aria-hidden="true" /> Sync now
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Disconnect ${item.institution_name || 'test bank'}`} onClick={() => setPendingDelete(item)}>
                    <Trash2 className="text-danger-text" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {connectError && (
        <p role="alert" className="mt-3 text-base text-danger-text">{connectError}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button className="min-h-11 rounded-xl" onClick={handleConnect} disabled={busy === 'connect'}>
          <Plus aria-hidden="true" /> Connect test bank
        </Button>
      </div>
      <p className="mt-3 text-base text-muted-foreground">
        Avera uses the {PLAID_LABEL} flow with simulated institutions only. Credentials live in secure
        server-side secrets, never in this app. Avera never executes payments or moves money.
      </p>

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title={`Disconnect ${pendingDelete?.institution_name || 'this test bank'}?`}
        description="The connection is removed, along with the accounts and transactions imported from it. Manual entries are never touched."
        busy={busy === 'disconnect'}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}