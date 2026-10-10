import { useMemo, useState } from 'react';
import { Search, Repeat, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { importedTransactions, estimateBillCandidates, normalizeName } from '@/services/plaidEstimates';
import { formatCurrency } from '@/utils/format';

/**
 * Combined table of transactions imported from linked Plaid accounts.
 * Searchable and filterable by category, type, account, and date range;
 * expense rows matching a detected recurring pattern are highlighted with
 * an "Add as bill" action, and every row's category is editable.
 */
export default function TransactionsTable({ transactions, bills, accounts = [], busy, onAddBill, onSaveCategory }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [account, setAccount] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState(null); // { transaction, value }
  const [saveError, setSaveError] = useState('');

  const rows = useMemo(
    () => importedTransactions(transactions).slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [transactions]
  );

  const categories = useMemo(() => {
    const values = [...new Set(rows.map((t) => t.category).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const accountNames = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.plaid_account_id, a.name]));
    const used = [...new Set(rows.map((t) => t.plaid_account_id).filter(Boolean))];
    return used.map((id) => ({ id, name: map.get(id) || 'Linked account' }));
  }, [accounts, rows]);

  const recurringByName = useMemo(() => {
    const candidates = estimateBillCandidates(rows);
    return new Map(candidates.map((c) => [normalizeName(c.name), c]));
  }, [rows]);

  const savedNames = useMemo(() => new Set(bills.map((b) => normalizeName(b.name))), [bills]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (category !== 'all' && (t.category || 'Uncategorized') !== category) return false;
      if (type !== 'all' && (t.type === 'income' ? 'income' : 'expense') !== type) return false;
      if (account !== 'all' && (t.plaid_account_id || '') !== account) return false;
      if (dateFrom && (t.date ?? '') < dateFrom) return false;
      if (dateTo && (t.date ?? '') > dateTo) return false;
      if (!q) return true;
      const haystack = `${t.description ?? ''} ${t.category ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, category, type, account, dateFrom, dateTo]);

  const submitCategory = async (e) => {
    e.preventDefault();
    if (!editing || busy) return;
    setSaveError('');
    try {
      await onSaveCategory(editing.transaction, String(editing.value ?? '').trim());
      setEditing(null);
    } catch {
      setSaveError('Unable to save. Please try again.');
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Linked-account transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Combined from every linked bank. Highlighted charges look recurring — add them as tracked bills.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions"
              aria-label="Search transactions"
              className="w-44 pl-9 sm:w-56"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className="w-40 rounded-xl"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className="w-40 rounded-xl"
            />
          </div>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger className="w-44" aria-label="Filter by account">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accountNames.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-32" aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-base text-muted-foreground">
          {rows.length === 0 ? 'No linked transactions yet.' : 'No transactions match these filters.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((t) => {
                const isIncome = t.type === 'income';
                const candidate = !isIncome ? recurringByName.get(normalizeName(t.description || t.category)) : null;
                const isRecurring = Boolean(candidate) && !savedNames.has(normalizeName(t.description || t.category));
                const isTracked = Boolean(candidate) && savedNames.has(normalizeName(t.description || t.category));
                return (
                  <TableRow key={t.id} className={isRecurring ? 'bg-warning-surface' : undefined}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{t.date}</TableCell>
                    <TableCell className="font-medium text-foreground">{t.description || 'Unnamed'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {accountNames.find((a) => a.id === t.plaid_account_id)?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {t.category || 'Uncategorized'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSaveError('');
                            setEditing({ transaction: t, value: t.category || '' });
                          }}
                          disabled={busy}
                          aria-label={`Change category for ${t.description || 'transaction'}`}
                          className="h-7 w-7"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {isIncome ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isRecurring ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
                            Recurring
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAddBill(candidate)}
                            disabled={busy}
                            className="min-h-9 rounded-lg px-3"
                          >
                            Add as bill
                          </Button>
                        </span>
                      ) : isTracked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-text">
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Tracked
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change category</DialogTitle>
            <DialogDescription>{editing?.transaction?.description || 'Linked transaction'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCategory}>
            <div className="space-y-1.5">
              <Label htmlFor="txn-category">Category</Label>
              <Input
                id="txn-category"
                value={editing?.value ?? ''}
                onChange={(e) => setEditing((cur) => ({ ...cur, value: e.target.value }))}
                placeholder="Groceries"
                className="min-h-11 rounded-xl"
              />
            </div>
            {saveError && <p role="alert" className="text-base text-danger-text">{saveError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>Save category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}