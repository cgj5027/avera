import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import SummaryCard from '@/components/finance/SummaryCard';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import ChartPlaceholder from '@/components/overview/ChartPlaceholder';
import NextSteps from '@/components/overview/NextSteps';
import OverviewChart from '@/components/overview/OverviewChart';
import BudgetProgress from '@/components/overview/BudgetProgress';
import UpcomingBillsList from '@/components/overview/UpcomingBillsList';
import FinancialHealthCard from '@/components/overview/FinancialHealthCard';
import OverviewAccounts from '@/components/overview/OverviewAccounts';
import AccountDialog from '@/components/accounts/AccountDialog';
import AskAveraDrawer from '@/components/askavera/AskAveraDrawer';
import { hasChosenMode } from '@/lib/mode';
import { listRecords, createRecord, updateRecord, deleteRecord } from '@/services/dataService';
import * as calc from '@/services/financialCalculations';
import { estimateFromTransactions } from '@/services/plaidEstimates';
import { connectBank } from '@/services/plaidClient';
import { formatCurrency } from '@/utils/format';

/** Overview dashboard — every figure is calculated from the user's saved records. */
export default function Overview() {
  const navigate = useNavigate();
  const launcherRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [accountDialog, setAccountDialog] = useState({ open: false, account: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  /* First-run: route to the mode-entry screen before showing the shell. */
  useEffect(() => {
    if (!hasChosenMode()) navigate('/welcome', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    Promise.all([
      listRecords('account'),
      listRecords('incomeSource'),
      listRecords('bill'),
      listRecords('budgetCategory'),
      listRecords('transaction'),
      listRecords('property'),
      listRecords('mortgageRecord'),
    ])
      .then(([accounts, incomes, bills, budgetCategories, transactions, properties, mortgages]) => {
        if (!cancelled) setData({ accounts, incomes, bills, budgetCategories, transactions, properties, mortgages });
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const saveAccount = async (payload) => {
    setBusy(true);
    try {
      if (accountDialog.account) await updateRecord('account', accountDialog.account.id, payload);
      else await createRecord('account', payload);
      toast({ title: accountDialog.account ? 'Account updated' : 'Account added' });
      setAccountDialog({ open: false, account: null });
      reload();
    } catch (err) {
      toast({ title: 'Changes could not be saved', description: 'Please try again. Some changes may have completed.', variant: 'destructive' });
      reload();
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteAccount = async () => {
    setBusy(true);
    try {
      await deleteRecord('account', deleteTarget.id);
      setDeleteTarget(null);
      toast({ title: 'Account deleted' });
      reload();
    } catch (err) {
      toast({ title: 'Changes could not be saved', description: 'Please try again. Some changes may have completed.', variant: 'destructive' });
      reload();
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const connectPlaid = async () => {
    setAccountDialog({ open: false, account: null });
    setBusy(true);
    try {
      await connectBank();
      toast({ title: 'Test bank connected', description: 'Accounts were imported from the Plaid Sandbox.' });
    } catch (e) {
      toast({ title: 'Connection not completed', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
      reload();
    }
  };

  const handleDrawerChange = useCallback((open) => {
    setDrawerOpen(open);
    if (!open) requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState message="We couldn't load your overview. Your data is safe — try again." onRetry={reload} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <LoadingState label="Loading Overview" />
      </div>
    );
  }

  const { accounts, incomes, bills, budgetCategories, transactions, properties, mortgages } = data;
  const est = estimateFromTransactions(transactions);
  // Linked accounts fill only the gaps manual records leave.
  const linkedIncome = !incomes.length && est.hasData ? est.monthlyIncome : 0;
  const linkedExpenses = !(bills.length || budgetCategories.length || properties.length) && est.hasData ? est.monthlyExpenses : 0;
  const monthlyIncome = calc.monthlyIncomeTotal(incomes);
  const monthlyExpenses = calc.totalMonthlyExpenses({ bills, budgetCategories, properties, mortgages });
  const cash = calc.availableCash(accounts);
  const upcoming = calc.upcomingBills(bills, 30);

  /* Current-month figures: actual transactions this month, with normalized monthly estimates as fallback. */
  const currentMonth = calc.monthRange();
  const monthTxIncome = calc.incomeInMonth(transactions, currentMonth);
  const monthTxExpenses = calc.spentInMonth(transactions, null, currentMonth);
  const plaidThisMonth = transactions.some((t) => t.plaid_item_id && t.date >= currentMonth.start && t.date <= currentMonth.end);
  const txSource = plaidThisMonth ? 'Plaid Sandbox' : 'Manual';
  const projection = calc.projectYearlyPlan({
    incomes,
    bills,
    budgetCategories,
    properties,
    mortgages,
    accounts,
    months: 6,
    estimate: { income: est.hasData ? est.monthlyIncome : 0, expenses: est.hasData ? est.monthlyExpenses : 0 },
  });
  const hasData = accounts.length || incomes.length || bills.length || budgetCategories.length || properties.length;

  const SUMMARY = [
    {
      label: 'Available cash',
      value: accounts.length ? formatCurrency(cash) : '—',
      source: 'Manual',
      note: accounts.length ? 'Across your saved accounts.' : 'Add an account in the Accounts card below.',
    },
    {
      label: 'Income this month',
      value: monthTxIncome || incomes.length || linkedIncome ? formatCurrency(monthTxIncome || monthlyIncome + linkedIncome) : '—',
      source: monthTxIncome ? txSource : incomes.length ? 'Manual' : linkedIncome ? 'Plaid Sandbox' : 'Manual',
      note: monthTxIncome
        ? "From this month's income transactions."
        : incomes.length
          ? 'Income sources normalized to a month.'
          : linkedIncome
            ? `Estimated from ${est.months} months of linked transactions.`
            : 'Add income sources in Yearly Plan.',
    },
    {
      label: 'Expenses this month',
      value: monthTxExpenses || bills.length || budgetCategories.length || properties.length || linkedExpenses ? formatCurrency(monthTxExpenses || monthlyExpenses + linkedExpenses) : '—',
      source: monthTxExpenses ? txSource : bills.length || budgetCategories.length || properties.length ? 'Manual' : linkedExpenses ? 'Plaid Sandbox' : 'Manual',
      note: monthTxExpenses
        ? "From this month's transactions."
        : bills.length || budgetCategories.length || properties.length
          ? 'Bills, budget limits, and property costs.'
          : linkedExpenses
            ? `Estimated from ${est.months} months of linked transactions.`
            : 'Bills, budget limits, and property costs.',
    },
  ];

  const accountDialogNode = (
    <>
      <AccountDialog
        open={accountDialog.open}
        onOpenChange={(open) => setAccountDialog((d) => ({ ...d, open }))}
        account={accountDialog.account}
        onSave={saveAccount}
        onConnectPlaid={connectPlaid}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.name ?? 'account'}?`}
        description="This removes the account and its balance from your available cash. This cannot be undone."
        onConfirm={confirmDeleteAccount}
        busy={busy}
      />
    </>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Overview"
        subtitle="A calm view of your household money."
        actions={
          <>
            <Button ref={launcherRef} onClick={() => setDrawerOpen(true)} className="min-h-11 rounded-xl px-4">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Ask Avera
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} source={card.source} note={card.note} />
        ))}
        <FinancialHealthCard monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      </div>
      {!hasData && (
        <div className="mt-6">
          <EmptyState
            heading="Your overview is ready for your data"
            description="Add an account, an income source, a bill, or a budget category — every figure here is then calculated from what you saved. Nothing is estimated behind your back."
          />
        </div>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BudgetProgress categories={budgetCategories} transactions={transactions} />
        <UpcomingBillsList bills={upcoming} />
      </div>
      <div className="mt-6">
        {hasData ? <OverviewChart rows={projection.rows} /> : <ChartPlaceholder />}
      </div>
      <div className="mt-6">
        <OverviewAccounts
          accounts={accounts}
          busy={busy}
          onDelete={setDeleteTarget}
          onOpenDialog={(account) => setAccountDialog({ open: true, account })}
          dialog={accountDialogNode}
        />
      </div>
      {!hasData && (
        <div className="mt-6">
          <NextSteps />
        </div>
      )}
      <AskAveraDrawer open={drawerOpen} onOpenChange={handleDrawerChange} />
    </div>
  );
}