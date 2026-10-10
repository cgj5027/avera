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
import { PROPERTY_TYPES, round2 } from '@/services/financialCalculations';
import { todayISO } from '@/utils/format';

const EMPTY = {
  nickname: '',
  address: '',
  property_type: 'primary_residence',
  estimated_value: '',
  valuation_date: '',
  valuation_notes: '',
  taxes_monthly: '',
  insurance_monthly: '',
  hoa_monthly: '',
  maintenance_monthly: '',
  lender: '',
  outstanding_balance: '',
  monthly_payment: '',
  interest_rate: '',
};

/**
 * Add-or-edit dialog for a property, its manual valuation, and its mortgage.
 * The valuation is always stored as a user-provided estimate (Manual source);
 * no external provider is contacted.
 * For a new property, typed values survive an accidental dismissal (outside
 * click, Escape); the draft clears on Cancel or a successful save.
 */
export default function PropertyDialog({ open, onOpenChange, property, mortgage, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!property) {
      setForm(draftRef.current ?? { ...EMPTY });
      setError('');
      return;
    }
    const p = property;
    setForm({
      nickname: p.nickname ?? '',
      address: p.address ?? '',
      property_type: p.property_type ?? 'primary_residence',
      estimated_value: p.estimated_value != null ? String(p.estimated_value) : '',
      valuation_date: p.valuation_date ?? todayISO(),
      valuation_notes: p.valuation_notes ?? '',
      taxes_monthly: p.taxes_monthly != null ? String(p.taxes_monthly) : '',
      insurance_monthly: p.insurance_monthly != null ? String(p.insurance_monthly) : '',
      hoa_monthly: p.hoa_monthly != null ? String(p.hoa_monthly) : '',
      maintenance_monthly: p.maintenance_monthly != null ? String(p.maintenance_monthly) : '',
      lender: mortgage?.lender ?? '',
      outstanding_balance: mortgage?.outstanding_balance != null ? String(mortgage.outstanding_balance) : '',
      monthly_payment: mortgage?.monthly_payment != null ? String(mortgage.monthly_payment) : '',
      interest_rate: mortgage?.interest_rate != null ? String(mortgage.interest_rate) : '',
    });
    setError('');
  }, [open, property, mortgage]);

  /* Keep the newest typed values as the draft while adding. */
  useEffect(() => {
    if (open && !property) draftRef.current = form;
  }, [open, property, form]);

  const closeAndDiscard = () => {
    draftRef.current = null;
    onOpenChange(false);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const numOrNull = (v) => (v === '' ? undefined : round2(Number(v)));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const nickname = form.nickname.trim();
    const value = Number(form.estimated_value);
    if (!nickname) return setError('Enter a nickname for the property.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an estimated value greater than zero.');
    const numbers = ['taxes_monthly','insurance_monthly','hoa_monthly','maintenance_monthly','outstanding_balance','monthly_payment','interest_rate'];
    if (numbers.some(key => form[key] !== '' && (!Number.isFinite(Number(form[key])) || Number(form[key]) < 0))) return setError('Costs and mortgage values must be valid non-negative numbers.');
    setSaving(true);
    try {
      await onSave({
      property: {
        nickname,
        address: form.address.trim() || undefined,
        property_type: form.property_type,
        estimated_value: round2(value),
        valuation_source: 'user_provided',
        valuation_date: form.valuation_date || todayISO(),
        valuation_notes: form.valuation_notes.trim() || undefined,
        taxes_monthly: numOrNull(form.taxes_monthly) ?? 0,
        insurance_monthly: numOrNull(form.insurance_monthly) ?? 0,
        hoa_monthly: numOrNull(form.hoa_monthly) ?? 0,
        maintenance_monthly: numOrNull(form.maintenance_monthly) ?? 0,
        source: 'Manual',
      },
      mortgage: {
        lender: form.lender.trim() || undefined,
        outstanding_balance: form.outstanding_balance === '' ? null : round2(Number(form.outstanding_balance)),
        monthly_payment: form.monthly_payment === '' ? null : round2(Number(form.monthly_payment)),
        interest_rate: form.interest_rate === '' ? null : Number(form.interest_rate),
      },
    });
      closeAndDiscard();
    } catch {
      setError('Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const money = (id, label, key, { min = 0 } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.01" min={min} inputMode="decimal" value={form[key]} onChange={set(key)} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? 'Edit property' : 'Add property'}</DialogTitle>
          <DialogDescription>Valuations are user-provided estimates, always labeled Manual. No provider is contacted.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prop-nickname">Nickname</Label>
              <Input id="prop-nickname" value={form.nickname} onChange={set('nickname')} placeholder="Maple Street" className="min-h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="PropertyDialog-select-1">Type</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                <SelectTrigger id="PropertyDialog-select-1" className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-address">Address (optional)</Label>
            <Input id="prop-address" value={form.address} onChange={set('address')} placeholder="123 Maple Street" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {money('prop-value', 'Estimated value', 'estimated_value')}
            <div className="space-y-1.5">
              <Label htmlFor="prop-valuation-date">Valuation date</Label>
              <Input id="prop-valuation-date" type="date" value={form.valuation_date} onChange={set('valuation_date')} className="min-h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-valuation-notes">Valuation notes (optional)</Label>
            <Input id="prop-valuation-notes" value={form.valuation_notes} onChange={set('valuation_notes')} placeholder="How you estimated this value" className="min-h-11 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {money('prop-taxes', 'Taxes /mo', 'taxes_monthly')}
            {money('prop-insurance', 'Insurance /mo', 'insurance_monthly')}
            {money('prop-hoa', 'HOA /mo', 'hoa_monthly')}
            {money('prop-maintenance', 'Maintenance /mo', 'maintenance_monthly')}
          </div>
          <div className="rounded-xl border border-border bg-surface-subtle p-4">
            <p className="text-sm font-medium text-foreground">Mortgage (optional)</p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mort-lender">Lender</Label>
                <Input id="mort-lender" value={form.lender} onChange={set('lender')} placeholder="Lender name" className="min-h-11 rounded-xl" />
              </div>
              {money('mort-balance', 'Outstanding balance', 'outstanding_balance')}
              {money('mort-payment', 'Monthly payment', 'monthly_payment')}
              <div className="space-y-1.5">
                <Label htmlFor="mort-rate">Interest rate % (optional)</Label>
                <Input id="mort-rate" type="number" step="0.01" min="0" inputMode="decimal" value={form.interest_rate} onChange={set('interest_rate')} placeholder="6.50" className="min-h-11 rounded-xl tabular-nums" />
              </div>
            </div>
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeAndDiscard}>Cancel</Button>
            <Button type="submit" disabled={saving}>{property ? 'Save changes' : 'Add property'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}