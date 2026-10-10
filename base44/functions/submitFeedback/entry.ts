import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
export default async function(req) {
  try {
    const client=createClientFromRequest(req);const user=await client.auth.me();
    if (!user?.id) return Response.json({error:'Unauthorized'},{status:401});
    const body=await req.json().catch(()=>({}));
    if (!Number.isInteger(body.rating) || body.rating<1 || body.rating>5 || typeof body.message!=='string' || !body.message.trim() || body.message.length>2000 || body.consent!==true || typeof body.request_id!=='string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.request_id)) return Response.json({error:'Choose a rating, enter feedback, and confirm consent.'},{status:400});
    // Allowlist only the user-entered fields. No financial context or telemetry.
    await client.entities.Feedback.upsert([{rating:body.rating,message:body.message.trim(),consent:true,submission_key:`${user.id}:${body.request_id}`}],{key:'submission_key'});
    return Response.json({saved:true});
  } catch {
    return Response.json({error:'Feedback was not confirmed. Please retry.'},{status:503});
  }
}
