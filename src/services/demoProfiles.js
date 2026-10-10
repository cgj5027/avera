/**
 * Demo Mode profiles — Stage 3B.
 *
 * Deterministic, Avera-owned sample datasets for three internally consistent
 * financial profiles. Dates are generated relative to "today" so Budget,
 * Yearly Plan, and bill scheduling always look live. Every record is labeled
 * source: 'Sample data' and carries demo_profile — this is the explicit
 * fallback dataset, and it NEVER claims to have been imported from a bank.
 * (The Plaid Sandbox custom-user variant of each scenario lives in
 * base44/shared/demoPlaidConfigs.ts; its records are labeled 'Plaid Sandbox'.)
 *
 * Pure functions only — no database access here.
 */
import { round2 } from './financialCalculations';

export const DEMO_SOURCE_LABEL = 'Sample data';
export const DEMO_NOTE = 'Avera demo dataset — sample information, not imported from a bank.';

export const DEMO_PROFILE_KEYS = ['early_career', 'multi_income', 'financial_improvement'];

export const DEMO_PROFILES = {
  early_career: {
    key: 'early_career',
    letter: 'A',
    label: 'Early Career Professional',
    tagline: 'Single income, renting, paying down student loans.',
    description:
      'One salary, a checking and savings account, rent, student loans, transportation, monthly spending, and savings goals.',
  },
  multi_income: {
    key: 'multi_income',
    letter: 'B',
    label: 'Multi-Income Household',
    tagline: 'Two incomes, a mortgage, a rental property, and vehicle costs.',
    description:
      'Two income streams, mortgage payments on a home and a rental, vehicle expenses, recurring household bills, and long-term savings goals.',
  },
  financial_improvement: {
    key: 'financial_improvement',
    letter: 'C',
    label: 'Financial Improvement',
    tagline: 'Irregular income, high obligations, and an income gap to close.',
    description:
      'Irregular gig income, high recurring obligations, limited savings, income gaps, and goals that benefit from supplemental work.',
  },
};

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The last `count` calendar months including the current one, oldest first: [{y, m, i}]. */
function recentMonths(today, count) {
  const out = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth(), i: count - 1 - i });
  }
  return out;
}

/** ISO date for day `d` of that month, or null when it falls after today. */
function pastDay(y, m, d, today) {
  const last = new Date(y, m + 1, 0).getDate();
  const date = `${y}-${pad(m + 1)}-${pad(Math.min(d, last))}`;
  return date <= iso(today) ? date : null;
}

/** The next occurrence of `day` on or after today (clamped to month length). */
function upcomingDay(today, dayOfMonth) {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const thisMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(Math.min(dayOfMonth, last))}`;
  if (thisMonth >= iso(today)) return thisMonth;
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextLast = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(Math.min(dayOfMonth, nextLast))}`;
}

/** ISO date `months` calendar months after today (day clamped). */
function monthsAhead(today, months) {
  const d = new Date(today.getFullYear(), today.getMonth() + months, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(Math.min(today.getDate(), last))}`;
}

const DEMO_TAGGED = (key) => ({ source: DEMO_SOURCE_LABEL, notes: DEMO_NOTE, demo_profile: key });

function txn(rows, key, description, category, amount, type, date) {
  if (date) rows.push({ description, category, amount, type, date, ...DEMO_TAGGED(key) });
}

/* ── Profile A — Early Career Professional ─────────────────────────────── */

function earlyCareerTransactions(today, key) {
  const rows = [];
  const dinerByMonth = [31, 27, 36, 29];
  for (const { y, m, i } of recentMonths(today, 4)) {
    txn(rows, key, 'Alder & Co. payroll', 'Payroll', 3400, 'income', pastDay(y, m, 1, today));
    txn(rows, key, 'Maple Court Rent', 'Housing', 1250, 'expense', pastDay(y, m, 3, today));
    txn(rows, key, 'AES Student Loan Payment', 'Debt payments', 310, 'expense', pastDay(y, m, 5, today));
    txn(rows, key, 'Metro Transit Pass', 'Transportation', 95, 'expense', pastDay(y, m, 7, today));
    txn(rows, key, 'Hearthway Grocers', 'Groceries', 165, 'expense', pastDay(y, m, 8, today));
    txn(rows, key, 'City Power & Water', 'Utilities', 78, 'expense', pastDay(y, m, 10, today));
    txn(rows, key, 'PicoTel Internet', 'Utilities', 60, 'expense', pastDay(y, m, 12, today));
    txn(rows, key, 'Sagebrush Diner', 'Dining out', dinerByMonth[i], 'expense', pastDay(y, m, 14, today));
    txn(rows, key, 'Byte Mobile', 'Utilities', 55, 'expense', pastDay(y, m, 15, today));
    txn(rows, key, 'Flux Fitness', 'Health & fitness', 45, 'expense', pastDay(y, m, 18, today));
    txn(rows, key, 'Corner Market', 'Groceries', 85, 'expense', pastDay(y, m, 21, today));
    txn(rows, key, 'Streamly', 'Entertainment', 15.99, 'expense', pastDay(y, m, 22, today));
  }
  return rows;
}

/* ── Profile B — Multi-Income Household ────────────────────────────────── */

function multiIncomeTransactions(today, key) {
  const rows = [];
  const freelanceByMonth = [640, 910, 780, 1020];
  for (const { y, m, i } of recentMonths(today, 4)) {
    txn(rows, key, 'Harbor Design payroll', 'Payroll', 3100, 'income', pastDay(y, m, 1, today));
    txn(rows, key, 'Harbor Design payroll', 'Payroll', 3100, 'income', pastDay(y, m, 15, today));
    txn(rows, key, 'Weekend client payment', 'Payroll', freelanceByMonth[i], 'income', pastDay(y, m, 20, today));
    txn(rows, key, 'Fairview Mortgage payment', 'Housing', 1860, 'expense', pastDay(y, m, 5, today));
    txn(rows, key, 'Maple Street rental mortgage', 'Housing', 990, 'expense', pastDay(y, m, 5, today));
    txn(rows, key, 'Bright Kids Daycare', 'Childcare', 600, 'expense', pastDay(y, m, 1, today));
    txn(rows, key, 'AutoNation loan payment', 'Debt payments', 385, 'expense', pastDay(y, m, 8, today));
    txn(rows, key, 'Hearthway Grocers', 'Groceries', 320, 'expense', pastDay(y, m, 9, today));
    txn(rows, key, 'City Power & Water', 'Utilities', 165, 'expense', pastDay(y, m, 10, today));
    txn(rows, key, 'PicoTel Internet', 'Utilities', 80, 'expense', pastDay(y, m, 12, today));
    txn(rows, key, 'Shell Fuel', 'Fuel & transport', 86, 'expense', pastDay(y, m, 16, today));
    txn(rows, key, 'StateShield Auto insurance', 'Vehicle', 132, 'expense', pastDay(y, m, 17, today));
    txn(rows, key, 'Corner Market', 'Groceries', 210, 'expense', pastDay(y, m, 23, today));
    txn(rows, key, 'Sagebrush Family Dinner', 'Dining out', 54, 'expense', pastDay(y, m, 25, today));
  }
  return rows;
}

/* ── Profile C — Financial Improvement ─────────────────────────────────── */

function financialImprovementTransactions(today, key) {
  const rows = [];
  // Irregular gig income: two unpredictable deposits most months, benefits on the 1st.
  const irregular = [
    [
      { description: 'Contract cleaning client', day: 4, amount: 1450 },
      { description: 'Warehouse shift pay', day: 19, amount: 700 },
    ],
    [
      { description: 'Contract cleaning client', day: 9, amount: 980 },
      { description: 'Delivery app earnings', day: 21, amount: 415 },
    ],
    [
      { description: 'Warehouse shift pay', day: 6, amount: 1620 },
      { description: 'Delivery app earnings', day: 21, amount: 520 },
    ],
    [
      { description: 'Contract cleaning client', day: 3, amount: 1120 },
    ],
  ];
  for (const { y, m, i } of recentMonths(today, 4)) {
    txn(rows, key, 'State benefits deposit', 'Benefits', 320, 'income', pastDay(y, m, 1, today));
    for (const deposit of irregular[i]) {
      txn(rows, key, deposit.description, 'Gig income', deposit.amount, 'income', pastDay(y, m, deposit.day, today));
    }
    txn(rows, key, 'Larkspur Apartments Rent', 'Housing', 1450, 'expense', pastDay(y, m, 3, today));
    txn(rows, key, 'AutoNation loan payment', 'Debt payments', 340, 'expense', pastDay(y, m, 8, today));
    txn(rows, key, 'Hearthway Grocers', 'Groceries', 110, 'expense', pastDay(y, m, 9, today));
    txn(rows, key, 'City Power & Water', 'Utilities', 185, 'expense', pastDay(y, m, 10, today));
    txn(rows, key, 'Apex Card minimum payment', 'Debt payments', 220, 'expense', pastDay(y, m, 14, today));
    txn(rows, key, 'StateShield Auto insurance', 'Vehicle', 165, 'expense', pastDay(y, m, 12, today));
    txn(rows, key, 'PicoTel Internet', 'Utilities', 65, 'expense', pastDay(y, m, 15, today));
    txn(rows, key, 'Ridgeway Fuel Co-op', 'Fuel & transport', 45, 'expense', pastDay(y, m, 16, today));
    txn(rows, key, 'Byte Mobile', 'Utilities', 70, 'expense', pastDay(y, m, 18, today));
    txn(rows, key, 'SecureSpace Storage', 'Household', 55, 'expense', pastDay(y, m, 20, today));
    txn(rows, key, 'Corner Market', 'Groceries', 70, 'expense', pastDay(y, m, 24, today));
    txn(rows, key, 'Sagebrush Diner', 'Dining out', 18, 'expense', pastDay(y, m, 26, today));
  }
  return rows;
}

const TRANSACTION_BUILDERS = {
  early_career: earlyCareerTransactions,
  multi_income: multiIncomeTransactions,
  financial_improvement: financialImprovementTransactions,
};

/* ── Structural records (accounts, bills, categories, goals, property) ──── */

function structuralRecords(profileKey, today) {
  const tag = DEMO_TAGGED(profileKey);
  const common = {
    early_career: {
      account: [
        { name: 'Alder Checking', type: 'checking', balance: 1860, institution: 'Alder Bank (sample)', ...tag },
        { name: 'Alder Savings', type: 'savings', balance: 2400, institution: 'Alder Bank (sample)', ...tag },
      ],
      incomeSource: [
        { name: 'Alder & Co. payroll', type: 'salary', amount: 3400, frequency: 'monthly', active: true, ...tag },
      ],
      bill: [
        { name: 'Maple Court Rent', amount: 1250, frequency: 'monthly', next_due_date: upcomingDay(today, 3), category: 'Housing', reminder_days: 3, recurrence_day: 3, ...tag },
        { name: 'AES Student Loan Payment', amount: 310, frequency: 'monthly', next_due_date: upcomingDay(today, 5), category: 'Debt payments', reminder_days: 5, recurrence_day: 5, ...tag },
        { name: 'PicoTel Internet', amount: 60, frequency: 'monthly', next_due_date: upcomingDay(today, 12), category: 'Utilities', reminder_days: 3, recurrence_day: 12, ...tag },
        { name: 'Byte Mobile', amount: 55, frequency: 'monthly', next_due_date: upcomingDay(today, 15), category: 'Utilities', reminder_days: 3, recurrence_day: 15, ...tag },
        { name: 'Flux Fitness', amount: 45, frequency: 'monthly', next_due_date: upcomingDay(today, 18), category: 'Health & fitness', reminder_days: 3, recurrence_day: 18, ...tag },
      ],
      budgetCategory: [
        { name: 'Groceries', monthly_limit: 300, ...tag },
        { name: 'Transportation', monthly_limit: 120, ...tag },
        { name: 'Utilities', monthly_limit: 200, ...tag },
        { name: 'Dining out', monthly_limit: 120, ...tag },
        { name: 'Entertainment', monthly_limit: 60, ...tag },
        { name: 'Health & fitness', monthly_limit: 50, ...tag },
      ],
      goal: [
        { name: 'Emergency fund', target_amount: 5000, saved_amount: 2400, target_date: monthsAhead(today, 10), ...tag },
        { name: 'Trip to the coast', target_amount: 1200, saved_amount: 450, target_date: monthsAhead(today, 6), ...tag },
        { name: 'New laptop', target_amount: 1500, saved_amount: 300, target_date: monthsAhead(today, 8), ...tag },
      ],
      property: [],
      mortgageRecord: [],
      jobProfile: [],
      householdProfile: [
        {
          household_name: 'Alex Rivera (demo)',
          household_type: 'single_income',
          default_pay_frequency: 'monthly',
          budget_style: 'category_caps',
          emergency_fund_months: 2,
          currency: 'USD',
          ...tag,
        },
      ],
    },
    multi_income: {
      account: [
        { name: 'Harbor Checking', type: 'checking', balance: 6240, institution: 'Harbor Trust (sample)', ...tag },
        { name: 'Harbor Savings', type: 'savings', balance: 11380, institution: 'Harbor Trust (sample)', ...tag },
      ],
      incomeSource: [
        { name: 'Harbor Design salary', type: 'salary', amount: 3100, frequency: 'semimonthly', active: true, ...tag },
        { name: 'Weekend freelance design', type: 'self_employed', amount: 850, frequency: 'monthly', active: true, ...tag },
      ],
      bill: [
        { name: 'Bright Kids Daycare', amount: 600, frequency: 'monthly', next_due_date: upcomingDay(today, 1), category: 'Childcare', reminder_days: 3, recurrence_day: 1, ...tag },
        { name: 'AutoNation loan payment', amount: 385, frequency: 'monthly', next_due_date: upcomingDay(today, 8), category: 'Vehicle', reminder_days: 3, recurrence_day: 8, ...tag },
        { name: 'City Power & Water', amount: 165, frequency: 'monthly', next_due_date: upcomingDay(today, 10), category: 'Utilities', reminder_days: 3, recurrence_day: 10, ...tag },
        { name: 'PicoTel Internet', amount: 80, frequency: 'monthly', next_due_date: upcomingDay(today, 12), category: 'Utilities', reminder_days: 3, recurrence_day: 12, ...tag },
        { name: 'StateShield Auto insurance', amount: 132, frequency: 'monthly', next_due_date: upcomingDay(today, 17), category: 'Vehicle', reminder_days: 5, recurrence_day: 17, ...tag },
        { name: 'GreenScape Lawn service', amount: 75, frequency: 'monthly', next_due_date: upcomingDay(today, 22), category: 'Household', reminder_days: 3, recurrence_day: 22, ...tag },
      ],
      budgetCategory: [
        { name: 'Groceries', monthly_limit: 550, ...tag },
        { name: 'Fuel & transport', monthly_limit: 260, ...tag },
        { name: 'Utilities', monthly_limit: 260, ...tag },
        { name: 'Childcare', monthly_limit: 600, ...tag },
        { name: 'Dining out', monthly_limit: 180, ...tag },
        { name: 'Entertainment', monthly_limit: 100, ...tag },
        { name: 'Home supplies', monthly_limit: 90, ...tag },
      ],
      goal: [
        { name: 'Kitchen remodel', target_amount: 18000, saved_amount: 6500, target_date: monthsAhead(today, 14), ...tag },
        { name: 'College fund — Maya', target_amount: 15000, saved_amount: 3200, target_date: monthsAhead(today, 36), ...tag },
        { name: 'Weekend cabin trip', target_amount: 2500, saved_amount: 1250, target_date: monthsAhead(today, 5), ...tag },
      ],
      property: [
        {
          nickname: 'Fairview home',
          address: '412 Fairview Lane',
          property_type: 'primary_residence',
          estimated_value: 410000,
          valuation_source: 'user_provided',
          valuation_date: iso(today),
          taxes_monthly: 310,
          insurance_monthly: 120,
          hoa_monthly: 0,
          maintenance_monthly: 150,
          ...tag,
        },
        {
          nickname: 'Maple Street duplex',
          address: '88 Maple Street',
          property_type: 'rental',
          estimated_value: 260000,
          valuation_source: 'user_provided',
          valuation_date: iso(today),
          taxes_monthly: 220,
          insurance_monthly: 105,
          hoa_monthly: 0,
          maintenance_monthly: 180,
          ...tag,
        },
      ],
      mortgageRecord: [],
      jobProfile: [],
      householdProfile: [
        {
          household_name: 'Nakamura Household (demo)',
          household_type: 'multi_income',
          default_pay_frequency: 'semimonthly',
          budget_style: 'category_caps',
          emergency_fund_months: 4,
          currency: 'USD',
          ...tag,
        },
      ],
    },
    financial_improvement: {
      account: [
        { name: 'Ridgeway Checking', type: 'checking', balance: 620, institution: 'Ridgeway Credit Union (sample)', ...tag },
        { name: 'Ridgeway Savings', type: 'savings', balance: 350, institution: 'Ridgeway Credit Union (sample)', ...tag },
      ],
      incomeSource: [
        { name: 'Gig & contract work', type: 'self_employed', amount: 1750, frequency: 'monthly', active: true, ...tag },
        { name: 'State benefits', type: 'benefits', amount: 320, frequency: 'monthly', active: true, ...tag },
      ],
      bill: [
        { name: 'Larkspur Apartments Rent', amount: 1450, frequency: 'monthly', next_due_date: upcomingDay(today, 3), category: 'Housing', reminder_days: 3, recurrence_day: 3, ...tag },
        { name: 'AutoNation loan payment', amount: 340, frequency: 'monthly', next_due_date: upcomingDay(today, 8), category: 'Vehicle', reminder_days: 3, recurrence_day: 8, ...tag },
        { name: 'City Power & Water', amount: 185, frequency: 'monthly', next_due_date: upcomingDay(today, 10), category: 'Utilities', reminder_days: 3, recurrence_day: 10, ...tag },
        { name: 'Apex Card minimum payment', amount: 220, frequency: 'monthly', next_due_date: upcomingDay(today, 14), category: 'Debt payments', reminder_days: 3, recurrence_day: 14, ...tag },
        { name: 'StateShield Auto insurance', amount: 165, frequency: 'monthly', next_due_date: upcomingDay(today, 12), category: 'Vehicle', reminder_days: 5, recurrence_day: 12, ...tag },
        { name: 'PicoTel Internet', amount: 65, frequency: 'monthly', next_due_date: upcomingDay(today, 15), category: 'Utilities', reminder_days: 3, recurrence_day: 15, ...tag },
        { name: 'SecureSpace Storage', amount: 55, frequency: 'monthly', next_due_date: upcomingDay(today, 20), category: 'Household', reminder_days: 3, recurrence_day: 20, ...tag },
      ],
      budgetCategory: [
        { name: 'Groceries', monthly_limit: 200, ...tag },
        { name: 'Fuel & transport', monthly_limit: 120, ...tag },
        { name: 'Utilities', monthly_limit: 190, ...tag },
        { name: 'Dining out', monthly_limit: 40, ...tag },
        { name: 'Household supplies', monthly_limit: 40, ...tag },
      ],
      goal: [
        { name: 'Emergency fund', target_amount: 3000, saved_amount: 350, target_date: monthsAhead(today, 18), ...tag },
        { name: 'Pay off Apex Card', target_amount: 2200, saved_amount: 400, target_date: monthsAhead(today, 12), ...tag },
      ],
      property: [],
      mortgageRecord: [],
      jobProfile: [
        {
          skills: 'Customer service, retail cashier, warehouse operations, food service',
          experience: 'Three years of retail and warehouse work; reliable evening and weekend availability',
          preferred_roles: 'Cashier, Stock associate, Delivery driver',
          work_mode: 'any',
          location: 'Columbus, OH',
          weekly_hours: 15,
          target_monthly_income: 800,
          ...tag,
        },
      ],
      householdProfile: [
        {
          household_name: 'Jordan Ellis (demo)',
          household_type: 'single_income',
          default_pay_frequency: 'monthly',
          budget_style: 'flexible',
          emergency_fund_months: 0.5,
          currency: 'USD',
          ...tag,
        },
      ],
    },
  };

  const base = common[profileKey] ?? null;
  if (!base) return null;

  /* Mortgage records reference their property ids, so they are built after the properties. */
  const mortgages = {
    multi_income: (properties) => [
      { property_id: properties[0]?.id, lender: 'Cascade Mortgage', outstanding_balance: 296400, monthly_payment: 1860, interest_rate: 5.1, ...tag },
      { property_id: properties[1]?.id, lender: 'Cascade Mortgage', outstanding_balance: 148200, monthly_payment: 990, interest_rate: 5.6, ...tag },
    ],
  };
  return { base, mortgages: mortgages[profileKey] ?? null };
}

/**
 * Builds the complete demo dataset for one profile, relative to `today`.
 * When `includeTransactionData` is false the accounts and transactions are
 * omitted because they arrive from the linked Plaid Sandbox custom user.
 */
export function buildDemoDataset(profileKey, today = new Date(), { includeTransactionData = true } = {}) {
  const built = structuralRecords(profileKey, today);
  if (!built) throw new Error('Unknown demo profile.');
  const { base, mortgages } = built;
  const dataset = { ...base };

  if (includeTransactionData) {
    dataset.transaction = TRANSACTION_BUILDERS[profileKey]?.(today, profileKey) ?? [];
    dataset.account = base.account;
  } else {
    dataset.transaction = [];
    dataset.account = [];
  }

  /* Mortgage records need the saved Property ids, so they are created after
     the properties; the builder receives the created property records. */
  dataset.mortgageBuilder = mortgages;
  return dataset;
}

/**
 * Ordering-aware seeding helper: mortgages need the saved Property ids.
 * Creates every entity in the dataset; returns what was created.
 * Household and job profiles are skipped when an ordinary (untagged) one
 * already exists, so demo data never displaces a user's real profile.
 */
export async function createDemoRecords(dataset, createRows, hasOrdinaryRecord) {
  const created = { property: [] };
  /* Properties first so mortgage builders can reference their ids. */
  if (dataset.property?.length) {
    created.property = await createRows('property', dataset.property);
  }
  if (dataset.mortgageBuilder) {
    await createRows('mortgageRecord', dataset.mortgageBuilder(created.property));
  }
  for (const key of ['transaction', 'account', 'incomeSource', 'bill', 'budgetCategory', 'goal']) {
    if (dataset[key]?.length) await createRows(key, dataset[key]);
  }
  if (dataset.householdProfile?.length && !(await hasOrdinaryRecord('householdProfile'))) {
    await createRows('householdProfile', dataset.householdProfile);
  }
  if (dataset.jobProfile?.length && !(await hasOrdinaryRecord('jobProfile'))) {
    await createRows('jobProfile', dataset.jobProfile);
  }
  return created;
}

export function roundMoney(value) {
  return round2(value);
}