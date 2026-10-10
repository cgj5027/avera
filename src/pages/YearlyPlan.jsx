import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import SummaryCard from '@/components/finance/SummaryCard';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import MonthlyPlanChart from '@/components/yearlyplan/MonthlyPlanChart';
import AssumptionsPanel from '@/components/yearlyplan/AssumptionsPanel';
import IncomeCard from '@/components/income/IncomeCard';
import IncomeDialog from '@/components/income/IncomeDialog';
import { listRecords, createRecord, updateRecord, deleteRecord, getHouseholdProfile } from '@/services/dataService';
import * as calc from '@/services/financialCalculations';
import { estimateFromTransactions } from '@/services/plaidEstimates';
import { formatCurrency, formatDate } from '@/utils/format';

/** Yearly Plan: live projection from income, bills, budget limits, and property costs. */
export default function YearlyPlan() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [incomeDialog, setIncomeDialog] = useState({ open: false, income: null });
  const [deleteIncome, setDeleteIncome] = useState(null);
  const [deleteForecast, setDeleteForecast] = useState(null);
  const [defaultFrequency, setDefaultFrequency] = useState('monthly');
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getHouseholdProfile()
      .then((profile) => {
        if (!cancelled && profile?.default_pay_frequency) setDefaultFrequency(profile.default_pay_frequency);
      })
      .catch(() => {});
    Promise.all([
      listRecords('incomeSource'),
      listRecords('bill'),
      listRecords('budgetCategory'),
      listRecords('property'),
      listRecords('mortgageRecord'),
      listRecords('account'),
      listRecords('transaction'),
      listRecords('forecastRecord'),
    ])
      .then(([incomes, bills, budgetCategories, properties, mortgages, accounts, transactions, forecasts]) => {
        if (!cancelled) setData({ incomes, bills, budgetCategories, properties, mortgages, accounts, transactions, forecasts });
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

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState message="We couldn't load your Yearly Plan. Your data is safe — try again." onRetry={reload} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <LoadingState label="Loading Yearly Plan" />
      </div>
    );
  }

  const { incomes, bills, budgetCategories, properties, mortgages, accounts, transactions, forecasts } = data;
  const est = estimateFromTransactions(transactions);
  const projection = calc.projectYearlyPlan({
    incomes,
    bills,
    budgetCategories,
    properties,
    mortgages,
    accounts,
    months: 12,
    estimate: { income: est.hasData ? est.monthlyIncome : 0, expenses: est.hasData ? est.monthlyExpenses : 0 },
  });
  const hasInputs =
    incomes.length || bills.length || budgetCategories.length || properties.length
      ? true
      : Boolean(projection.estimateUsed.income || projection.estimateUsed.expenses);
  const year = new Date().getFullYear();

  const saveIncome = (payload) =>
    run(
      () => (incomeDialog.income ? updateRecord('incomeSource', incomeDialog.income.id, payload) : createRecord('incomeSource', payload)),
      incomeDialog.income ? 'Income source updated' : 'Income source added'
    );

  const saveSnapshot = () =>
    run(() =>
      createRecord('forecastRecord', {
        year,
        plan_start_month: projection.rows[0].key,
        projected_income: projection.annualIncome,
        projected_expenses: projection.annualExpenses,
        projected_savings: projection.annualSavings,
        year_end_cash: projection.yearEndCash,
        assumptions: [
          `Rolling 12-month plan from ${projection.rows[0].key} through ${projection.rows[11].key}. Monthly income ${projection.monthlyIncome}; monthly expenses ${projection.monthlyExpenses} (bills averaged by frequency, budget limits ${projection.budgetTotal}, property costs ${projection.propertyCosts}); starting cash ${calc.availableCash(accounts)}.`,
          projection.estimateUsed.income || projection.estimateUsed.expenses
            ? `Linked-account estimates applied: income ${projection.estimateUsed.income}/mo, expenses ${projection.estimateUsed.expenses}/mo, averaged from ${est.months} months of imported transactions.`
            : '',
        ].filter(Boolean).join(' '),
      })
    ).then(() => toast({ title: 'Snapshot saved to your forecast history' }));

  const confirmDelete = async () => {
    if (!deleteIncome && !deleteForecast) return;
    if (deleteIncome) await run(() => deleteRecord('incomeSource', deleteIncome.id), 'Income source deleted');
    else await run(() => deleteRecord('forecastRecord', deleteForecast.id), 'Snapshot deleted');
    setDeleteIncome(null);
    setDeleteForecast(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Yearly Plan"
        subtitle="A rolling 12-month estimate of income, spending, savings, and monthly trends."
        actions={
          hasInputs ? (
            <Button onClick={() => { void saveSnapshot().catch(() => {}); }} disabled={busy} className="min-h-11 rounded-xl px-4">
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Save snapshot
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Projected annual income"
          value={formatCurrency(projection.annualIncome)}
          source={incomes.length ? 'Estimated' : projection.estimateUsed.income ? 'Plaid Sandbox' : 'Estimated'}
          note={
            incomes.length
              ? 'Income sources normalized to a month.'
              : projection.estimateUsed.income
                ? `From ${est.months} months of linked transactions.`
                : 'Income sources normalized to a month.'
          }
        />
        <SummaryCard
          label="Projected annual expenses"
          value={formatCurrency(projection.annualExpenses)}
          source={bills.length || budgetCategories.length || properties.length ? 'Estimated' : projection.estimateUsed.expenses ? 'Plaid Sandbox' : 'Estimated'}
          note={
            bills.length || budgetCategories.length || properties.length
              ? 'Bills, budget limits, and property costs.'
              : projection.estimateUsed.expenses
                ? `From ${est.months} months of linked transactions.`
                : 'Bills, budget limits, and property costs.'
          }
        />
        <SummaryCard label="Projected annual savings" value={formatCurrency(projection.annualSavings)} source="Estimated" note="Income minus expenses." />
        <SummaryCard label="Cash after 12 months" value={formatCurrency(projection.yearEndCash)} source="Estimated" note={`Starting from ${formatCurrency(calc.availableCash(accounts))} in saved balances.`} />
      </div>

      <div className="mt-6">
        <MonthlyPlanChart rows={projection.rows} />
      </div>

      {hasInputs && (
        <section className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface p-2 shadow-sm sm:p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Cash balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.income)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.expenses)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${row.net >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
                    {formatCurrency(row.net)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.cumulative)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <div className="mt-6">
        <AssumptionsPanel
          projection={projection}
          incomes={incomes}
          bills={bills}
          estimate={{ income: projection.estimateUsed.income, expenses: projection.estimateUsed.expenses, months: est.months }}
        />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">Income sources</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Single- and multi-income households — each source uses its own pay frequency.
            </p>
          </div>
          <Button onClick={() => setIncomeDialog({ open: true, income: null })} className="min-h-11 rounded-xl px-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add income source
          </Button>
        </div>
        {incomes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              heading="No income sources yet"
              description="Add each paycheck or income stream — your projections, goals, and overview all update from these."
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {incomes.map((income) => (
              <IncomeCard
                key={income.id}
                income={income}
                busy={busy}
                onEdit={(i) => setIncomeDialog({ open: true, income: i })}
                onDelete={setDeleteIncome}
              />
            ))}
          </div>
        )}
      </section>

      {forecasts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-heading text-base font-semibold text-foreground">Saved snapshots</h2>
          <ul className="mt-3 divide-y divide-border">
            {forecasts.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-base font-medium text-foreground">{f.plan_start_month ? `12-month plan from ${f.plan_start_month}` : `${f.year} snapshot`}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Income {formatCurrency(f.projected_income)} · Expenses {formatCurrency(f.projected_expenses)} · Savings{' '}
                    {formatCurrency(f.projected_savings)} · Cash {formatCurrency(f.year_end_cash)}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">Saved {formatDate(f.created_date)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-danger-text hover:bg-danger-surface"
                  onClick={() => setDeleteForecast(f)}
                  disabled={busy}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Delete snapshot
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <IncomeDialog
        open={incomeDialog.open}
        onOpenChange={(open) => setIncomeDialog((d) => ({ ...d, open }))}
        income={incomeDialog.income}
        defaultFrequency={defaultFrequency}
        onSave={saveIncome}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteIncome) || Boolean(deleteForecast)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteIncome(null);
            setDeleteForecast(null);
          }
        }}
        title={deleteIncome ? `Delete ${deleteIncome?.name}?` : 'Delete snapshot?'}
        description={
          deleteIncome
            ? 'Projections, budget, and goals stop using this income immediately. This cannot be undone.'
            : 'This removes the saved forecast snapshot. This cannot be undone.'
        }
        onConfirm={confirmDelete}
        busy={busy}
      />
    </div>
  );
}