/**
 * Shared formatting utilities. Locale-aware, tabular-numeral friendly.
 * Currency presentation lives here so no component formats ad hoc.
 */
export function formatCurrency(value, { currency = 'USD' } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}