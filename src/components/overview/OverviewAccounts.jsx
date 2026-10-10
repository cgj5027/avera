import { useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ACCOUNT_TYPES } from '@/services/financialCalculations';
import SourceChip from '@/components/states/SourceChip';
import { formatCurrency, formatDate } from '@/utils/format';

/** Overview accounts section, collapsed by default: balances with add, edit, and delete. */
export default function OverviewAccounts({ accounts, onDelete, dialog, onOpenDialog, busy }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <Collapsible open={open} onOpenChange={setOpen} className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="min-h-11 -ml-2 px-2" aria-expanded={open}>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
              Accounts
              <span className="text-sm font-normal text-muted-foreground">({accounts.length})</span>
            </Button>
          </CollapsibleTrigger>
          <Button onClick={() => onOpenDialog(null)} className="min-h-11 rounded-xl px-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add account
          </Button>
        </div>
        <CollapsibleContent>
          {accounts.length === 0 ? (
            <p className="mt-2 text-base text-muted-foreground">No accounts yet — add one to see your available cash.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {accounts.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-foreground">
                      {a.name}
                      <SourceChip source={a.source || (a.plaid_item_id ? 'Plaid Sandbox' : 'Manual')} className="ml-2" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ACCOUNT_TYPES[a.type] ?? 'Other'}
                      {a.institution ? ` · ${a.institution}` : ''}
                    </p>
                    {a.balance_as_of && <p className="text-sm text-muted-foreground">Balance as of {formatDate(a.balance_as_of)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading text-base font-semibold tabular-nums text-foreground">{formatCurrency(a.balance)}</p>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${a.name}`} onClick={() => onOpenDialog(a)} disabled={busy} className="h-11 w-11">
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${a.name}`} onClick={() => onDelete(a)} disabled={busy} className="h-11 w-11 text-danger-text hover:bg-danger-surface">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
      {dialog}
    </section>
  );
}