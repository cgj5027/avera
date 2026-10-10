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
  const m = /\$?\s?([\d,]+(?:\.\d+)?)\s*(?:\/|per\s+)?\s*(?:hr|hour)/i.exec(String(text ?? ''));
  if (!m) return null;
  const rate = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Estimated monthly take-home for an hourly opportunity given the user's
 * available weekly hours. Returns null when either input is missing.
 */
export function estimatedTakeHomeMonthly(hourlyRate, weeklyHours) {
  const rate = Number(hourlyRate);
  const hours = Number(weeklyHours);
  if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(rate * hours * (52 / 12) * ESTIMATED_TAKE_HOME_RATE * 100) / 100;
}

/** Share of a monthly additional-income target an opportunity covers (0–100). */
export function coversTargetPercent(monthlyTakeHome, targetMonthlyIncome) {
  const take = Number(monthlyTakeHome);
  const target = Number(targetMonthlyIncome);
  if (!Number.isFinite(take) || take <= 0 || !Number.isFinite(target) || target <= 0) return null;
  return Math.min(100, Math.round((take / target) * 100));
}