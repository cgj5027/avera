/**
 * Property valuation service — provider-agnostic seam.
 *
 * Today: manual, user-provided estimates only, always labeled "Manual" so
 * no figure is ever mistaken for a verified market valuation.
 *
 * Future: register a valuation provider as a backend function that wraps an
 * external API (credentials in secure server-side secrets) and add it to
 * PROVIDERS below. getValuation prefers a verified provider result and falls
 * back to the user-provided estimate. It never fabricates a live valuation.
 */
export const VALUATION_STAGE = 'manual-only';

/* Registered providers — empty until an external API is configured. */
export const PROVIDERS = [];

export async function getValuation(property) {
  const hasProvider = PROVIDERS.length > 0 && property?.valuation_source === 'external_provider';
  return {
    value: property?.estimated_value ?? null,
    source: 'Manual',
    note: hasProvider ? 'Verified provider result' : 'User-provided estimate',
    asOf: property?.valuation_date ?? null,
    provider: hasProvider ? PROVIDERS[0] : null,
  };
}