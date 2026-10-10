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

const EMPTY = { name: '', monthly_limit: '' };

/**
 * Add-or-edit dialog for a budget category and its monthly limit.
 * For a new category, typed values survive an accidental dismissal (outside
 * click, Escape) so nothing is lost; the draft clears on Cancel or a
 * successful save.
 */
export default function CategoryDialog({ open, onOpenChange, category, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(
      category
        ? { name: category.name ?? '', monthly_limit: String(category.monthly_limit ?? '') }
        : draftRef.current ?? { ...EMPTY }
    );
    setError('');
  }, [open, category]);

  /* Keep the newest typed values as the draft while adding. */
  useEffect(() => {
    if (open && !category) draftRef.current = form;
  }, [open, category, form]);

  const closeAndDiscard = () => {
    draftRef.current = null;
    onOpenChange(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const name = form.name.trim();
    const limit = Number(form.monthly_limit);
    if (!name) return setError('Enter a category name.');
    if (form.monthly_limit.trim() === '' || !Number.isFinite(limit) || limit < 0) return setError('Enter a monthly limit of zero or more.');
    setSaving(true);
    try {
      await onSave({ name, monthly_limit: round2(limit) });
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
          <DialogTitle>{category ? 'Edit category' : 'Add budget category'}</DialogTitle>
          <DialogDescription>Set a monthly spending cap for this category.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Category name</Label>
            <Input id="category-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Groceries" className="min-h-11 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category-limit">Monthly limit</Label>
            <Input id="category-limit" type="number" step="0.01" min="0" inputMode="decimal" value={form.monthly_limit} onChange={(e) => setForm((f) => ({ ...f, monthly_limit: e.target.value }))} placeholder="0.00" className="min-h-11 rounded-xl tabular-nums" />
          </div>
          {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeAndDiscard}>Cancel</Button>
            <Button type="submit" disabled={saving}>{category ? 'Save changes' : 'Add category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}