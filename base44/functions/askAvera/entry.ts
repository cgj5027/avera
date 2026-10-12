import { readJsonLimited, requestFailureResponse } from '../../shared/requestSafety.ts';
import { claimUsage } from '../../shared/usageLimits.ts';
// Ask Avera: answers a money question using ONLY the signed-in user's own
// financial records (demo workspaces included — demo records are ordinary
// records, demo-tagged). Financial records stay read-only; private usage
// counters are written to enforce request limits.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { datasetQuery } from '../../shared/dataset.ts';
import { assistantInsights, assistantPrompt } from '../../shared/assistantInsights.ts';
import { planningTotal, planningRound } from '../../shared/planning.ts';
import { withGoalContributions } from '../../shared/goalSavings.ts';
import { allRecords, recentRecords } from '../../shared/plaid.ts';

const num = (v) => (typeof v !== 'boolean' && Number.isFinite(Number(v)) ? Number(v) : 0);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    await claimUsage(base44, user, 'askAvera');
    const body = await readJsonLimited(req);
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 2000) {
      return Response.json({ error: 'Enter a question of up to 2,000 characters.' }, { status: 400 });
    }

    const scope = datasetQuery(user, body.dataset);
    // Read-only, user-scoped pulls. Field lists keep the context small.
    const [txnPage, accounts, bills, categories, goals, incomes, properties, mortgages, household, job] =
      await Promise.all([
        recentRecords(base44.entities.Transaction, scope, {
          sort: '-date', limit: 120,
          fields: ['description', 'amount', 'type', 'category', 'date', 'source', 'exclude_from_cashflow']
        }),
        allRecords(base44.entities.Account, scope, {
          limit: 50, fields: ['name', 'type', 'balance', 'institution', 'source', 'balance_as_of']
        }),
        allRecords(base44.entities.Bill, scope, {
          limit: 50, fields: ['name', 'amount', 'frequency', 'next_due_date', 'category']
        }),
        allRecords(base44.entities.BudgetCategory, scope, {
          limit: 50, fields: ['name', 'monthly_limit']
        }),
        allRecords(base44.entities.Goal, scope, {
          limit: 30, fields: ['id', 'demo_profile', 'name', 'target_amount', 'saved_amount', 'target_date', 'source']
        }),
        allRecords(base44.entities.IncomeSource, scope, {
          limit: 20, fields: ['name', 'type', 'amount', 'frequency', 'income_basis', 'active', 'source']
        }),
        allRecords(base44.entities.Property, scope, {
          limit: 20, fields: ['id', 'nickname', 'property_type', 'estimated_value', 'taxes_monthly', 'insurance_monthly', 'hoa_monthly', 'maintenance_monthly']
        }),
        allRecords(base44.entities.MortgageRecord, scope, {
          limit: 20, fields: ['property_id', 'lender', 'outstanding_balance', 'monthly_payment', 'interest_rate']
        }),
        allRecords(base44.entities.HouseholdProfile, scope, {
          limit: 5, fields: ['household_name', 'household_type', 'budget_style', 'emergency_fund_months']
        }),
        allRecords(base44.entities.JobProfile, scope, {
          sort:'-updated_date', limit: 5, fields: ['skills', 'preferred_roles', 'job_type']
        }),
      ]);

    const monthlyFromFrequency = (amount, frequency) => {
      const perYear = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, quarterly: 4, semiannual: 2, annual: 1 }[frequency] ?? 12;
      return planningRound((num(amount) * perYear) / 12);
    };

    const accountRows = accounts;
    const billRows = bills;
    const categoryRows = categories;
    const contributions=await allRecords(base44.entities.GoalContribution,scope);
    const goalRows = withGoalContributions(goals,contributions);
    const incomeRows = incomes;
    const propertyRows = properties;
    const mortgageRows = mortgages;
    const householdRows = household;
    const jobRows = job;

    const monthlyIncome = incomeRows.filter((i) => i.active !== false).reduce((s, i) => s + monthlyFromFrequency(i.amount, i.frequency), 0);
    const monthlyBills = billRows.reduce((s, b) => s + monthlyFromFrequency(b.amount, b.frequency), 0);
    const budgetLimits = categoryRows.reduce((s, c) => s + num(c.monthly_limit), 0);
    const netAccountBalances = accountRows.reduce((s, a) => s + num(a.balance), 0);
    const totalCash = accountRows.filter(a => ['checking','savings','cash'].includes(a.type)).reduce((s, a) => s + num(a.balance), 0);
    const propertyCosts = propertyRows.reduce((s,p) => s + num(mortgageRows.find(m => m.property_id === p.id)?.monthly_payment) + num(p.taxes_monthly) + num(p.insurance_monthly) + num(p.hoa_monthly) + num(p.maintenance_monthly), 0);

    const context = {
      dataset: body.dataset?.mode === 'demo' ? `Demo Mode: ${body.dataset.profile}` : 'Ordinary user records',
      data_note: 'User-owned stored records and calculated planning totals. Sample data and Plaid Sandbox are simulated, never real bank balances. Planning uses the larger of categorized bills or their category budget; uncategorized bills and property costs remain included. Each source has a user-entered gross/net basis or unknown. No tax conversion is performed. Stored balances may be outdated; check balance_as_of. Transactions are realized activity and must not be added to planned expenses.',
      household: householdRows[0] ?? null,
      cash: { total: planningRound(totalCash), definition: 'Checking, savings and cash balances only.', net_account_balances: planningRound(netAccountBalances), accounts: accountRows },
      planned_monthly_expenses: planningTotal(billRows.map(b=>({category:b.category,amount:monthlyFromFrequency(b.amount,b.frequency)})),categoryRows.map(c=>({name:c.name,limit:num(c.monthly_limit)})),propertyCosts),
      property_monthly_costs: planningRound(propertyCosts),
      income: { monthly_total: planningRound(monthlyIncome), sources: incomeRows.map(i => ({...i, monthly_equivalent: typeof i.amount === 'number' && Number.isFinite(i.amount) && i.amount >= 0 ? monthlyFromFrequency(i.amount, i.frequency) : null})) },
      recurring_bills: { monthly_total: planningRound(monthlyBills), bills: billRows.map(b => ({...b, monthly_equivalent: typeof b.amount === 'number' && Number.isFinite(b.amount) && b.amount >= 0 ? monthlyFromFrequency(b.amount, b.frequency) : null})) },
      budget: { monthly_limits_total: planningRound(budgetLimits), categories: categoryRows },
      goals: goalRows,
      properties: propertyRows,
      mortgages: mortgageRows,
      job_profile: jobRows[0] ?? null,
      recent_transactions: txnPage.slice(0, 120),
      recent_transactions_note: `Showing up to ${txnPage.length} recent stored transactions, newest first. This is not a complete spending total.`,
    };

    context['insights'] = assistantInsights({ incomes: incomeRows, bills: billRows.map(b => ({...b, monthly_equivalent: typeof b.amount === 'number' && Number.isFinite(b.amount) && b.amount >= 0 ? monthlyFromFrequency(b.amount, b.frequency) : null})), categories: categoryRows, accounts: accountRows, properties: propertyRows, mortgages: mortgageRows, goals: goalRows, monthlyIncome: context.income.monthly_total, monthlyExpenses: context.planned_monthly_expenses });

    const prompt = assistantPrompt(context, question);
    if (new TextEncoder().encode(prompt).byteLength > 100000) return Response.json({ error: 'Your dataset is too large for the assistant. No partial planning totals were sent.' }, { status: 413 });

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
      },
    });

    const answer = typeof llm === 'object' && llm !== null && 'answer' in llm && typeof llm.answer === 'string' ? llm.answer : '';
    if (!answer.trim() || answer.length > 20000) return Response.json({ error: 'The assistant could not answer. Please try again.' }, { status: 502 });
    return Response.json({ answer });
  } catch (error) {
    const failure = requestFailureResponse(error); if (failure) return failure;
    return Response.json({ error: 'The assistant is unavailable. Please retry.' }, { status: 502 });
  }
}