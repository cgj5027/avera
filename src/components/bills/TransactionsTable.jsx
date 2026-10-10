import { useEffect, useMemo, useState } from 'react';
import { Search, Repeat, Check, Pencil, Download, Sparkles, RefreshCw, Keyboard } from 'lucide-react';
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
import { estimateBillCandidates, normalizeName } from '@/services/plaidEstimates';
import { formatCurrency } from '@/utils/format';

const PAGE_SIZE = 25;
const UNCATEGORIZED = 'uncategorized';

const isSynced = (t) => Boolean(t.plaid_item_id) || t.source === 'Plaid Sandbox';

const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';

/**
 * Combined table of every transaction: imported from linked Plaid accounts and
 * manual entries, each labeled with its source. Filterable by search, date
 * range, account, transaction category, type, and source; paginated,
 * exportable, with editable names and budget-category assignment.
 */
export default function TransactionsTable({
  transactions,
  bills,
  accounts = [],
  categories = [],
  categoryRemaining = {},
  busy,
  onAddBill,
  onSaveTransaction,
  onSuggestCategories,
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [account, setAccount] = useState('all');
  const [source, setSource] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null); // { transaction, name, category }
  const [saveError, setSaveError] = useState('');

  const rows = useMemo(
    () => transactions.slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [transactions]
  );

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
      if (category !== 'all') {
        const value = t.category || 'Uncategorized';
        if (category === UNCATEGORIZED ? value !== 'Uncategorized' : value !== category) return false;
      }
      if (type !== 'all' && (t.type === 'income' ? 'income' : 'expense') !== type) return false;
      if (account !== 'all' && (t.plaid_account_id || '') !== account) return false;
      if (source !== 'all' && (source === 'synced') !== isSynced(t)) return false;
      if (dateFrom && (t.date ?? '') < dateFrom) return false;
      if (dateTo && (t.date ?? '') > dateTo) return false;
      if (!q) return true;
      const haystack = `${t.description ?? ''} ${t.category ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, category, type, account, source, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [search, category, type, account, source, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min(visible.length, safePage * PAGE_SIZE + PAGE_SIZE);

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editing || busy) return;
    setSaveError('');
    try {
      await onSaveTransaction(editing.transaction.id, {
        description: String(editing.name ?? '').trim() || 'Unnamed',
        category: String(editing.category ?? ''),
      });
      setEditing(null);
    } catch {
      setSaveError('Unable to save. Please try again.');
    }
  };

  const exportCsv = () => {
    const lines = [
      ['Date', 'Name', 'Account', 'Transaction category', 'Type', 'Amount', 'Source'].join(','),
      ...visible.map((t) =>
        [
          t.date ?? '',
          t.description ?? '',
          accountNames.find((a) => a.id === t.plaid_account_id)?.name ?? '',
          t.category ?? '',
          t.type ?? '',
          String(t.amount ?? ''),
          isSynced(t) ? 'Synced' : 'Manual',
        ]
          .map(csvCell)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">All transactions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Linked-bank charges and manual entries combined. Highlighted charges look recurring — add them as tracked bills.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onSuggestCategories}
            disabled={busy}
            className="min-h-11 rounded-xl"
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Suggest categories
          </Button>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="min-h-11 rounded-xl"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="mt-4 flex w-full flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions"
            aria-label="Search transactions"
            className="w-full pl-9"
          />
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          className="w-full rounded-xl"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          className="w-full rounded-xl"
        />
        <Select value={account} onValueChange={setAccount}>
          <SelectTrigger className="w-full" aria-label="Filter by account">
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
          <SelectTrigger className="w-full" aria-label="Filter by transaction category">
            <SelectValue placeholder="All transaction categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All transaction categories</SelectItem>
            <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full" aria-label="Filter by type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="expense">Expenses</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full" aria-label="Filter by source">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="synced">Synced (linked bank)</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageRows.length === 0 ? (
        <p className="mt-4 text-base text-muted-foreground">
          {rows.length === 0 ? 'No transactions yet.' : 'No transactions match these filters.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Transaction category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((t) => {
                const isIncome = t.type === 'income';
                const candidate = !isIncome ? recurringByName.get(normalizeName(t.description || t.category)) : null;
                const isRecurring = Boolean(candidate) && !savedNames.has(normalizeName(t.description || t.category));
                const isTracked = Boolean(candidate) && savedNames.has(normalizeName(t.description || t.category));
                const synced = isSynced(t);
                return (
                  <TableRow key={t.id} className={isRecurring ? 'bg-warning-surface' : undefined}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{t.date}</TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center gap-1">
                        {t.description || 'Unnamed'}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSaveError('');
                            setEditing({ transaction: t, name: t.description || '', category: t.category || '' });
                          }}
                          disabled={busy}
                          aria-label={`Edit ${t.description || 'transaction'}`}
                          className="h-7 w-7"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {accountNames.find((a) => a.id === t.plaid_account_id)?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {t.category || 'Uncategorized'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {synced ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-info-surface px-2 py-0.5 text-xs font-medium text-info">
                          <RefreshCw className="h-3 w-3" aria-hidden="true" />
                          Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          <Keyboard className="h-3 w-3" aria-hidden="true" />
                          Manual
                        </span>
                      )}
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

      {visible.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm tabular-nums text-muted-foreground">
            Showing {rangeStart}–{rangeEnd} of {visible.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="min-h-9 rounded-lg"
            >
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="min-h-9 rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
            <DialogDescription>{editing?.transaction?.date || ''}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitEdit}>
            <div className="space-y-1.5">
              <Label htmlFor="txn-name">Name / description</Label>
              <Input
                id="txn-name"
                value={editing?.name ?? ''}
                onChange={(e) => setEditing((cur) => ({ ...cur, name: e.target.value }))}
                placeholder="McDonald's"
                className="min-h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-category">Transaction category</Label>
              <Select
                value={editing?.category || UNCATEGORIZED}
                onValueChange={(value) =>
                  setEditing((cur) => ({ ...cur, category: value === UNCATEGORIZED ? '' : value }))
                }
              >
                <SelectTrigger id="txn-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name} · {formatCurrency(categoryRemaining[c.name] ?? 0)} left
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assigning a budget category counts this transaction toward that category's monthly spending.
              </p>
            </div>
            {saveError && <p role="alert" className="text-base text-danger-text">{saveError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>Save transaction</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}