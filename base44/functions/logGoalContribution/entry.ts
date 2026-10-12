import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';
import { datasetQuery } from '../../shared/dataset.ts';
import { allRecords } from '../../shared/plaid.ts';
export default async function(req) {
  try {
    const client=createClientFromRequest(req);const user=await client.auth.me();
    if (!user?.id) return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json().catch(()=>({}));
    if (typeof body.goal_id!=='string' || typeof body.request_id!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.request_id) || typeof body.amount!=='number' || !Number.isFinite(body.amount) || body.amount<=0 || body.amount>1e9 || Math.abs(body.amount*100-Math.round(body.amount*100))>0.0001) return Response.json({error:'Enter a valid contribution.'},{status:400});
    const scope=datasetQuery(user,body.dataset);
    const goals=await allRecords(client.entities.Goal,{...scope,id:body.goal_id});
    if (goals.length!==1 || goals[0].created_by_id!==user.id) return Response.json({error:'Goal not found.'},{status:404});
    const contribution_key=`${user.id}:${body.goal_id}:${body.request_id}`;
    const existing=await allRecords(client.entities.GoalContribution,{created_by_id:user.id,contribution_key});
    if (existing.some(row=>row.amount!==body.amount)) return Response.json({error:'Use a new request for a different contribution.'},{status:409});
    await client.entities.GoalContribution.upsert([{goal_id:body.goal_id,amount:body.amount,contribution_key,demo_profile:goals[0].demo_profile || ''}],{key:'contribution_key'});
    return Response.json({saved:true});
  } catch {
    return Response.json({error:'Unable to save the contribution. Please retry.'},{status:503});
  }
}
