// Demo Mode: connects the selected profile's Plaid Sandbox custom user.
// Uses the real Sandbox flow (public token → exchange → accounts), stores the
// Item demo-tagged so reset can remove only this demo workspace's data.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { plaidRequest } from '../../shared/plaid.ts';
import { storeConnection } from '../../shared/plaidRecords.ts';
import { demoSandboxConfig } from '../../shared/demoPlaidConfigs.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const profileKey = typeof body.profile_key === 'string' ? body.profile_key : '';
    let config;
    try {
      config = demoSandboxConfig(profileKey);
    } catch {
      return Response.json({ error: 'Unknown demo profile' }, { status: 400 });
    }

    // Real Plaid Sandbox connection behavior: public token for the custom
    // user, then a standard token exchange.
    const token = await plaidRequest('/sandbox/public_token/create', {
      institution_id: config.institution_id,
      initial_products: config.products,
      options: {
        override_username: 'user_custom',
        override_password: JSON.stringify({ override_accounts: config.accounts }),
      },
    });
    const exchanged = await plaidRequest('/item/public_token/exchange', { public_token: token.public_token });

    const result = await storeConnection(base44,user,exchanged,{institution_id:config.institution_id,institution_name:config.institution_name,demo_profile:profileKey});
    return Response.json({...result,profile_key:profileKey});
  } catch {
    return Response.json({error:'Demo Sandbox connection could not be completed.'},{status:502});
  }
}
