/**
 * Income-opportunity calculations (Stage 2) — business-logic layer.
 * Pure functions: parse advertised compensation and estimate take-home
 * income. Take-home is always an explicit estimate; advertised gross is
 * never altered.
 */
export const CALCULATIONS_STAGE = 'live';

/** Estimated take-home share of gross pay. Always labeled Estimated in UI. */
export const ESTIMATED_TAKE_HOME_RATE = 0.78;

/** Parses an advertised hourly rate like "$25/hr" or "$25 per hour". */
export function parseHourlyRate(text) {
  // Ambiguous ranges, mixed units and non-dollar currencies need provider-specific parsing.
  if (typeof text !== 'string' || /[-–—]|\b(?:to|year|annual|month|net|take.home)\b|[€£]/i.test(text)) return null;
  const m = /^\s*(?:USD\s*)?\$?((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(?:\/|per\s+)?\s*(?:hr|hour)(?:\s+gross)?\s*$/i.exec(text);
  if (!m) return null;
  const rate = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Estimated monthly take-home for an hourly opportunity given the user's
 * available weekly hours. Returns null when either input is missing.
 */
export function estimatedTakeHomeMonthly(hourlyRate, weeklyHours) {
  if (![hourlyRate, weeklyHours].every(v => (typeof v === 'number' || typeof v === 'string') && String(v).trim())) return null;
  const rate = Number(hourlyRate);
  const hours = Number(weeklyHours);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(hours) || hours <= 0 || hours > 80) return null;
  const amount = rate * hours * (52 / 12) * ESTIMATED_TAKE_HOME_RATE;
  return Number.isFinite(amount * 100) ? Math.round(amount * 100) / 100 : null;
}

/** Share of a monthly additional-income target an opportunity covers (0–100). */
export function coversTargetPercent(monthlyTakeHome, targetMonthlyIncome) {
  if (![monthlyTakeHome, targetMonthlyIncome].every(v => (typeof v === 'number' || typeof v === 'string') && String(v).trim())) return null;
  const take = Number(monthlyTakeHome);
  const target = Number(targetMonthlyIncome);
  if (!Number.isFinite(take) || take <= 0 || !Number.isFinite(target) || target <= 0) return null;
  return Math.min(100, Math.round((take / target) * 100));
}
