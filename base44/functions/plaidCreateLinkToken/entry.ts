import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { plaidRequest } from '../../shared/plaid.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const token = await plaidRequest('/link/token/create', {
      user: { client_user_id: user.id },
      client_name: 'Avera',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    });
    return Response.json({ link_token: token.link_token, expiration: token.expiration });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}