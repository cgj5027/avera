// Fixture browser audit. No real Plaid/model calls are made.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const outcomes=[];const violations=[];
 for(const theme of ['light','dark'])for(const width of (process.env.AUDIT_WIDTHS ? process.env.AUDIT_WIDTHS.split(',').map(Number) : [320,390,768,1440])) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({theme})=>{localStorage.setItem('base44_access_token','fixture');localStorage.setItem('theme',theme);sessionStorage.setItem('avera_data_mode:audit-user','demo');localStorage.setItem('avera_demo_workspace:audit-user',JSON.stringify({profile:'multi_income',plaid_item_id:'fixture-item'}));},{theme});
  await page.route('https://**/*',r=>r.abort());
  let disconnected=false;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;if(!path.startsWith('/api/'))return route.continue();let body={};
   if(path.includes('public-settings'))body={id:'fixture',public_settings:{}};
   else if(path.endsWith('/User/me'))body={id:'audit-user',email:'fixture@example.test',full_name:'Fixture',role:'user'};
   else if(path.includes('/functions/askAvera'))body={answer:'Fixture response only. These are sample records.'};
   else if(path.includes('/functions/plaidDisconnect')){body={disconnected:true};disconnected=true;}
   else if(path.includes('/functions/plaidSync'))body={results:[{item_id:'fixture-item',status:'error',error:'ITEM_LOGIN_REQUIRED'}]};
   else if(path.endsWith('/v2/list')) {
    const name=path.split('/entities/')[1].split('/')[0];
    const records={Account:[{id:'a',name:'Fixture checking',type:'checking',balance:1000,source:'Plaid Sandbox',plaid_item_id:'fixture-item',balance_as_of:'2026-10-10T12:00:00Z'},{id:'credit',name:'Fixture credit',type:'credit_card',balance:-200,source:'Plaid Sandbox',plaid_item_id:'fixture-item'},{id:'investment',name:'Fixture investment',type:'investment',balance:5000,source:'Plaid Sandbox',plaid_item_id:'fixture-item'}],IncomeSource:[{id:'i',name:'Fixture income',amount:3000,frequency:'monthly',source:'Sample data'}],Bill:[{id:'b',name:'Fixture bill',amount:100,frequency:'monthly',next_due_date:'2026-11-01',source:'Sample data'}],BudgetCategory:[{id:'c',name:'Groceries',monthly_limit:200,source:'Sample data'}],Transaction:[{id:'t',description:'Fixture store',category:'Groceries',amount:30,type:'expense',date:'2026-10-01',source:'Plaid Sandbox',plaid_item_id:'fixture-item'}],Goal:[{id:'g',name:'Fixture goal',target_amount:1000,saved_amount:200,target_date:'2027-10-01',source:'Sample data'}],Property:[{id:'p',nickname:'Fixture home',estimated_value:100000,source:'Sample data'}],MortgageRecord:[{id:'m',property_id:'p',outstanding_balance:50000,monthly_payment:500,source:'Sample data'}],PlaidItem:disconnected?[]:[{id:'item',item_id:'fixture-item',institution_name:'Fixture bank',status:'needs_reauth',last_sync_error:'ITEM_LOGIN_REQUIRED'}]};
    body={items:(records[name]||[]).map(r=>({...r,created_by_id:'audit-user',demo_profile:'multi_income'})),has_more:false};
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  async function check(path,state='page') {
   // Inspect settled UI rather than transient modal/overlay animation colors.
   await page.waitForTimeout(300);
   if(!(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))) {await page.screenshot({path:'/tmp/stage3-overflow.png'});console.error(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth).slice(0,10).map(el=>({tag:el.tagName,classes:String(el.className),right:el.getBoundingClientRect().right}))));}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${theme} ${width} ${path} ${state}`);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const v=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(x=>({id:x.id,nodes:x.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
   if(v.length)violations.push({theme,width,path,state,violations:v});outcomes.push({theme,width,path,state});
  }
  for(const path of (process.env.AUDIT_PATHS ? process.env.AUDIT_PATHS.split(',') : ['/','/bills-budget','/yearly-plan','/properties','/settings','/ask-avera'])) {
   await page.goto((process.env.AUDIT_BASE_URL||'http://127.0.0.1:5173')+path);await page.getByRole('heading').first().waitFor();await page.waitForTimeout(150);
   if(path==='/') {
    assert((await page.locator('dl').filter({has:page.locator('dt',{hasText:'Available cash'})}).locator('dd').innerText()).includes('$1,000.00'),'liquid cash excludes investments and credit debt');
    assert((await page.locator('dl').filter({has:page.locator('dt',{hasText:'Total debts'})}).locator('dd').innerText()).includes('$50,200.00'),'credit debt increases mortgage liabilities');
    await page.getByRole('button',{name:/Accounts/}).click();await page.getByText(/Balance as of/).waitFor();}
   if(path==='/ask-avera') {await page.getByLabel('Ask Avera',{exact:true}).fill('My demo finances?');await page.getByRole('button',{name:'Send question'}).click();await page.getByText(/Fixture response only/).waitFor();}
   await check(path);
   if(path==='/bills-budget') {for(const tab of ['Budget','Goals','Transactions']) {await page.getByRole('tab',{name:tab,exact:true}).click();await check(path,tab+' tab');}}
   await page.getByRole('button',{name:'Reset demo profile'}).click();await page.getByRole('dialog').waitFor();await check(path,'reset confirmation');await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   if(path==='/settings') {
    await page.getByRole('button',{name:'Reconnect',exact:true}).waitFor();
    await page.getByRole('button',{name:'Sync now'}).click();await page.getByRole('alert').filter({hasText:/Some connections/}).waitFor();await check(path,'failed sync');
    await page.getByRole('button',{name:'Disconnect Fixture bank'}).click();await page.getByRole('dialog').waitFor();await check(path,'disconnect confirmation');
    await page.getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.getByText(/No test banks connected/).waitFor();await check(path,'disconnected');
    await page.screenshot({path:`/tmp/avera-stage3-settings-${theme}-${width}.png`,fullPage:true,animations:'disabled'});
   }
  }
  assert.deepEqual(errors,[],`page exceptions ${theme} ${width}`);await page.close();
 }
 await browser.close();console.log(JSON.stringify({checks:outcomes.length,violations,outcomes},null,2));assert.equal(violations.length,0);
})().catch(e=>{console.error(e);process.exit(1);});
