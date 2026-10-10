import { useEffect, useState } from 'react';
import { ChevronLeft, Landmark, PenLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACCOUNT_TYPES, round2 } from '@/services/financialCalculations';

const EMPTY = { name: '', type: 'checking', balance: '', institution: '' };

/** Add-or-edit dialog for a cash account. New accounts choose Plaid or manual entry. */
export default function AccountDialog({ open, onOpenChange, account, onSave, onConnectPlaid }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('choose'); // 'choose' | 'manual'

  useEffect(() => {
    if (!open) return;
    setMode('choose');
    setForm(
      account
        ? {
            name: account.name ?? '',
            type: account.type ?? 'checking',
            balance: String(account.balance ?? ''),
            institution: account.institution ?? '',
          }
        : { ...EMPTY }
    );
    setError('');
  }, [open, account]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    if (!name) return setError('Enter an account name.');
    const balance = Number(form.balance);
    if (!Number.isFinite(balance)) return setError('Enter a balance (negative is allowed for credit cards).');
    setSaving(true);
    try {
      await onSave({ name, type: form.type, balance: round2(balance), institution: form.institution.trim() || undefined, source: 'Manual' });
      onOpenChange(false);
    } catch {
      setError('Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(account);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit account' : 'Add account'}</DialogTitle>
          <DialogDescription>
            {isEdit || mode === 'manual'
              ? 'Manual balances only in this stage — no bank connection is made.'
              : 'Connect a test bank through Plaid, or add an account manually.'}
          </DialogDescription>
        </DialogHeader>
        {!isEdit && mode === 'choose' ? (
          <div className="grid gap-3">
            <button
              type="button"
              onClick={onConnectPlaid}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Landmark className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-base font-medium text-foreground">Connect a test bank (Plaid)</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">Import accounts and transactions from a simulated institution.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PenLine className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-base font-medium text-foreground">Add manually</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">Enter a name, type, and current balance yourself.</span>
              </span>
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-name">Account name</Label>
                <Input id="account-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Everyday checking" className="min-h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="AccountDialog-select-1">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger id="AccountDialog-select-1" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account-balance">Current balance</Label>
                <Input id="account-balance" type="number" step="0.01" inputMode="decimal" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-institution">Institution (optional)</Label>
                <Input id="account-institution" value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} placeholder="Local credit union" className="min-h-11 rounded-xl" />
              </div>
            </div>
            {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
            <DialogFooter className="gap-2">
              {!isEdit && (
                <Button type="button" variant="ghost" onClick={() => setMode('choose')}>
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Back
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{isEdit ? 'Save changes' : 'Add account'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}