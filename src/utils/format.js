/**
 * Shared formatting utilities. Locale-aware, tabular-numeral friendly.
 * Currency presentation lives here so no component formats ad hoc.
 */
export function formatCurrency(value, { currency = 'USD' } = {}) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

/** Today's date in the viewer's timezone, as YYYY-MM-DD. */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'October 2026' from a 'YYYY-MM' month key. */
export function monthLabel(key) {
  const date = new Date(`${key}-01T00:00:00`);
  if (!Number.isFinite(date.getTime())) return key;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}