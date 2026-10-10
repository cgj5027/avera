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

const EMPTY = { name: '', target_amount: '', saved_amount: '', target_date: '' };

/** Add-or-edit dialog for a savings goal. */
export default function GoalDialog({ open, onOpenChange, goal, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(
      goal
        ? {
            name: goal.name ?? '',
            target_amount: String(goal.target_amount ?? ''),
            saved_amount: String(goal.saved_amount ?? ''),
            target_date: goal.target_date ?? '',
          }
        : { ...EMPTY }
    );
    setError('');
  }, [open, goal]);

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const target = Number(form.target_amount);
    const saved = Number(form.saved_amount) || 0;
    if (!name) return setError('Enter a goal name.');
    if (!Number.isFinite(target) || target <= 0) return setError('Enter a target greater than zero.');
    if (saved < 0) return setError('Saved amount cannot be negative.');
    onSave({
      name,
      target_amount: round2(target),
      saved_amount: round2(Math.min(saved, target)),
      target_date: form.target_date || undefined,
      source: 'Manual',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit goal' : 'Add goal'}</DialogTitle>
          <DialogDescription>Set a savings target, what you have saved, and an optional target date.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input id="goal-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Emergency fund" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input id="goal-target" type="number" step="0.01" min="0" inputMode="decimal" value={form.target_amount} onChange={(e) => setForm((f) => ({ ...f, target_amount: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-saved">Already saved</Label>
              <Input id="goal-saved" type="number" step="0.01" min="0" inputMode="decimal" value={form.saved_amount} onChange={(e) => setForm((f) => ({ ...f, saved_amount: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Target date (optional)</Label>
            <Input id="goal-date" type="date" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} className="min-h-11 rounded-xl" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{goal ? 'Save changes' : 'Add goal'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}