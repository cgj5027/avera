/**
 * Plaid-derived estimates — business-logic layer.
 * Pure functions that read the transactions imported from linked test banks
 * (Transaction records with a plaid_item_id / source "Plaid Sandbox") and
 * estimate the figures a household has not entered manually yet: monthly
 * income, monthly expenses, and recurring bills. Nothing here writes data;
 * a suggestion becomes a tracked bill only when the user adds it.
 */
import { addFrequency, monthlyFromFrequency, round2, normalizeName } from './financialCalculations';

export const PLAID_SOURCE_LABEL = 'Plaid Sandbox';

/** Transactions imported from a linked Plaid Item (manual/demo records excluded). */
export function importedTransactions(transactions = []) {
  const seen=new Set();
  return transactions.filter(t => {
    if (t.exclude_from_cashflow || !(t.plaid_item_id || t.source === 'Plaid Sandbox') || typeof t.amount !== 'number' || !Number.isFinite(t.amount) || t.amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(t.date || '')) return false;
    if (!t.plaid_transaction_id) return true;
    const key=`${t.plaid_item_id}:${t.plaid_transaction_id}`;
    if (seen.has(key)) return false;
    seen.add(key);return true;
  });
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const monthKey = (date) => String(date ?? '').slice(0, 7);

export { normalizeName };

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function countMonths(values) {
  return new Set(values.map(monthKey).filter(Boolean)).size;
}

/** Recurring cadence from how often a charge appears per month. */
const OCCURRENCE_TO_FREQUENCY = [
  { minPerMonth: 3.5, frequency: 'weekly' },
  { minPerMonth: 1.8, frequency: 'biweekly' },
  { minPerMonth: 0.75, frequency: 'monthly' },
];

/** Next due date: the last occurrence advanced one cycle, pulled forward until today or later. */
function nextOccurrence(lastDate, frequency, today = new Date()) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let next = addFrequency(lastDate, frequency);
  let guard = 0;
  while (next < iso(today) && guard < 24) {
    next = addFrequency(next, frequency);
    guard += 1;
  }
  return next;
}

/**
 * Recurring expense patterns in the linked data, as suggested bill entries.
 * Charges the user marked "not recurring" are excluded now and for future
 * transactions of the same merchant name.
 */
export function estimateBillCandidates(transactions = [], { minMonths = 2 } = {}) {
  const notRecurringNames = new Set(
    transactions
      .filter((t) => t.not_recurring)
      .map((t) => normalizeName(t.description || t.category))
      .filter(Boolean)
  );
  const groups = new Map();
  for (const t of transactions) {
    if (t.exclude_from_cashflow || t.type === 'income') continue;
    const key = normalizeName(t.description || t.category);
    if (!key || notRecurringNames.has(key)) continue;
    const group = groups.get(key) ?? [];
    group.push(t);
    groups.set(key, group);
  }
  const candidates = [];
  for (const group of groups.values()) {
    const monthsSeen = countMonths(group.map((t) => t.date));
    if (monthsSeen < minMonths) continue;
    const perMonth = group.length / monthsSeen;
    const match = OCCURRENCE_TO_FREQUENCY.find((f) => perMonth >= f.minPerMonth);
    if (!match) continue;
    const lastDate = group.map((t) => t.date).filter(Boolean).sort().at(-1);
    if (!lastDate) continue;
    const amount = round2(group.reduce((s, t) => s + num(t.amount), 0) / group.length);
    candidates.push({
      name: mostCommon(group.map((t) => t.description || t.category || 'Unknown')),
      category: mostCommon(group.map((t) => t.category)) || 'Other',
      frequency: match.frequency,
      amount,
      monthly: monthlyFromFrequency(amount, match.frequency),
      last_date: lastDate,
      next_due_date: nextOccurrence(lastDate, match.frequency),
      months_seen: monthsSeen,
    });
  }
  return candidates.sort((a, b) => b.monthly - a.monthly);
}

/**
 * Everything Overview and Yearly Plan need from linked accounts: monthly
 * income and expense averages across the months the data covers, plus the
 * recurring bills detected in it.
 */
export function estimateFromTransactions(transactions = []) {
  const txns = importedTransactions(transactions);
  const months = countMonths(txns.map((t) => t.date));
  if (!txns.length || months === 0) {
    return { hasData: false, months: 0, monthlyIncome: 0, monthlyExpenses: 0, billCandidates: [] };
  }
  const monthlyIncome = round2(
    txns.filter((t) => t.type === 'income').reduce((s, t) => s + num(t.amount), 0) / months
  );
  const monthlyExpenses = round2(
    txns.filter((t) => t.type !== 'income').reduce((s, t) => s + num(t.amount), 0) / months
  );
  return { hasData: true, months, monthlyIncome, monthlyExpenses, billCandidates: estimateBillCandidates(txns) };
}

/**
 * Recurring deposit patterns in the transaction history (linked or manual).
 * A deposit name is a pattern only when it repeats across at least `minMonths`
 * distinct months AND its per-month cadence fits a known pay frequency —
 * one-off deposits (refunds, gifts, sale proceeds) never become income sources,
 * so they cannot distort the annual projection.
 */
export function incomePatternGroups(transactions = [], { minMonths = 2 } = {}) {
  const groups = new Map();
  for (const t of transactions) {
    if (t.exclude_from_cashflow || t.type !== 'income') continue;
    const key = normalizeName(t.description || t.category);
    if (!key) continue;
    const group = groups.get(key) ?? [];
    group.push(t);
    groups.set(key, group);
  }
  const patterns = [];
  for (const group of groups.values()) {
    const lastDate = group.map((t) => t.date).filter(Boolean).sort().at(-1);
    if (!lastDate) continue;
    const monthsSeen = countMonths(group.map((t) => t.date));
    if (monthsSeen < minMonths) continue;
    const perMonth = group.length / monthsSeen;
    const match = OCCURRENCE_TO_FREQUENCY.find((f) => perMonth >= f.minPerMonth);
    if (!match) continue; // deposits with no repeating cadence are not a pay stream
    const amount = round2(group.reduce((s, t) => s + num(t.amount), 0) / group.length);
    const sources = [
      ...new Set(group.map((t) => (Boolean(t.plaid_item_id) || t.source === 'Plaid Sandbox' ? 'Plaid Sandbox' : 'Manual'))),
    ];
    patterns.push({
      name: mostCommon(group.map((t) => t.description || t.category || 'Unknown')),
      frequency: match.frequency,
      amount,
      monthly: monthlyFromFrequency(amount, match.frequency),
      occurrences: group.length,
      months_seen: monthsSeen,
      last_date: lastDate,
      source: sources.length === 1 ? sources[0] : 'Estimated',
    });
  }
  return patterns.sort((a, b) => b.monthly - a.monthly);
}

/** Suggested income entries the user can add on the Yearly Plan. */
export function estimateIncomeCandidates(transactions = []) {
  return incomePatternGroups(transactions);
}

/** Monthly income implied by every detected recurring deposit pattern, saved or not. */
export function incomePatternMonthly(transactions = []) {
  return round2(incomePatternGroups(transactions).reduce((s, p) => s + p.monthly, 0));
}

/** Suggestions not yet saved as bills (matched by normalized name). */
export function pendingCandidates(candidates = [], bills = []) {
  const saved = new Set(bills.map((b) => normalizeName(b.name)));
  return candidates.filter((c) => !saved.has(normalizeName(c.name)));
}