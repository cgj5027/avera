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
  const monthlyIncome = calc.monthlyIncomeTotal(incomes);
  const monthlyExpenses = calc.totalMonthlyExpenses({ bills, budgetCategories, properties, mortgages });
  const cash = calc.availableCash(accounts);
  const remaining = calc.calculateProjectedRemaining(monthlyIncome, monthlyExpenses);
  const upcoming = calc.upcomingBills(bills, 30);
  const projection = calc.projectYearlyPlan({ incomes, bills, budgetCategories, properties, mortgages, accounts, months: 6 });
  const hasData = accounts.length || incomes.length || bills.length || budgetCategories.length || properties.length;

  const SUMMARY = [
    {
      label: 'Available cash',
      value: accounts.length ? formatCurrency(cash) : '—',
      source: 'Manual',
      note: accounts.length ? 'Across your saved accounts.' : 'Add an account below to see your balance.',
    },
    {
      label: 'Monthly income',
      value: incomes.length ? formatCurrency(monthlyIncome) : '—',
      source: 'Manual',
      note: incomes.length ? 'Income sources normalized to a month.' : 'Add income sources in Yearly Plan.',
    },
    {
      label: 'Monthly expenses',
      value: bills.length || budgetCategories.length || properties.length ? formatCurrency(monthlyExpenses) : '—',
      source: 'Manual',
      note: 'Bills, budget limits, and property costs.',
    },
    {
      label: 'Projected remaining',
      value: incomes.length || bills.length || budgetCategories.length ? formatCurrency(remaining) : '—',
      source: 'Estimated',
      note: 'Monthly income minus monthly expenses.',
    },
    {
      label: 'Upcoming bills',
      value: bills.length ? String(upcoming.length) : '—',
      source: 'Manual',
      note: 'Unpaid bills due in the next 30 days.',
    },
  ];

  const accountDialogNode = (
    <>
      <AccountDialog
        open={accountDialog.open}
        onOpenChange={(open) => setAccountDialog((d) => ({ ...d, open }))}
        account={accountDialog.account}
        onSave={saveAccount}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {SUMMARY.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} source={card.source} note={card.note} />
        ))}
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
        <FinancialHealthCard monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
        <OverviewAccounts
          accounts={accounts}
          busy={busy}
          onDelete={setDeleteTarget}
          onOpenDialog={(account) => setAccountDialog({ open: true, account })}
          dialog={accountDialogNode}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {hasData ? <OverviewChart rows={projection.rows} /> : <ChartPlaceholder />}
        </div>
        <BudgetProgress categories={budgetCategories} transactions={transactions} />
      </div>
      <div className="mt-6">
        <UpcomingBillsList bills={upcoming} />
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