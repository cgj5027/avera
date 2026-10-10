import { useMemo, useState } from 'react';
import { Search, Repeat, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { importedTransactions, estimateBillCandidates, normalizeName } from '@/services/plaidEstimates';
import { formatCurrency } from '@/utils/format';

/**
 * Combined table of transactions imported from linked Plaid accounts.
 * Searchable and filterable; expense rows matching a detected recurring
 * pattern are highlighted with an "Add as bill" action.
 */
export default function TransactionsTable({ transactions, bills, busy, onAddBill }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');

  const rows = useMemo(
    () => importedTransactions(transactions).slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [transactions]
  );

  const categories = useMemo(() => {
    const values = [...new Set(rows.map((t) => t.category).filter(Boolean))];
    return values.sort((a, b) => a.localeCompare(b));
  }, [rows]);

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
      if (!q) return true;
      const haystack = `${t.description ?? ''} ${t.category ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, category, type]);

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
              className="w-48 pl-9 sm:w-56"
            />
          </div>
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
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {t.category || 'Uncategorized'}
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
    </section>
  );
}