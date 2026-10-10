import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { FREQUENCIES } from '@/services/financialCalculations';
import { getHouseholdProfile, saveHouseholdProfile } from '@/services/dataService';

const EMPTY = {
  household_name: '',
  household_type: 'single_income',
  default_pay_frequency: 'monthly',
  budget_style: 'category_caps',
  emergency_fund_months: '',
};

/** Household profile form: household type, default pay frequency, and preferences. */
export default function HouseholdForm() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    getHouseholdProfile()
      .then((profile) => {
        if (!cancelled && profile) {
          setForm({
            household_name: profile.household_name ?? '',
            household_type: profile.household_type ?? 'single_income',
            default_pay_frequency: profile.default_pay_frequency ?? 'monthly',
            budget_style: profile.budget_style ?? 'category_caps',
            emergency_fund_months: profile.emergency_fund_months != null ? String(profile.emergency_fund_months) : '',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveHouseholdProfile({
        household_name: form.household_name.trim() || undefined,
        household_type: form.household_type,
        default_pay_frequency: form.default_pay_frequency,
        budget_style: form.budget_style,
        emergency_fund_months: form.emergency_fund_months === '' ? undefined : Number(form.emergency_fund_months),
      });
      toast({ title: 'Household preferences saved' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-base text-muted-foreground">Loading your household profile…</p>;

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="hh-name">Household name</Label>
          <Input id="hh-name" value={form.household_name} onChange={(e) => setForm((f) => ({ ...f, household_name: e.target.value }))} placeholder="The Alvarez household" className="min-h-11 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label>Household type</Label>
          <Select value={form.household_type} onValueChange={(v) => setForm((f) => ({ ...f, household_type: v }))}>
            <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single_income">Single income</SelectItem>
              <SelectItem value="multi_income">Multiple incomes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default pay frequency</Label>
          <Select value={form.default_pay_frequency} onValueChange={(v) => setForm((f) => ({ ...f, default_pay_frequency: v }))}>
            <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(FREQUENCIES).map(([key, f]) => (
                <SelectItem key={key} value={key}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Budget style</Label>
          <Select value={form.budget_style} onValueChange={(v) => setForm((f) => ({ ...f, budget_style: v }))}>
            <SelectTrigger className="min-h-11 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="category_caps">Category caps</SelectItem>
              <SelectItem value="zero_based">Zero-based</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hh-emergency">Emergency fund goal (months)</Label>
          <Input id="hh-emergency" type="number" step="0.5" min="0" inputMode="decimal" value={form.emergency_fund_months} onChange={(e) => setForm((f) => ({ ...f, emergency_fund_months: e.target.value }))} placeholder="6" className="min-h-11 rounded-xl tabular-nums" />
        </div>
      </div>
      <Button type="submit" disabled={saving} className="min-h-11 rounded-xl px-4">
        Save household preferences
      </Button>
    </form>
  );
}