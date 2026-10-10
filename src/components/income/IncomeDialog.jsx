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

const EMPTY = { name: '', type: 'salary', amount: '', frequency: 'monthly', income_basis:'unknown' };

/** Add-or-edit dialog for a household income source. */
export default function IncomeDialog({ open, onOpenChange, income, defaultFrequency, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      income
        ? {
            name: income.name ?? '',
            type: income.type ?? 'salary',
            amount: String(income.amount ?? ''),
            frequency: income.frequency ?? 'monthly',
            income_basis:income.income_basis ?? 'unknown',
          }
        : { ...EMPTY, frequency: defaultFrequency ?? 'monthly' }
    );
    setError('');
  }, [open, income, defaultFrequency]);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const amount = Number(form.amount);
    if (!name) return setError('Enter a source name.');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    setSaving(true);
    try {
      await onSave({ name, type: form.type, amount: round2(amount), frequency: form.frequency, income_basis:form.income_basis, active: true, source: 'Manual' });
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
          <DialogTitle>{income ? 'Edit income source' : 'Add income source'}</DialogTitle>
          <DialogDescription>Multiple sources are supported — each is normalized to a monthly figure.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} aria-busy={saving}>
          <div className="space-y-1.5">
            <Label htmlFor="income-name">Source name</Label>
            <Input id="income-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Primary salary" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="IncomeDialog-select-1">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger id="IncomeDialog-select-1" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOME_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="IncomeDialog-select-2">Pay frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v }))}>
                <SelectTrigger id="IncomeDialog-select-2" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
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
          <div className="space-y-1.5">
            <Label htmlFor="income-basis">Income basis</Label>
            <Select value={form.income_basis} onValueChange={v=>setForm(f=>({...f,income_basis:v}))}>
              <SelectTrigger id="income-basis" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Not specified</SelectItem>
                <SelectItem value="gross">Gross — before taxes and deductions</SelectItem>
                <SelectItem value="net">Net — take-home amount</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Avera does not estimate taxes or convert gross income into take-home income.</p>
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : income ? 'Save changes' : 'Add income source'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
