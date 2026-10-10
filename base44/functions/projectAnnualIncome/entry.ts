import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'semiannual', 'annual'];

/**
 * Projects the annual earnings for one household income source with the LLM,
 * based on the observed transaction pattern the user is adding it from.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? '').trim().slice(0, 120);
    if (!name) return Response.json({ error: 'A source name is required.' }, { status: 400 });

    const amount = Number(body.amount) || 0;
    const frequency = VALID_FREQUENCIES.includes(body.frequency) ? body.frequency : 'monthly';
    const occurrences = Math.max(0, Math.floor(Number(body.occurrences) || 0));
    const monthsSeen = Math.max(0, Math.floor(Number(body.months_seen) || 0));
    const sourceLabel = String(body.source ?? '').trim().slice(0, 40);

    const projection = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are projecting the annual earnings of one household income source for a personal-finance planner.

Income source name: "${name}"
Observed per-occurrence amount: $${amount.toFixed(2)}
Observed pay cadence estimate: ${frequency}
Observed occurrences in the transaction history: ${occurrences}, spread across ${monthsSeen} distinct month(s)
Origin: ${sourceLabel || 'unknown'}

Project a realistic annual earnings figure (US dollars, number only) for the next 12 months. Start from the observed amount and cadence, and account for common patterns of this kind of income (bonuses, overtime, seasonal work, benefits) only when the observations suggest them. Keep the rationale to one short sentence.`,
      response_json_schema: {
        type: 'object',
        properties: {
          annual_amount: { type: 'number', description: 'Projected annual earnings in US dollars' },
          rationale: { type: 'string', description: 'One short sentence explaining the projection' },
        },
        required: ['annual_amount', 'rationale'],
      },
    });

    const annual = Number(projection?.annual_amount);
    return Response.json({
      annual_amount: Number.isFinite(annual) && annual >= 0 ? Math.round(annual * 100) / 100 : 0,
      rationale: String(projection?.rationale ?? '').slice(0, 300),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}