// Ask Avera: answers a money question using ONLY the signed-in user's own
// financial records (demo workspaces included — demo records are ordinary
// records, demo-tagged). Read-only: the assistant never writes anything.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question || question.length > 2000) {
      return Response.json({ error: 'Enter a question of up to 2,000 characters.' }, { status: 400 });
    }

    // Read-only, user-scoped pulls. Field lists keep the context small.
    const [txnPage, accounts, bills, categories, goals, incomes, properties, mortgages, household, job] =
      await Promise.all([
        base44.entities.Transaction.filter({ created_by_id: user.id }, {
          sort: '-date', limit: 120,
          fields: ['description', 'amount', 'type', 'category', 'date', 'source']
        }),
        base44.entities.Account.filter({ created_by_id: user.id }, {
          limit: 50, fields: ['name', 'type', 'balance', 'institution', 'source']
        }),
        base44.entities.Bill.filter({ created_by_id: user.id }, {
          limit: 50, fields: ['name', 'amount', 'frequency', 'next_due_date', 'category']
        }),
        base44.entities.BudgetCategory.filter({ created_by_id: user.id }, {
          limit: 50, fields: ['name', 'monthly_limit']
        }),
        base44.entities.Goal.filter({ created_by_id: user.id }, {
          limit: 30, fields: ['name', 'target_amount', 'saved_amount', 'target_date']
        }),
        base44.entities.IncomeSource.filter({ created_by_id: user.id }, {
          limit: 20, fields: ['name', 'type', 'amount', 'frequency', 'active', 'source']
        }),
        base44.entities.Property.filter({ created_by_id: user.id }, {
          limit: 20, fields: ['nickname', 'property_type', 'estimated_value', 'taxes_monthly', 'insurance_monthly', 'hoa_monthly', 'maintenance_monthly']
        }),
        base44.entities.MortgageRecord.filter({ created_by_id: user.id }, {
          limit: 20, fields: ['property_id', 'lender', 'outstanding_balance', 'monthly_payment', 'interest_rate']
        }),
        base44.entities.HouseholdProfile.filter({ created_by_id: user.id }, {
          limit: 5, fields: ['household_name', 'household_type', 'budget_style', 'emergency_fund_months']
        }),
        base44.entities.JobProfile.filter({ created_by_id: user.id }, {
          limit: 5, fields: ['skills', 'preferred_roles', 'weekly_hours', 'target_monthly_income']
        }),
      ]);

    const monthlyFromFrequency = (amount, frequency) => {
      const perYear = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, quarterly: 4, semiannual: 2, annual: 1 }[frequency] ?? 12;
      return Math.round(((num(amount) * perYear) / 12) * 100) / 100;
    };

    const accountRows = accounts.items ?? [];
    const billRows = bills.items ?? [];
    const categoryRows = categories.items ?? [];
    const goalRows = goals.items ?? [];
    const incomeRows = incomes.items ?? [];
    const propertyRows = properties.items ?? [];
    const mortgageRows = mortgages.items ?? [];
    const householdRows = household.items ?? [];
    const jobRows = job.items ?? [];

    const monthlyIncome = incomeRows.filter((i) => i.active !== false).reduce((s, i) => s + monthlyFromFrequency(i.amount, i.frequency), 0);
    const monthlyBills = billRows.reduce((s, b) => s + monthlyFromFrequency(b.amount, b.frequency), 0);
    const budgetLimits = categoryRows.reduce((s, c) => s + num(c.monthly_limit), 0);
    const totalCash = accountRows.reduce((s, a) => s + num(a.balance), 0);

    const context = {
      data_note: 'All records below are the signed-in user\'s own financial records, exactly as stored.',
      household: householdRows[0] ?? null,
      cash: { total: Math.round(totalCash * 100) / 100, accounts: accountRows },
      income: { monthly_total: Math.round(monthlyIncome * 100) / 100, sources: incomeRows },
      recurring_bills: { monthly_total: Math.round(monthlyBills * 100) / 100, bills: billRows },
      budget: { monthly_limits_total: Math.round(budgetLimits * 100) / 100, categories: categoryRows },
      goals: goalRows,
      properties: propertyRows,
      mortgages: mortgageRows,
      job_profile: jobRows[0] ?? null,
      recent_transactions: txnPage.items ?? [],
    };

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You are Avera, a calm, warm household financial wellness assistant.',
        'Answer the user\'s question using ONLY the financial context provided — never invent figures.',
        'If the context does not contain what you need, say what you would need to know.',
        'You are read-only: never suggest moving money, making payments, or connecting accounts.',
        'Be concise (at most 250 words), plain, and practical. Use $ for money. Never claim data came from a bank.',
        '',
        'FINANCIAL CONTEXT (JSON):',
        JSON.stringify(context),
        '',
        'USER QUESTION:',
        question,
      ].join('\n'),
      response_json_schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
      },
    });

    const answer = typeof llm?.answer === 'string' ? llm.answer : '';
    if (!answer.trim()) return Response.json({ error: 'The assistant could not answer. Please try again.' }, { status: 502 });
    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}