import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import SummaryCard from '@/components/finance/SummaryCard';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import BillCard from '@/components/bills/BillCard';
import BillDialog from '@/components/bills/BillDialog';
import CategoryCard from '@/components/budget/CategoryCard';
import CategoryDialog from '@/components/budget/CategoryDialog';
import LogSpendingDialog from '@/components/budget/LogSpendingDialog';
import { base44 } from '@/api/base44Client';
import { createRecord, updateRecord, deleteRecord } from '@/services/dataService';
import * as calc from '@/services/financialCalculations';
import { formatCurrency, todayISO } from '@/utils/format';

/** Bills & Budget: recurring bill management plus monthly budget categories. */
export default function BillsBudget() {
  const [bills, setBills] = useState(null);
  const [categories, setCategories] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [billDialog, setBillDialog] = useState({ open: false, bill: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [logDialog, setLogDialog] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      base44.entities.Bill.filter({}),
      base44.entities.BudgetCategory.filter({}),
      base44.entities.Transaction.filter({}),
    ])
      .then(([b, c, t]) => {
        if (!cancelled) {
          setBills(b);
          setCategories(c);
          setTransactions(t);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const run = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      if (message) toast({ title: message });
      reload();
    } finally {
      setBusy(false);
    }
  };

  const saveBill = (payload) =>
    run(
      () => (billDialog.bill ? updateRecord('bill', billDialog.bill.id, payload) : createRecord('bill', payload)),
      billDialog.bill ? 'Bill updated' : 'Bill added'
    );

  const markPaid = (bill) =>
    run(
      () =>
        updateRecord('bill', bill.id, {
          paid_this_cycle: true,
          last_paid_date: todayISO(),
          next_due_date: bill.next_due_date ? calc.addFrequency(bill.next_due_date, bill.frequency) : bill.next_due_date,
        }),
      'Bill marked paid — next due date scheduled'
    );

  const saveCategory = (payload) =>
    run(
      () =>
        categoryDialog.category
          ? updateRecord('budgetCategory', categoryDialog.category.id, payload)
          : createRecord('budgetCategory', payload),
      categoryDialog.category ? 'Category updated' : 'Category added'
    );

  const logSpending = (category, payload) => run(() => createRecord('transaction', payload), 'Spending logged');

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, record } = deleteTarget;
    if (kind === 'bill') await run(() => deleteRecord('bill', record.id), 'Bill deleted');
    else await run(() => deleteRecord('budgetCategory', record.id), 'Category deleted');
    setDeleteTarget(null);
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState message="We couldn't load Bills & Budget. Your data is safe — try again." onRetry={reload} />
      </div>
    );
  }
  if (!bills || !categories || !transactions) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <LoadingState label="Loading Bills & Budget" />
      </div>
    );
  }

  const sortedBills = bills
    .slice()
    .sort((a, b) =>
      a.paid_this_cycle === b.paid_this_cycle
        ? (a.next_due_date ?? '9999').localeCompare(b.next_due_date ?? '9999')
        : a.paid_this_cycle
          ? 1
          : -1
    );

  const range = calc.monthRange();
  const limitsTotal = calc.budgetLimitsTotal(categories);
  const spentTotal = calc.spentInMonth(transactions, null, range);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Bills & Budget" subtitle="Due dates, recurring bills, and category budgets." />
      <Tabs defaultValue="bills">
        <TabsList className="mb-6">
          <TabsTrigger value="bills" className="min-h-9 rounded-lg px-4">Bills</TabsTrigger>
          <TabsTrigger value="budget" className="min-h-9 rounded-lg px-4">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="mt-0 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBillDialog({ open: true, bill: null })} className="min-h-11 rounded-xl px-4">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add bill
            </Button>
          </div>
          {bills.length === 0 ? (
            <EmptyState
              heading="No bills yet"
              description="Add your first recurring bill — amount, frequency, due date, and a reminder. Status and monthly totals update automatically."
            />
          ) : (
            sortedBills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                busy={busy}
                onEdit={(b) => setBillDialog({ open: true, bill: b })}
                onDelete={(b) => setDeleteTarget({ kind: 'bill', record: b })}
                onMarkPaid={markPaid}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="budget" className="mt-0 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Monthly limits" value={formatCurrency(limitsTotal)} source="Manual" />
            <SummaryCard label="Spent this month" value={formatCurrency(spentTotal)} source="Manual" note="From logged spending." />
            <SummaryCard
              label="Remaining this month"
              value={formatCurrency(limitsTotal - spentTotal)}
              source="Estimated"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setCategoryDialog({ open: true, category: null })} className="min-h-11 rounded-xl px-4">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add budget category
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState
              heading="No budget categories yet"
              description="Create spending categories with monthly limits, then log spending against them to see progress and remaining amounts."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  spent={calc.spentInMonth(transactions, category.name, range)}
                  busy={busy}
                  onEdit={(c) => setCategoryDialog({ open: true, category: c })}
                  onDelete={(c) => setDeleteTarget({ kind: 'category', record: c })}
                  onLogSpending={(c) => setLogDialog(c)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BillDialog
        open={billDialog.open}
        onOpenChange={(open) => setBillDialog((d) => ({ ...d, open }))}
        bill={billDialog.bill}
        onSave={saveBill}
      />
      <CategoryDialog
        open={categoryDialog.open}
        onOpenChange={(open) => setCategoryDialog((d) => ({ ...d, open }))}
        category={categoryDialog.category}
        onSave={saveCategory}
      />
      {logDialog && (
        <LogSpendingDialog
          open
          onOpenChange={(open) => {
            if (!open) setLogDialog(null);
          }}
          category={logDialog}
          onSave={(payload) => logSpending(logDialog, payload)}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.record?.name ?? 'record'}?`}
        description={
          deleteTarget?.kind === 'bill'
            ? 'This removes the bill and its schedule. This cannot be undone.'
            : 'This removes the category and its limit. Logged spending stays in your history. This cannot be undone.'
        }
        onConfirm={confirmDelete}
        busy={busy}
      />
    </div>
  );
}