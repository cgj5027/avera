import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/states/EmptyState';
import { ACCOUNT_TYPES } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/** Overview accounts section: balances list with add, edit, and delete. */
export default function OverviewAccounts({ accounts, onDelete, dialog, onOpenDialog, busy }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <PageHeader
        title="Accounts"
        subtitle="Manual balances that feed your available cash."
        className="mb-0"
        actions={
          <Button onClick={() => onOpenDialog(null)} className="min-h-11 rounded-xl px-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add account
          </Button>
        }
      />
      {accounts.length === 0 ? (
        <p className="mt-4 text-base text-muted-foreground">No accounts yet — add one to see your available cash.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-base font-medium text-foreground">{a.name}</p>
                <p className="text-sm text-muted-foreground">
                  {ACCOUNT_TYPES[a.type] ?? 'Other'}
                  {a.institution ? ` · ${a.institution}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-base font-semibold tabular-nums text-foreground">{formatCurrency(a.balance)}</p>
                <Button size="icon" variant="ghost" aria-label={`Edit ${a.name}`} onClick={() => onOpenDialog(a)} disabled={busy} className="h-9 w-9">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Delete ${a.name}`} onClick={() => onDelete(a)} disabled={busy} className="h-9 w-9 text-danger hover:bg-danger-surface">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </section>
  );
}