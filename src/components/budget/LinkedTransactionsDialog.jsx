import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import SourceChip from '@/components/states/SourceChip';
import { formatCurrency, formatDate } from '@/utils/format';

const isSynced = (t) => Boolean(t.plaid_item_id) || t.source === 'Plaid Sandbox';

/** Pop-up listing the transactions linked to one budget category for the current month. */
export default function LinkedTransactionsDialog({ open, onOpenChange, category, transactions, busy, onEditTransaction, onDeleteTransaction }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{category?.name} transactions</DialogTitle>
          <DialogDescription>Transactions linked to this budget category this month.</DialogDescription>
        </DialogHeader>
        {transactions.length === 0 ? (
          <p className="text-base text-muted-foreground">
            No transactions are linked to this category this month. Link one from the Transactions tab, or log spending directly.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-base font-medium text-foreground">{t.description || 'Unnamed'}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <SourceChip source={isSynced(t) ? 'Plaid Sandbox' : 'Manual'} />
                  <span className="tabular-nums text-foreground">-{formatCurrency(t.amount)}</span>
                  {!isSynced(t) && (
                    <span className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditTransaction(t)}
                        disabled={busy}
                        aria-label={`Edit spending ${t.description || 'Unnamed'}`}
                        className="min-h-9 rounded-lg px-3"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteTransaction(t)}
                        disabled={busy}
                        aria-label={`Delete spending ${t.description || 'Unnamed'}`}
                        className="min-h-9 rounded-lg px-3 text-danger-text hover:bg-danger-surface"
                      >
                        Delete
                      </Button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}