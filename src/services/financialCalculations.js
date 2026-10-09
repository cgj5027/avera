/**
 * Financial calculation services — business-logic layer (Stage 0: stubbed).
 *
 * Contract for later stages:
 * - Every figure must be derived from the active user's records via the
 *   persistence layer (src/services/dataService.js). Never hardcode test
 *   data here and never fabricate totals independent of stored records.
 * - Keep functions pure where possible: pass data in, return data out,
 *   so they are unit-testable without a database.
 */
export const CALCULATIONS_STAGE = 'stub';

const notImplemented = (name) =>
  new Error(`${name} is a Stage 0 stub — figures must come from real user records, never placeholders.`);

export function calculateAvailableCash() {
  throw notImplemented('calculateAvailableCash');
}

export function calculateProjectedRemaining() {
  throw notImplemented('calculateProjectedRemaining');
}

export function calculateIncomeGap() {
  throw notImplemented('calculateIncomeGap');
}

export function calculatePropertyEquity() {
  throw notImplemented('calculatePropertyEquity');
}

export function projectYearlyPlan() {
  throw notImplemented('projectYearlyPlan');
}