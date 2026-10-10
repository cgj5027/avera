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
import { round2 } from '@/services/financialCalculations';

/**
 * Log a contribution toward a goal; the caller applies it to saved_amount.
 * A typed amount survives an accidental dismissal (outside click, Escape) for
 * the same goal; the draft clears on Cancel or a successful save.
 */
export default function GoalContributionDialog({ open, onOpenChange, goal, onSave }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const draft = draftRef.current;
    setAmount(draft && draft.goalId === goal?.id ? draft.amount : '');
    setError('');
  }, [open, goal]);

  /* Keep the newest typed amount as the draft for this goal. */
  useEffect(() => {
    if (open) draftRef.current = { goalId: goal?.id, amount };
  }, [open, goal, amount]);

  const closeAndDiscard = () => {
    draftRef.current = null;
    onOpenChange(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return setError('Enter a contribution greater than zero.');
    setSaving(true);
    try {
      await onSave(round2(value));
      closeAndDiscard();
    } catch {
      setError('Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log contribution — {goal?.name}</DialogTitle>
          <DialogDescription>Added to what you have saved toward this goal.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="contribution-amount">Contribution amount</Label>
            <Input id="contribution-amount" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeAndDiscard}>Cancel</Button>
            <Button type="submit" disabled={saving}>Log contribution</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}