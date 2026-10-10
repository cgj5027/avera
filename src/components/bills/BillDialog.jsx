import { useEffect, useRef, useState } from 'react';
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
import { FREQUENCIES, round2 } from '@/services/financialCalculations';
import { todayISO } from '@/utils/format';

const EMPTY = { name: '', amount: '', frequency: 'monthly', next_due_date: '', category: '', reminder_days: '3' };

/**
 * Add-or-edit dialog for a recurring bill.
 * For a new bill, typed values survive an accidental dismissal (outside click,
 * Escape) so nothing is lost; the draft clears on Cancel or a successful save.
 */
export default function BillDialog({ open, onOpenChange, bill, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      bill
        ? {
            name: bill.name ?? '',
            amount: String(bill.amount ?? ''),
            frequency: bill.frequency ?? 'monthly',
            next_due_date: bill.next_due_date ?? '',
            category: bill.category ?? '',
            reminder_days: String(bill.reminder_days ?? 3),
          }
        : draftRef.current ?? { ...EMPTY, next_due_date: todayISO() }
    );
    setError('');
  }, [open, bill]);

  /* Keep the newest typed values as the draft while adding. */
  useEffect(() => {
    if (open && !bill) draftRef.current = form;
  }, [open, bill, form]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const closeAndDiscard = () => {
    draftRef.current = null;
    onOpenChange(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!name) return setError('Enter a bill name.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!form.next_due_date) return setError('Choose the next due date.');
    setSaving(true);
    try {
      await onSave({
        name,
        amount: round2(amount),
        frequency: form.frequency,
        recurrence_day: bill && form.next_due_date === bill.next_due_date ? (bill.recurrence_day ?? Number(form.next_due_date.slice(-2))) : Number(form.next_due_date.slice(-2)),
        next_due_date: form.next_due_date,
        category: form.category.trim() || undefined,
        reminder_days: Number(form.reminder_days) || 3,
        source: 'Manual',
      });
      closeAndDiscard();
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
          <DialogTitle>{bill ? 'Edit bill' : 'Add bill'}</DialogTitle>
          <DialogDescription>Recurring amount, due date, and reminder. Saved to your household only.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">Bill name</Label>
            <Input id="bill-name" value={form.name} onChange={set('name')} placeholder="Electricity" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Amount</Label>
              <Input id="bill-amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="BillDialog-select-1">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                <SelectTrigger id="BillDialog-select-1" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCIES).map(([key, f]) => (
                    <SelectItem key={key} value={key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-due">Next due date</Label>
              <Input id="bill-due" type="date" value={form.next_due_date} onChange={set('next_due_date')} className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-reminder">Remind days before</Label>
              <Input id="bill-reminder" type="number" min="0" max="30" value={form.reminder_days} onChange={set('reminder_days')} className="min-h-11 rounded-xl tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-category">Category (optional)</Label>
            <Input id="bill-category" value={form.category} onChange={set('category')} placeholder="Utilities" className="min-h-11 rounded-xl" />
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeAndDiscard}>Cancel</Button>
            <Button type="submit" disabled={saving}>{bill ? 'Save changes' : 'Add bill'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}