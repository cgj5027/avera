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
import MonthlyAllocationChart from '@/components/overview/MonthlyAllocationChart';
import BudgetProgress from '@/components/overview/BudgetProgress';
import UpcomingBillsList from '@/components/overview/UpcomingBillsList';
import MonthlyFlowCards from '@/components/overview/MonthlyFlowCards';
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
  const monthlyIncome = calc.monthlyIncomeTotal(incomes);
  const monthlyExpenses = calc.totalMonthlyExpenses({ bills, budgetCategories, properties, mortgages });
  const cash = calc.availableCash(accounts);
  const upcoming = calc.upcomingBills(bills, 30);

  /* Current-month figures: actual transactions this month, with normalized monthly estimates as fallback. */
  const currentMonth = calc.monthRange();
  const monthTxIncome = calc.incomeInMonth(transactions, currentMonth);
  const monthTxExpenses = calc.spentInMonth(transactions, null, currentMonth);
  /* Expenses this month matched to tracked bills count as recurring paid; the rest is additional spending. */
  const recurringPaid = calc.recurringPaidInMonth(transactions, bills, currentMonth);
  const additionalSpent = calc.round2(monthTxExpenses - recurringPaid);
  const creditCards = accounts.filter((a) => a.type === 'credit_card');
  const debts = calc.totalDebt(mortgages, accounts);
  const projection = calc.projectYearlyPlan({
    incomes,
    bills,
    budgetCategories,
    properties,
    mortgages,
    accounts,
    months: 4,
    estimate: { income: est.hasData ? est.monthlyIncome : 0, expenses: est.hasData ? est.monthlyExpenses : 0 },
  });
  const hasData = accounts.length || incomes.length || bills.length || budgetCategories.length || properties.length || est.hasData;

  /* Row two: monthly income, recurring expenses, and additional (non-recurring) expenses. */
  const flow = {
    income: {
      projected: incomes.length
        ? { value: formatCurrency(monthlyIncome), note: 'From income sources in Yearly Plan.' }
        : est.hasData
          ? { value: formatCurrency(est.monthlyIncome), note: `Estimated from ${est.months} months of linked transactions.` }
          : { value: '—', note: 'Add income sources in Yearly Plan.' },
      tracked: {
        value: formatCurrency(monthTxIncome),
        note: 'From income transactions tracked in the Transactions tab.',
      },
    },
    recurring: {
      projected: monthlyExpenses > 0
        ? { value: formatCurrency(monthlyExpenses), note: 'From bills, budget limits, and property costs.' }
        : est.hasData
          ? { value: formatCurrency(est.monthlyExpenses), note: `Estimated from ${est.months} months of linked transactions.` }
          : { value: '—', note: 'Add bills in Bills & Budget.' },
      tracked: {
        value: formatCurrency(recurringPaid),
        note: 'Paid this month, matched to your tracked bills.',
      },
    },
    additional: {
      projected: {
        value: formatCurrency(additionalSpent),
        note: 'Spending this month outside your tracked recurring bills.',
      },
    },
  };

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          label="Available cash"
          value={accounts.length ? formatCurrency(cash) : '—'}
          note={accounts.length ? 'Across your saved accounts.' : 'Add an account in the Accounts card below.'}
          hint={accounts.length ? 'Combined checking, savings and cash balances. Credit liabilities and investments are excluded.' : null}
        />
        <SummaryCard
          label="Total debts"
          value={mortgages.length || creditCards.length ? formatCurrency(debts) : '—'}
          note={mortgages.length || creditCards.length ? 'Mortgages and credit cards owed.' : 'Add a mortgage in Properties or a credit card in Accounts.'}
          hint={mortgages.length || creditCards.length ? 'Outstanding mortgage balances plus credit card balances owed.' : null}
        />
      </div>
      <div className="mt-4">
        <MonthlyFlowCards flow={flow} />
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
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MonthlyAllocationChart projection={projection} hasIncome={incomes.length > 0 || est.hasData} hasExpenses={bills.length > 0 || budgetCategories.length > 0 || properties.length > 0 || est.hasData} />
        <div className="min-w-0 lg:col-span-2">
          {hasData ? <OverviewChart rows={projection.rows} /> : <ChartPlaceholder />}
        </div>
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
