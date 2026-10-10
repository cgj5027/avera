import { planningTotal } from '../../base44/shared/planning';
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

export const round2 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON * Math.abs(n)) * 100) / 100;
};

const num = (v) => (typeof v !== 'boolean' && Number.isFinite(Number(v)) ? Number(v) : 0);

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

/** Category-inclusive plan: max(category obligations, limit), plus uncategorized costs. */
export function totalMonthlyExpenses({ bills = [], budgetCategories = [], properties = [], mortgages = [] } = {}) {
  return planningTotal(bills.map(b=>({category:b.category,amount:monthlyFromFrequency(b.amount,b.frequency)})),budgetCategories.map(c=>({name:c.name,limit:num(c.monthly_limit)})),propertyMonthlyCostsTotal(properties,mortgages));
}

export function availableCash(accounts = []) {
  return round2(accounts.filter(a => ['checking','savings','cash'].includes(a.type ?? 'checking')).reduce((s, a) => s + num(a.balance), 0));
}

/** Imported credit balances are signed assets; manual credit entries are amounts owed. */
export function totalDebt(mortgages = [], accounts = []) {
  return round2(
    mortgages.reduce((sum, m) => sum + Math.max(0, num(m.outstanding_balance)), 0) +
    accounts.filter(a => a.type === 'credit_card').reduce((sum, a) => sum +
      (a.source === 'Plaid Sandbox' || a.plaid_item_id ? Math.max(0, -num(a.balance)) : Math.abs(num(a.balance))), 0)
  );
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
          !t.exclude_from_cashflow && t.type !== 'income' &&
          (category ? t.category === category : true) &&
          t.date >= range.start &&
          t.date <= range.end
      )
      .reduce((s, t) => s + num(t.amount), 0)
  );
}

/** Income for one month range, from income-type transactions. */
export function incomeInMonth(transactions = [], range = monthRange()) {
  return round2(
    transactions
      .filter((t) => !t.exclude_from_cashflow && t.type === 'income' && t.date >= range.start && t.date <= range.end)
      .reduce((s, t) => s + num(t.amount), 0)
  );
}

/** Normalized merchant/description text: uppercase, alphanumeric words only. */
export const normalizeName = (raw) => String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** Expenses within a month range that match a tracked bill by normalized name or shared category. */
export function recurringPaidInMonth(transactions = [], bills = [], range = monthRange()) {
  const names = new Set(bills.map((b) => normalizeName(b.name)));
  const categories = new Set(bills.map((b) => b.category).filter(Boolean));
  return round2(
    transactions
      .filter(
        (t) =>
          !t.exclude_from_cashflow && t.type !== 'income' &&
          t.date >= range.start &&
          t.date <= range.end &&
          (names.has(normalizeName(t.description || t.category)) || categories.has(t.category))
      )
      .reduce((s, t) => s + num(t.amount), 0)
  );
}

const DAY_MS = 86400000;

/** Next occurrence shifted forward by one bill frequency. */
export function addFrequency(dateStr, frequency, anchorDay) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid recurrence date');
  const day = anchorDay ?? d.getDate();
  const shiftMonths = (count) => {
    d.setDate(1);
    d.setMonth(d.getMonth() + count);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  };
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'semimonthly':
      // Twice monthly means the 15th and last calendar day, not every 15 days.
      if (d.getDate() < 15) d.setDate(15);
      else if (d.getDate() === 15) d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      else { d.setDate(15); d.setMonth(d.getMonth() + 1); }
      break;
    case 'quarterly':
      shiftMonths(3);
      break;
    case 'semiannual':
      shiftMonths(6);
      break;
    case 'annual':
      shiftMonths(12);
      break;
    default:
      shiftMonths(1);
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Status of a bill relative to today. Color is never the sole indicator — a label always travels with the tone. */
export function billStatus(bill, today = new Date()) {
  if (bill.paid_this_cycle && (!bill.next_due_date || bill.next_due_date <= (bill.last_paid_date ?? ''))) return { key: 'paid', label: 'Paid this cycle', tone: 'success' };
  if (!bill.next_due_date) return { key: 'unscheduled', label: 'No due date set', tone: 'neutral' };
  const due = new Date(`${bill.next_due_date}T00:00:00`);
  if (!Number.isFinite(due.getTime())) return { key: 'unscheduled', label: 'Invalid due date', tone: 'neutral' };
  const days = Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY_MS);
  if (days < 0) return { key: 'overdue', label: `Overdue by ${-days} day${days === -1 ? '' : 's'}`, tone: 'danger' };
  const reminderDays = num(bill.reminder_days ?? 3);
  if (days <= reminderDays)
    return { key: 'due-soon', label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'warning' };
  return { key: 'upcoming', label: `Due in ${days} day${days === 1 ? '' : 's'}`, tone: 'info' };
}

/** Bills due within `withinDays` of today, soonest first. */
export function upcomingBills(bills = [], withinDays = 30, today = new Date()) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const end = new Date(today);
  end.setDate(end.getDate() + withinDays);
  const horizon = iso(end);
  const todayISO = iso(today);
  return bills
    .filter((b) => billStatus(b, today).key !== 'paid' && b.next_due_date && b.next_due_date <= horizon && b.next_due_date >= todayISO)
    .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
}

export function goalMonthsRemaining(targetDate, today = new Date()) {
  if (typeof targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || !Number.isFinite(today.getTime())) return null;
  const t = new Date(`${targetDate}T00:00:00`);
  if (!Number.isFinite(t.getTime()) || t.getFullYear() !== Number(targetDate.slice(0,4)) || t.getMonth()+1 !== Number(targetDate.slice(5,7)) || t.getDate() !== Number(targetDate.slice(8,10))) return null;
  const months = Math.ceil((t.getTime() - today.getTime()) / (DAY_MS * 30.44));
  return Math.max(0, months);
}

/** Monthly contribution needed to hit the target by the deadline; null when no deadline is set. */
export function goalRequiredMonthly(goal, today = new Date()) {
  if (!goal.target_date) return null;
  if (!validGoalAmount(goal.target_amount) || !validGoalAmount(goal.saved_amount ?? (goal.saved_amount === undefined ? 0 : NaN))) return null;
  const remaining = Math.max(0, num(goal.target_amount) - num(goal.saved_amount));
  const months = goalMonthsRemaining(goal.target_date, today);
  if (months === null) return null;
  return round2(remaining / Math.max(1, months ?? 1));
}

/** Pace vs. available monthly savings capacity. Tone always pairs with a text label. */
export function goalPace(goal, monthlyCapacity, today = new Date()) {
  if (num(goal.saved_amount) >= num(goal.target_amount))
    return { key: 'reached', label: 'Goal reached', tone: 'success' };
  const required = goalRequiredMonthly(goal, today);
  if (goalMonthsRemaining(goal.target_date, today) === 0) return { key: 'behind', label: 'Deadline reached — review goal', tone: 'danger' };
  if (required === null) return { key: 'open', label: 'No deadline set', tone: 'neutral' };
  if (required <= num(monthlyCapacity)) return { key: 'on-track', label: 'On track', tone: 'success' };
  if (required <= num(monthlyCapacity) * 1.25)
    return { key: 'tight', label: 'Tight — review budget', tone: 'warning' };
  return { key: 'behind', label: 'Behind pace', tone: 'danger' };
}

const validGoalAmount = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;

export function calculateIncomeGap(goal, { monthlyIncome = undefined, monthlyExpenses = undefined } = {}, today = new Date()) {
  if (!validGoalAmount(monthlyIncome) || !validGoalAmount(monthlyExpenses)) return null;
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

/**
 * Income gap after reserving capacity already committed to other goals'
 * deadlines (Stage 2). Each other goal reserves its own required monthly
 * amount; goals without a deadline reserve nothing. Deterministic and
 * reproducible from the same saved records every time.
 */
export function calculateIncomeGapAllocated(goal, allGoals = [], context = {}, today = new Date()) {
  const base = calculateIncomeGap(goal, context, today);
  if (!base) return null;
  const others = allGoals.filter((g) => g !== goal && (!goal.id || g.id !== goal.id));
  if (others.some(g => g.target_date && goalRequiredMonthly(g, today) === null)) return null;
  const otherReserve = round2(
    others
      .reduce((s, g) => s + (goalRequiredMonthly(g, today) ?? 0), 0)
  );
  const allocatedCapacity = round2(base.capacity - otherReserve);
  return {
    ...base,
    otherReserve,
    allocatedCapacity,
    shortfall: round2(Math.max(0, base.required - allocatedCapacity)),
    surplus: round2(Math.max(0, allocatedCapacity - base.required)),
  };
}

export function propertyEquity(property, mortgage) {
  if (property?.estimated_value == null || !Number.isFinite(Number(property.estimated_value))) return null;
  if (mortgage && (mortgage.outstanding_balance == null || !Number.isFinite(Number(mortgage.outstanding_balance)))) return null;
  return round2(num(property.estimated_value) - num(mortgage?.outstanding_balance));
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
  estimate = { income: 0, expenses: 0 },
} = {}) {
  const budgetTotal = budgetLimitsTotal(budgetCategories);
  const propertyCosts = propertyMonthlyCostsTotal(properties, mortgages);
  const billsBreakdown = bills.map((b) => ({ name: b.name, monthly: monthlyFromFrequency(b.amount, b.frequency) }));
  const manualMonthlyIncome = monthlyIncomeTotal(incomes);
  const manualMonthlyExpenses = totalMonthlyExpenses({bills,budgetCategories,properties,mortgages});
  // Linked-account estimates fill only the gaps manual records leave.
  const estimateIncome = incomes.length === 0 ? round2(num(estimate.income)) : 0;
  const estimateExpenses = manualMonthlyExpenses === 0 ? round2(num(estimate.expenses)) : 0;
  const monthlyIncome = manualMonthlyIncome || estimateIncome;
  const monthlyExpenses = manualMonthlyExpenses || estimateExpenses;
  const annualIncome = estimateIncome
    ? round2(estimateIncome * 12)
    : round2(incomes.filter(i => i.active !== false).reduce((s, i) => s + num(i.amount) * (FREQUENCIES[i.frequency] ?? FREQUENCIES.monthly).perYear, 0));
  const annualExpenses = estimateExpenses
    ? round2(estimateExpenses * 12)
    : planningTotal(bills.map(b=>({category:b.category,amount:num(b.amount)*(FREQUENCIES[b.frequency] ?? FREQUENCIES.monthly).perYear})),budgetCategories.map(c=>({name:c.name,limit:num(c.monthly_limit)*12})),propertyCosts*12);
  const annualSavings = round2(annualIncome - annualExpenses);
  const start = new Date(startingFrom.getFullYear(), startingFrom.getMonth(), 1);
  const rows = [];
  let cumulative = availableCash(accounts);
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const income = round2(round2(annualIncome * (i + 1) / 12) - round2(annualIncome * i / 12));
    const expenses = round2(round2(annualExpenses * (i + 1) / 12) - round2(annualExpenses * i / 12));
    cumulative = round2(cumulative + income - expenses);
    rows.push({
      key: monthRange(d).key,
      month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      income,
      expenses,
      net: round2(income - expenses),
      cumulative,
    });
  }
  return {
    monthlyIncome,
    monthlyExpenses,
    plannedCategoryTotal:manualMonthlyExpenses,
    budgetTotal,
    propertyCosts,
    billsBreakdown,
    rows,
    annualIncome,
    annualExpenses,
    annualSavings,
    estimateUsed: { income: estimateIncome, expenses: estimateExpenses },
    yearEndCash: round2(availableCash(accounts) + annualSavings),
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