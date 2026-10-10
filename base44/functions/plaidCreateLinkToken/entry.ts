import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { allRecords, plaidRequest } from '../../shared/plaid.ts';
import { credentialFor } from '../../shared/plaidRecords.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body=await req.json().catch(()=>({}));
    let accessToken;
    if (body.item_id) {
      const items=await allRecords(base44.entities.PlaidItem,{created_by_id:user.id,item_id:body.item_id});
      if (items.length!==1) return Response.json({error:'Connection not found'},{status:404});
      accessToken=(await credentialFor(base44,user,items[0])).access_token;
    }
    const token = await plaidRequest('/link/token/create', {
      user: { client_user_id: user.id },
      client_name: 'Avera',
      ...(accessToken ? {access_token:accessToken} : {products:['transactions']}),
      country_codes: ['US'],
      language: 'en'
    });
    return Response.json({ link_token: token.link_token, expiration: token.expiration });
  } catch (error) {
    return Response.json({ error: 'Sandbox Link is unavailable. Please retry.' }, { status: 502 });
  }
}