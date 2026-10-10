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
import { round2 } from '@/services/financialCalculations';
import { todayISO } from '@/utils/format';

const EMPTY = { description: '', amount: '', type: 'expense', date: '', category: 'uncategorized' };
const UNCATEGORIZED = 'uncategorized';

/** Create a manual transaction from the Transactions tab. */
export default function ManualTransactionDialog({ open, onOpenChange, categories = [], onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, date: todayISO() });
    setError('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const amount = Number(form.amount);
    if (!form.description.trim()) return setError('Enter a name.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.date) return setError('Choose the transaction date.');
    setSaving(true);
    try {
      await onSave({
        description: form.description.trim(),
        amount: round2(amount),
        type: form.type,
        date: form.date,
        category: form.category === UNCATEGORIZED ? '' : form.category,
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
          <DialogTitle>Add manual transaction</DialogTitle>
          <DialogDescription>Recorded with a Manual source label. Linked-bank charges come from sync instead.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="add-txn-name">Name</Label>
            <Input
              id="add-txn-name"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="McDonald's"
              className="min-h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-txn-amount">Amount</Label>
              <Input
                id="add-txn-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="min-h-11 rounded-xl tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-txn-date">Date</Label>
              <Input
                id="add-txn-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="min-h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-txn-type">Type</Label>
            <Select value={form.type} onValueChange={(value) => setForm((f) => ({ ...f, type: value }))}>
              <SelectTrigger id="add-txn-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-txn-category">Transaction category</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm((f) => ({ ...f, category: value }))}
            >
              <SelectTrigger id="add-txn-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Assigning a budget category counts this transaction toward that category's monthly spending.
            </p>
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Add transaction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}