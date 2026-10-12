import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { plaidRequest } from '../../shared/plaid.ts';
import { storeConnection } from '../../shared/plaidRecords.ts';
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me();
    if (!user?.id) return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json();
    if (typeof body.public_token !== 'string' || !body.public_token.startsWith('public-sandbox-') || body.public_token.length > 512) return Response.json({error:'A Sandbox public token is required'},{status:400});
    const exchanged=await plaidRequest('/item/public_token/exchange',{public_token:body.public_token});
    const actual=await plaidRequest('/item/get',{access_token:exchanged.access_token});
    const institution=await plaidRequest('/institutions/get_by_id',{institution_id:actual.item.institution_id,country_codes:['US']});
    return Response.json(await storeConnection(base44,user,exchanged,{institution_id:actual.item.institution_id,institution_name:institution.institution.name}));
  } catch { return Response.json({error:'Sandbox connection could not be completed. Please retry.'},{status:502}); }
}
