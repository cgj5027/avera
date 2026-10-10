// Real integration harness. Never bundled into the application. Values stay in secure environment bindings.
import { createClient } from '@base44/sdk';
const appId=process.env.BASE44_TEST_APP_ID;
const token=process.env.BASE44_TEST_USER_TOKEN;
if (!appId || !token) {
  console.log('BLOCKED: BASE44_TEST_APP_ID and BASE44_TEST_USER_TOKEN are not configured. No network requests executed.');
  process.exit(2);
}
const client=createClient({appId,token});
let item;
try {
  const user=await client.auth.me();if(!user?.id)throw new Error('Unauthorized');
  const connection=await client.functions.invoke('demoSandboxConnect',{profile_key:'early_career'});
  item=connection.data?.item_id;if(!item)throw new Error('Connection failed');
  let synced;
  for(let attempt=0;attempt<5;attempt++) {
    synced=await client.functions.invoke('plaidSync',{item_id:item});
    const result=synced.data?.results?.find(r=>r.item_id===item);
    if(result?.status==='synced'&&result.transactions>0)break;
    if(attempt===4)throw new Error('Sync incomplete');
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  const before=await client.entities.Transaction.filter({created_by_id:user.id,plaid_item_id:item},{limit:100});
  if(!before.items.length)throw new Error('No transactions');
  await client.functions.invoke('plaidSync',{item_id:item});
  const after=await client.entities.Transaction.filter({created_by_id:user.id,plaid_item_id:item},{limit:100});
  if(new Set(after.items.map(r=>r.plaid_transaction_id)).size!==after.items.length)throw new Error('Duplicate transactions');
  console.log('PASSED: real programmatic Sandbox connection, first sync, repeat sync and bounded duplicate check. Manual Link and two-user tests remain untested.');
} catch {
  console.log('FAILED: live Sandbox workflow did not complete. No credentials or financial records printed.');process.exitCode=1;
} finally {
  if(item)try {await client.functions.invoke('plaidDisconnect',{item_id:item,demo_only:true});}
  catch {console.log('FAILED: test connection cleanup requires retry.');process.exitCode=1;}
}
