import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
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
import { INCOME_TYPES, FREQUENCIES, round2 } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/**
 * Add an income source from a detected transaction deposit. Shows the AI
 * annual projection; the user can adjust the frequency and amount before saving.
 */
export default function ProjectedIncomeDialog({ open, onOpenChange, candidate, onSave }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !candidate) return;
    const annual = Number(candidate.annual_amount) || 0;
    const frequency = FREQUENCIES[candidate.frequency] ? candidate.frequency : 'monthly';
    setForm({
      name: candidate.name ?? '',
      type: 'other',
      frequency,
      amount: annual > 0 ? String(round2(annual / FREQUENCIES[frequency].perYear)) : String(candidate.amount ?? ''),
    });
    setError('');
  }, [open, candidate]);

  if (!form) return null;

  const setFrequency = (frequency) =>
    setForm((f) => {
      const annual = Number(candidate?.annual_amount) || 0;
      return {
        ...f,
        frequency,
        amount:
          annual > 0
            ? String(round2(annual / (FREQUENCIES[frequency]?.perYear ?? 12)))
            : f.amount,
      };
    });

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!name) return setError('Enter a source name.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true);
    try {
      await onSave({
        name,
        type: form.type,
        amount: round2(amount),
        frequency: form.frequency,
        active: true,
        source: candidate?.source === 'Plaid Sandbox' ? 'Plaid Sandbox' : 'Manual',
        notes:
          candidate?.annual_amount > 0
            ? `AI projected ${formatCurrency(candidate.annual_amount)}/yr (Estimated).${candidate.rationale ? ` ${candidate.rationale}` : ''}`
            : '',
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
          <DialogTitle>Add income source from transactions</DialogTitle>
          <DialogDescription>Review the projection, adjust anything, then save.</DialogDescription>
        </DialogHeader>
        {candidate?.annual_amount > 0 && (
          <div className="flex items-start gap-2 rounded-xl bg-info-surface p-3 text-sm text-info">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Projected annual: <span className="font-semibold tabular-nums">{formatCurrency(candidate.annual_amount)}</span>
              {candidate.rationale ? ` — ${candidate.rationale}` : ''}
            </p>
          </div>
        )}
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="projected-income-name">Source name</Label>
            <Input
              id="projected-income-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="min-h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="projected-income-type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger id="projected-income-type" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projected-income-frequency">Pay frequency</Label>
              <Select value={form.frequency} onValueChange={setFrequency}>
                <SelectTrigger id="projected-income-frequency" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCIES).map(([key, f]) => (
                    <SelectItem key={key} value={key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="projected-income-amount">Amount per paycheck</Label>
            <Input
              id="projected-income-amount"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="min-h-11 rounded-xl tabular-nums"
            />
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Add income source</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}