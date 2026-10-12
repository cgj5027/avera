import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { getDataMode, getDemoWorkspace } from '@/lib/mode';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/layout/PageHeader';
import SummaryCard from '@/components/finance/SummaryCard';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import BillSuggestions from '@/components/bills/BillSuggestions';
import BillCard from '@/components/bills/BillCard';
import BillDialog from '@/components/bills/BillDialog';
import TransactionsTable from '@/components/bills/TransactionsTable';
import ManualTransactionDialog from '@/components/bills/ManualTransactionDialog';
import SuggestedBudgetCategories from '@/components/budget/SuggestedBudgetCategories';
import CategoryCard from '@/components/budget/CategoryCard';
import LinkedTransactionsDialog from '@/components/budget/LinkedTransactionsDialog';
import CategoryDialog from '@/components/budget/CategoryDialog';
import LogSpendingDialog from '@/components/budget/LogSpendingDialog';
import GoalsSection from '@/components/goals/GoalsSection';
import { listRecords, createRecord, updateRecord, deleteRecord, logGoalContribution, assignTransactionCategory } from '@/services/dataService';
import * as calc from '@/services/financialCalculations';
import { importedTransactions, estimateBillCandidates, normalizeName } from '@/services/plaidEstimates';
import { formatCurrency, monthLabel, todayISO } from '@/utils/format';

/** Bills & Budget: recurring bill management plus monthly budget categories. */
export default function BillsBudget() {
  const [bills, setBills] = useState(null);
  const [categories, setCategories] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [goals, setGoals] = useState(null);
  const [incomes, setIncomes] = useState(null);
  const [properties, setProperties] = useState(null);
  const [mortgages, setMortgages] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [billDialog, setBillDialog] = useState({ open: false, bill: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null });
  const [logDialog, setLogDialog] = useState(null);
  const [addTxnOpen, setAddTxnOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [linkedDialog, setLinkedDialog] = useState(null);
  const [budgetMonth, setBudgetMonth] = useState(() => calc.monthRange().key);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([
      listRecords('bill'),
      listRecords('budgetCategory'),
      listRecords('transaction'),
      listRecords('account'),
      listRecords('goal'),
      listRecords('incomeSource'),
      listRecords('property'),
      listRecords('mortgageRecord'),
    ])
      .then(([b, c, t, a, g, inc, p, m]) => {
        if (!cancelled) {
          setBills(b);
          setCategories(c);
          setTransactions(t);
          setAccounts(a);
          setGoals(g);
          setIncomes(inc);
          setProperties(p);
          setMortgages(m);
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
    } catch (err) {
      toast({ title: 'Changes could not be saved', description: 'Please try again. Some changes may have completed.', variant: 'destructive' });
      reload();
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const saveBill = (payload) =>
    run(
      () => (billDialog.bill ? updateRecord('bill', billDialog.bill.id, payload) : createRecord('bill', payload)),
      billDialog.bill ? 'Bill updated' : 'Bill added'
    );

  const addBillFromCandidate = (candidate) =>
    run(
      () =>
        createRecord('bill', {
          name: candidate.name,
          amount: candidate.amount,
          frequency: candidate.frequency,
          next_due_date: candidate.next_due_date,
          category: candidate.category,
          source: 'Plaid Sandbox',
          notes: `Estimated from ${candidate.months_seen} months of linked transactions.`,
        }),
      'Bill added from linked transactions'
    );

  const markPaid = (bill) =>
    run(
      () =>
        updateRecord('bill', bill.id, {
          paid_this_cycle: false,
          recurrence_day: bill.recurrence_day ?? Number(bill.next_due_date?.slice(-2)),
          last_paid_date: todayISO(),
          next_due_date: bill.next_due_date ? calc.addFrequency(bill.next_due_date, bill.frequency, bill.recurrence_day) : bill.next_due_date,
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

  const confirmSuggestedCategory = (name, monthly_limit) =>
    run(() => createRecord('budgetCategory', { name, monthly_limit }), 'Category added');

  const saveTransactionRow = (id, payload) =>
    run(async () => {
      const saved = await assignTransactionCategory(id, payload.category);
      setTransactions(rows => rows.map(row => row.id === id ? {...row, ...saved, category: saved.category} : row));
    }, 'Transaction updated');

  const suggestCategories = () =>
    run(async () => {
      const res = await base44.functions.invoke('suggestCategories', {dataset:getDataMode()==='demo'?{mode:'demo',profile:getDemoWorkspace()?.profile}:{mode:'ordinary'}});
      if (res.data?.error) throw new Error(res.data.error);
    }, 'Categories suggested for your transactions');

  const logSpending = (category, payload) => run(() => category._transaction ? updateRecord('transaction', category._transaction.id, payload) : createRecord('transaction', payload), category._transaction ? 'Spending updated' : 'Spending logged');

  const addManualTransaction = (payload) =>
    run(() => createRecord('transaction', payload), 'Transaction added');

  const saveGoal = (goal, payload) =>
    run(
      () => (goal ? updateRecord('goal', goal.id, payload) : createRecord('goal', payload)),
      goal ? 'Goal updated' : 'Goal added'
    );

  const applyContribution = (goalId, amount, requestId) =>
    run(() => logGoalContribution(goalId, amount, requestId), 'Contribution logged');

  const markNotRecurring = (transaction) =>
    run(
      () => updateRecord('transaction', transaction.id, { not_recurring: true }),
      'Marked as not recurring — future charges with this name stay unflagged'
    );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { kind, record } = deleteTarget;
    if (kind === 'bill') await run(() => deleteRecord('bill', record.id), 'Bill deleted');
    else if (kind === 'transaction') await run(() => deleteRecord('transaction', record.id), 'Spending deleted');
    else if (kind === 'goal') await run(() => deleteRecord('goal', record.id), 'Goal deleted');
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
  if (!bills || !categories || !transactions || !accounts || !goals || !incomes || !properties || !mortgages) {
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

  /* The Budget tab tracks one month at a time; linked and logged spending count in their own month. */
  const range = calc.monthRange(new Date(`${budgetMonth}-01T00:00:00`));

  /* Months with activity, newest first — the current month is always selectable. */
  const monthOptions = [
    ...new Set([
      calc.monthRange().key,
      ...transactions.map((t) => (t.date ?? '').slice(0, 7)).filter(Boolean),
    ]),
  ].sort().reverse();
  /* Goals tab: monthly savings capacity from income sources minus recurring expenses. */
  const monthlyIncome = calc.monthlyIncomeTotal(incomes);
  const monthlyExpenses = calc.totalMonthlyExpenses({ bills, budgetCategories: categories, properties, mortgages });
  const limitsTotal = calc.budgetLimitsTotal(categories);
  const spentTotal = calc.spentInMonth(transactions, null, range);

  /* Combined linked-account transactions get their own tab, next to the bills they can become. */
  const linkedTransactions = importedTransactions(transactions);
  const recurringCount = estimateBillCandidates(linkedTransactions).filter(
    (c) => !bills.some((b) => normalizeName(b.name) === normalizeName(c.name))
  ).length;

  const remainingByCategory = {};
  for (const c of categories) {
    remainingByCategory[c.name] = (Number(c.monthly_limit) || 0) - calc.spentInMonth(transactions, c.name, range);
  }

  /* Transactions linked to a budget category (by name) within the selected month, newest first. */
  const linkedForCategory = (name) =>
    transactions
      .filter((t) => !t.exclude_from_cashflow && t.type !== 'income' && t.category === name && t.date >= range.start && t.date <= range.end)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Bills & Budget" subtitle="Due dates, recurring bills, and category budgets." />
      <Tabs defaultValue="bills">
        <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
          <TabsTrigger value="bills" className="min-h-11 rounded-xl px-4">Bills</TabsTrigger>
          <TabsTrigger value="budget" className="min-h-11 rounded-xl px-4">Budget</TabsTrigger>
          <TabsTrigger value="goals" className="min-h-11 rounded-xl px-4">Goals</TabsTrigger>
          {transactions.length > 0 && (
            <TabsTrigger value="transactions" className="min-h-11 rounded-xl px-4">
              Transactions
              {recurringCount > 0 && (
                <span className="ml-2 rounded-full bg-warning-surface px-2 py-0.5 text-xs font-medium text-warning">
                  {recurringCount} recurring
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="bills" className="mt-0 space-y-4">
          <BillSuggestions onAdded={reload}>
            <Button onClick={() => setBillDialog({ open: true, bill: null })} className="min-h-11 rounded-xl gap-1 px-3">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add bill
            </Button>
          </BillSuggestions>
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
            <SummaryCard label={`Spent in ${monthLabel(budgetMonth)}`} value={formatCurrency(spentTotal)} source="Manual" note="From linked and logged spending." />
            <SummaryCard
              label={`Remaining in ${monthLabel(budgetMonth)}`}
              value={formatCurrency(limitsTotal - spentTotal)}
              source="Estimated"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="budget-month" className="text-sm text-muted-foreground">Month</Label>
              <Select value={budgetMonth} onValueChange={setBudgetMonth}>
                <SelectTrigger id="budget-month" aria-label="Budget month" className="w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((key) => (
                    <SelectItem key={key} value={key}>{monthLabel(key)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setCategoryDialog({ open: true, category: null })} className="min-h-11 rounded-xl px-4">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Add budget category
            </Button>
          </div>
          <SuggestedBudgetCategories categories={categories} busy={busy} onConfirm={confirmSuggestedCategory} />
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
                  onViewTransactions={(c) => setLinkedDialog(c)}
                  transactionCount={linkedForCategory(category.name).length}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-0">
          <GoalsSection
            goals={goals}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
            busy={busy}
            onSaveGoal={saveGoal}
            onApplyContribution={applyContribution}
            onDelete={(g) => setDeleteTarget({ kind: 'goal', record: g })}
          />
        </TabsContent>

        {transactions.length > 0 && (
          <TabsContent value="transactions" className="mt-0">
            <TransactionsTable
              transactions={transactions}
              bills={bills}
              accounts={accounts.filter((a) => a.plaid_item_id)}
              categories={categories}
              categoryRemaining={remainingByCategory}
              busy={busy}
              onAddBill={addBillFromCandidate}
              onSaveTransaction={saveTransactionRow}
              onAddTransaction={() => setAddTxnOpen(true)}
              onMarkNotRecurring={markNotRecurring}
              onSuggestCategories={suggestCategories}
            />
          </TabsContent>
        )}
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
          transaction={logDialog._transaction}
          onSave={(payload) => logSpending(logDialog, payload)}
        />
      )}
      <ManualTransactionDialog
        open={addTxnOpen}
        onOpenChange={setAddTxnOpen}
        categories={categories}
        onSave={addManualTransaction}
      />
      {linkedDialog && (
        <LinkedTransactionsDialog
          open
          onOpenChange={(open) => {
            if (!open) setLinkedDialog(null);
          }}
          category={linkedDialog}
          monthLabel={monthLabel(budgetMonth)}
          transactions={linkedForCategory(linkedDialog.name)}
          busy={busy}
          onEditTransaction={(tx) => setLogDialog({ ...linkedDialog, _transaction: tx })}
          onDeleteTransaction={(tx) => setDeleteTarget({ kind: 'transaction', record: tx })}
        />
      )}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.record?.name ?? deleteTarget?.record?.description ?? 'record'}?`}
        description={
          deleteTarget?.kind === 'transaction'
            ? 'This removes the spending entry and recalculates budget totals. This cannot be undone.'
            : deleteTarget?.kind === 'bill'
            ? 'This removes the bill and its schedule. This cannot be undone.'
            : deleteTarget?.kind === 'goal'
            ? 'This removes the goal and its progress. This cannot be undone.'
            : 'This removes the category and its limit. Logged spending stays in your history. This cannot be undone.'
        }
        onConfirm={confirmDelete}
        busy={busy}
      />
    </div>
  );
}