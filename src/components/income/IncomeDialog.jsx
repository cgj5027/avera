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
import { INCOME_TYPES, FREQUENCIES, round2 } from '@/services/financialCalculations';

const EMPTY = { name: '', type: 'salary', amount: '', frequency: 'monthly' };

/** Add-or-edit dialog for a household income source. */
export default function IncomeDialog({ open, onOpenChange, income, defaultFrequency, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(
      income
        ? {
            name: income.name ?? '',
            type: income.type ?? 'salary',
            amount: String(income.amount ?? ''),
            frequency: income.frequency ?? 'monthly',
          }
        : { ...EMPTY, frequency: defaultFrequency ?? 'monthly' }
    );
    setError('');
  }, [open, income, defaultFrequency]);

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!name) return setError('Enter a source name.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    onSave({ name, type: form.type, amount: round2(amount), frequency: form.frequency, active: true, source: 'Manual' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{income ? 'Edit income source' : 'Add income source'}</DialogTitle>
          <DialogDescription>Multiple sources are supported — each is normalized to a monthly figure.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="income-name">Source name</Label>
            <Input id="income-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Primary salary" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pay frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCIES).map(([key, f]) => (
                    <SelectItem key={key} value={key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="income-amount">Amount per paycheck</Label>
            <Input id="income-amount" type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{income ? 'Save changes' : 'Add income source'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}