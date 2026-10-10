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
import { round2 } from '@/services/financialCalculations';
import { todayISO } from '@/utils/format';

const EMPTY = { amount: '', description: '', date: '' };

/** Log a spending transaction against a budget category. */
export default function LogSpendingDialog({ open, onOpenChange, category, transaction, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(transaction ? { amount: String(transaction.amount), description: transaction.description ?? '', date: transaction.date } : { ...EMPTY, date: todayISO() });
    setError('');
  }, [open, category, transaction]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.date) return setError('Choose the spending date.');
    setSaving(true);
    try {
      await onSave({
      description: form.description.trim() || `Spending — ${category.name}`,
      amount: round2(amount),
      type: 'expense',
      category: category.name,
      date: form.date,
      source: 'Manual',
    });
      onOpenChange(false);
    } catch {
      setError('Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit spending' : 'Log spending'} — {category.name}</DialogTitle>
          <DialogDescription>Recorded against this month's budget. Manual source.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="spend-amount">Amount</Label>
              <Input id="spend-amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="spend-date">Date</Label>
              <Input id="spend-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="min-h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="spend-note">Description (optional)</Label>
            <Input id="spend-note" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Weekly groceries" className="min-h-11 rounded-xl" />
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{transaction ? 'Save changes' : 'Log spending'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}