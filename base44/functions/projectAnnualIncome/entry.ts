import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'semiannual', 'annual'];

/**
 * Calculates the annual earnings estimate for one household income source,
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

    const amount=body.amount;
    if(typeof amount!=='number' || !Number.isFinite(amount) || amount<=0 || amount>1e9 || !VALID_FREQUENCIES.includes(body.frequency)) return Response.json({error:'A positive finite amount and valid frequency are required.'},{status:400});
    const perYear={weekly:52,biweekly:26,semimonthly:24,monthly:12,quarterly:4,semiannual:2,annual:1}[body.frequency];
    return Response.json({annual_amount:Math.round(amount*perYear*100)/100,rationale:`Calculated from the entered amount and ${body.frequency} frequency. Excludes unrecorded bonuses, overtime and tax assumptions.`});
  } catch (error) {
    return Response.json({ error: 'Income projection is unavailable. Please retry.' }, { status: 503 });
  }
}