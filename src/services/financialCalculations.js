/**
 * Financial calculation services — business-logic layer.
 * Pure functions only: pass data in, return data out, so they are
 * unit-testable without a database. Every figure is derived from the
 * active user's records via the persistence layer (dataService.js);
 * nothing is hardcoded and no totals are fabricated.
 * Monetary values are rounded to cents everywhere.
 */
export const CALCULATIONS_STAGE = 'live';

export const FREQUENCIES = {
  weekly: { label: 'Weekly', perYear: 52 },
  biweekly: { label: 'Every 2 weeks', perYear: 26 },
  semimonthly: { label: 'Twice a month', perYear: 24 },
  monthly: { label: 'Monthly', perYear: 12 },
  quarterly: { label: 'Quarterly', perYear: 4 },
  semiannual: { label: 'Twice a year', perYear: 2 },
  annual: { label: 'Yearly', perYear: 1 },
};

export const INCOME_TYPES = {
  salary: 'Salary',
  hourly: 'Hourly',
  self_employed: 'Self-employed',
  benefits: 'Benefits',
  other: 'Other',
};

export const ACCOUNT_TYPES = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
  other: 'Other',
};

export const PROPERTY_TYPES = {
  primary_residence: 'Primary residence',
  rental: 'Rental',
  investment: 'Investment',
  vacation: 'Vacation',
  other: 'Other',
};

export const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Normalize any pay frequency to a monthly-equivalent amount. */
export function monthlyFromFrequency(amount, frequency) {
  const f = FREQUENCIES[frequency] ?? FREQUENCIES.monthly;
  return round2((num(amount) * f.perYear) / 12);
}

export function monthlyIncomeTotal(incomes = []) {
  return round2(
    incomes
      .filter((i) => i.active !== false)
      .reduce((s, i) => s + monthlyFromFrequency(i.amount, i.frequency), 0)
  );
}

export function monthlyBillsTotal(bills = []) {
  return round2(bills.reduce((s, b) => s + monthlyFromFrequency(b.amount, b.frequency), 0));
}

export function budgetLimitsTotal(budgetCategories = []) {
  return round2(budgetCategories.reduce((s, c) => s + num(c.monthly_limit), 0));
}

export function propertyMonthlyCost(property, mortgage) {
  const p = property ?? {};
  return round2(
    num(mortgage?.monthly_payment) +
      num(p.taxes_monthly) +
      num(p.insurance_monthly) +
      num(p.hoa_monthly) +
      num(p.maintenance_monthly)
  );
}

export function propertyMonthlyCostsTotal(properties = [], mortgages = []) {
  return round2(
    properties.reduce(
      (s, p) => s + propertyMonthlyCost(p, mortgages.find((m) => m.property_id === p.id)),
      0
    )
  );
}

/** Total recurring monthly obligations: bills + budget category limits + property costs. */
export function totalMonthlyExpenses({ bills = [], budgetCategories = [], properties = [], mortgages = [] } = {}) {
  return round2(
    monthlyBillsTotal(bills) + budgetLimitsTotal(budgetCategories) + propertyMonthlyCostsTotal(properties, mortgages)
  );
}

export function availableCash(accounts = []) {
  return round2(accounts.reduce((s, a) => s + num(a.balance), 0));
}

/** [start, end] ISO date strings (YYYY-MM-DD) covering the month of `date`. */
export function monthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    key: `${y}-${pad(m + 1)}`,
    start: `${y}-${pad(m + 1)}-01`,
    end: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`,
  };
}

/** Spending for one category (or all categories when `category` is falsy) within a month range. */
export function spentInMonth(transactions = [], category, range = monthRange()) {
  return round2(
    transactions
      .filter(
        (t) =>
          t.type !== 'income' &&
          (category ? t.category === category : true) &&
          t.date >= range.start &&
          t.date <= range.end
      )
      .reduce((s, t) => s + num(t.amount), 0)
  );
}

const DAY_MS = 86400000;

/** Next occurrence shifted forward by one bill frequency. */
export function addFrequency(dateStr, frequency) {
  const d = new Date(`${dateStr}T00:00:00`);
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'semimonthly':
      d.setDate(d.getDate() + 15);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semiannual':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'annual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Status of a bill relative to today. Color is never the sole indicator — a label always travels with the tone. */
export function billStatus(bill, today = new Date()) {
  if (bill.paid_this_cycle) return { key: 'paid', label: 'Paid this cycle', tone: 'success' };
  if (!bill.next_due_date) return { key: 'unscheduled', label: 'No due date set', tone: 'neutral' };
  const due = new Date(`${bill.next_due_date}T00:00:00`);
  const days = Math.ceil((due - today) / DAY_MS);
  if (days < 0) return { key: 'overdue', label: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, tone: 'danger' };
  const reminderDays = num(bill.reminder_days ?? 3);
  if (days <= reminderDays)
    return { key: 'due-soon', label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'warning' };
  return { key: 'upcoming', label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'info' };
}

/** Bills due within `withinDays` of today, soonest first. */
export function upcomingBills(bills = [], withinDays = 30, today = new Date()) {
  const horizon = new Date(today.getTime() + withinDays * DAY_MS).toISOString().slice(0, 10);
  const todayISO = today.toISOString().slice(0, 10);
  return bills
    .filter((b) => !b.paid_this_cycle && b.next_due_date && b.next_due_date <= horizon && b.next_due_date >= todayISO)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
}

export function goalMonthsRemaining(targetDate, today = new Date()) {
  if (!targetDate) return null;
  const t = new Date(`${targetDate}T00:00:00`);
  const months = Math.ceil((t - today) / (DAY_MS * 30.44));
  return Math.max(0, months);
}

/** Monthly contribution needed to hit the target by the deadline; null when no deadline is set. */
export function goalRequiredMonthly(goal, today = new Date()) {
  if (!goal.target_date) return null;
  const remaining = Math.max(0, num(goal.target_amount) - num(goal.saved_amount));
  const months = goalMonthsRemaining(goal.target_date, today);
  return round2(remaining / Math.max(1, months ?? 1));
}

/** Pace vs. available monthly savings capacity. Tone always pairs with a text label. */
export function goalPace(goal, monthlyCapacity, today = new Date()) {
  if (num(goal.saved_amount) >= num(goal.target_amount))
    return { key: 'reached', label: 'Goal reached', tone: 'success' };
  const required = goalRequiredMonthly(goal, today);
  if (required === null) return { key: 'open', label: 'No deadline set', tone: 'neutral' };
  if (required <= num(monthlyCapacity)) return { key: 'on-track', label: 'On track', tone: 'success' };
  if (required <= num(monthlyCapacity) * 1.25)
    return { key: 'tight', label: 'Tight — review budget', tone: 'warning' };
  return { key: 'behind', label: 'Behind pace', tone: 'danger' };
}

export function calculateIncomeGap(goal, { monthlyIncome = 0, monthlyExpenses = 0 } = {}, today = new Date()) {
  const required = goalRequiredMonthly(goal, today);
  if (required === null) return null;
  const capacity = round2(num(monthlyIncome) - num(monthlyExpenses));
  return {
    required,
    capacity,
    shortfall: round2(Math.max(0, required - capacity)),
    surplus: round2(Math.max(0, capacity - required)),
  };
}

export function propertyEquity(property, mortgage) {
  return round2(num(property?.estimated_value) - num(mortgage?.outstanding_balance));
}

/**
 * Twelve-month projection. Bills and obligations are averaged across months
 * by frequency (the assumption is surfaced in the Yearly Plan's assumptions
 * panel alongside every projection).
 */
export function projectYearlyPlan({
  incomes = [],
  bills = [],
  budgetCategories = [],
  properties = [],
  mortgages = [],
  accounts = [],
  months = 12,
  startingFrom = new Date(),
} = {}) {
  const monthlyIncome = monthlyIncomeTotal(incomes);
  const budgetTotal = budgetLimitsTotal(budgetCategories);
  const propertyCosts = propertyMonthlyCostsTotal(properties, mortgages);
  const billsBreakdown = bills.map((b) => ({ name: b.name, monthly: monthlyFromFrequency(b.amount, b.frequency) }));
  const monthlyExpenses = round2(
    billsBreakdown.reduce((s, b) => s + b.monthly, 0) + budgetTotal + propertyCosts
  );
  const start = new Date(startingFrom.getFullYear(), startingFrom.getMonth(), 1);
  const rows = [];
  let cumulative = availableCash(accounts);
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    cumulative = round2(cumulative + monthlyIncome - monthlyExpenses);
    rows.push({
      key: d.toISOString().slice(0, 7),
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income: monthlyIncome,
      expenses: monthlyExpenses,
      net: round2(monthlyIncome - monthlyExpenses),
      cumulative,
    });
  }
  const netMonthly = round2(monthlyIncome - monthlyExpenses);
  return {
    monthlyIncome,
    monthlyExpenses,
    budgetTotal,
    propertyCosts,
    billsBreakdown,
    rows,
    annualIncome: round2(monthlyIncome * 12),
    annualExpenses: round2(monthlyExpenses * 12),
    annualSavings: round2(netMonthly * 12),
    yearEndCash: round2(availableCash(accounts) + netMonthly * 12),
  };
}

/* Stage 0 seam names, now live. */
export function calculateAvailableCash(accounts = []) {
  return availableCash(accounts);
}

export function calculateProjectedRemaining(monthlyIncome = 0, monthlyExpenses = 0) {
  return round2(num(monthlyIncome) - num(monthlyExpenses));
}

export function calculatePropertyEquity(property, mortgage) {
  return propertyEquity(property, mortgage);
}