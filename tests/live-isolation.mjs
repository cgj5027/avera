// Destructive only to fresh synthetic records created by this harness.
// Run solely against the isolated test app; never with ordinary user tokens.
import {createClient} from '@base44/sdk';
const appId=process.env.BASE44_TEST_APP_ID;
const first=process.env.BASE44_TEST_USER_TOKEN;
const second=process.env.BASE44_TEST_SECOND_USER_TOKEN;
if (!appId || !first || !second) {
  console.log('BLOCKED: isolated app ID and two disposable-user tokens are required. No network requests executed.');
  process.exit(2);
}
const a=createClient({appId,token:first});const b=createClient({appId,token:second});
const created=[];
async function denied(operation) {
  try {await operation();} catch(error) {
    if ([403,404].includes(error.response?.status || error.status)) return;
    throw new Error('Denial was not demonstrated');
  }
  throw new Error('Unauthorized operation succeeded');
}
async function isolated(client,owner,id) {
  const page=await client.entities.Goal.filter({created_by_id:owner,id},{limit:10});
  if (page.items.length) throw new Error('Foreign record exposed');
  await denied(()=>client.entities.Goal.get(id));
  await denied(()=>client.entities.Goal.update(id,{name:'Isolation sentinel'}));
  await denied(()=>client.entities.Goal.delete(id));
  const response=await client.functions.invoke('logGoalContribution',{goal_id:id,amount:1,request_id:crypto.randomUUID()}).catch(error=>({status:error.response?.status || error.status}));
  if (response.status!==404) throw new Error('Foreign contribution boundary not demonstrated');
}
try {
  const ua=await a.auth.me();const ub=await b.auth.me();
  if (!ua?.id || !ub?.id || ua.id===ub.id) throw new Error('Distinct authenticated users required');
  for(const client of [a,b]) {
    const goal=await client.entities.Goal.create({name:'Acceptance fixture only',target_amount:100,saved_amount:0,source:'Manual',demo_profile:''});
    created.push({client,id:goal.id});
    if(!goal.id || goal.created_by_id!==(client===a?ua.id:ub.id))throw new Error('Synthetic ownership was not demonstrated');
  }
  await isolated(b,ua.id,created[0].id);await isolated(a,ub.id,created[1].id);
  for(const row of created) {const own=await row.client.entities.Goal.get(row.id);if(own.name!=='Acceptance fixture only' || own.saved_amount!==0)throw new Error('Foreign attempts changed a synthetic record');}
  const goal=created[0];const requestId=crypto.randomUUID();
  const body={goal_id:goal.id,amount:10,request_id:requestId};
  await Promise.all([a.functions.invoke('logGoalContribution',body),a.functions.invoke('logGoalContribution',{...body,amount:20,request_id:crypto.randomUUID()})]);
  await a.functions.invoke('logGoalContribution',body);
  const page=await a.entities.GoalContribution.filter({created_by_id:ua.id,goal_id:goal.id},{limit:100});
  if (page.has_more || page.items.length!==2 || page.items.reduce((sum,row)=>sum+row.amount,0)!==30) throw new Error('Concurrent contribution persistence failed');
  const foreign=await b.entities.GoalContribution.filter({created_by_id:ua.id,goal_id:goal.id},{limit:100});
  if(foreign.items.length)throw new Error('Foreign contribution records exposed');
  for(const row of page.items)created.push({client:a,id:row.id,entity:'GoalContribution'});
  console.log('PASSED: two ordinary users isolated for synthetic goal CRUD and contribution endpoint; concurrent contributions and retry persisted. Other entities, admin roles, private files and Plaid remain separate checks.');
} catch {
  console.log('FAILED: isolated two-user workflow did not demonstrate all assertions. No IDs, tokens or financial contents printed.');process.exitCode=1;
} finally {
  for(const row of created.reverse()) {
    try {
      if (!row.entity) {
        const ledger=await row.client.entities.GoalContribution.filter({goal_id:row.id},{limit:100});
        if (ledger.has_more) throw new Error('Cleanup incomplete');
        for(const entry of ledger.items)await row.client.entities.GoalContribution.delete(entry.id);
      }
      await row.client.entities[row.entity || 'Goal'].delete(row.id);
    } catch {console.log('FAILED: synthetic record cleanup needs review in the isolated app.');process.exitCode=1;}
  }
}
