import { useEffect, useState } from 'react';
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

/** Add-or-edit dialog for a cash account. */
export default function AccountDialog({ open, onOpenChange, account, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
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

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return setError('Enter an account name.');
    const balance = Number(form.balance);
    if (!Number.isFinite(balance)) return setError('Enter a balance (negative is allowed for credit cards).');
    onSave({ name, type: form.type, balance: round2(balance), institution: form.institution.trim() || undefined, source: 'Manual' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit account' : 'Add account'}</DialogTitle>
          <DialogDescription>Manual balances only in this stage — no bank connection is made.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="account-name">Account name</Label>
              <Input id="account-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Everyday checking" className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{account ? 'Save changes' : 'Add account'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}