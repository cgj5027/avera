// Real frontend plus a durable in-memory API fixture. No cloud/AI/job-provider calls.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
function matches(row,query) {return Object.entries(query).every(([key,value])=>key==='$or'?value.some(q=>matches(row,q)):key==='$and'?value.every(q=>matches(row,q)):value&&typeof value==='object'&&'$exists'in value?Object.hasOwn(row,key)===value.$exists:row[key]===value);}
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const outcomes=[],violations=[];
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rows={IncomeSource:[{id:'hidden',name:'Hidden demo income',amount:99999,created_by_id:'a',demo_profile:'early_career'}],JobProfile:[],Transaction:['2026-08-01','2026-09-01'].map((date,i)=>({id:`t${i}`,created_by_id:'a',demo_profile:null,description:'Second payroll',amount:1000,type:'income',date,source:'Plaid Sandbox',plaid_item_id:'item'}))};let searchMode='results';
  await page.addInitScript(theme=>{localStorage.setItem('base44_access_token','fixture');localStorage.setItem('theme',theme);sessionStorage.setItem('avera_data_mode:a','sandbox');},theme);
  await page.route('https://**/*',r=>r.abort());
  await page.route('**/api/**',async route=>{
   const url=new URL(route.request().url()),path=url.pathname,method=route.request().method();if(!path.startsWith('/api/'))return route.continue();let body={},status=200;
   if(path.includes('public-settings'))body={id:'fixture',public_settings:{}};
   else if(path.endsWith('/User/me'))body={id:'a',email:'fixture@example.test',full_name:'Fixture',role:'user'};
   else if(path.includes('/functions/projectAnnualIncome'))body={annual_amount:12000,rationale:'Fixture estimate only'};
   else if(path.includes('/functions/searchJobOpportunities')) {
    if(searchMode==='failure'){status=503;body={error:'Fixture unavailable'};}
    else body={related_roles_searched:true,opportunities:searchMode==='empty'?[]:[{title:'Fixture bookkeeper',company:'Fixture employer',url:'https://www.indeed.com/viewjob?jk=fixture',publisher:'Fixture source',compensation:'$18-$22/hr',employment_type:'part_time',location:'Remote',match_score:5}]};
   }
   else if(path.includes('/entities/')) {
    const [name,...tail]=path.split('/entities/')[1].split('/');rows[name]??=[];
    if(tail.join('/')==='v2/list')body={items:rows[name].filter(r=>matches(r,JSON.parse(url.searchParams.get('q')||'{}'))),has_more:false};
    else if(method==='POST') {await new Promise(r=>setTimeout(r,250));body={...route.request().postDataJSON(),id:`${name}-${rows[name].length}`,created_by_id:'a',updated_date:new Date().toISOString()};body.demo_profile=body.demo_profile||null;rows[name].push(body);}
    else if(method==='PUT') {body=rows[name].find(r=>r.id===tail[0]);Object.assign(body,route.request().postDataJSON(),{updated_date:new Date().toISOString()});}
    else body=rows[name].find(r=>r.id===tail[0])||{};
   }
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  });
  async function go(path){await page.goto((process.env.AUDIT_BASE_URL||'http://127.0.0.1:4173')+path);await page.getByRole('heading').first().waitFor();}
  async function check(state) {
   await page.waitForTimeout(300);
   if(!(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))) {await page.screenshot({path:'/tmp/avera-followup-overflow.png'});console.error(await page.evaluate(()=>[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth).slice(0,8).map(el=>({tag:el.tagName,classes:String(el.className),right:el.getBoundingClientRect().right}))));}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${theme} ${width} ${state}`);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const v=await page.evaluate(async()=>{const result=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
   if(v.length)violations.push({theme,width,state,violations:v});outcomes.push({theme,width,state});
  }
  await go('/yearly-plan');await page.getByRole('button',{name:'Add income source',exact:true}).click();
  await page.getByLabel('Source name').fill('Regression salary');await page.getByLabel('Amount per paycheck').fill('2000');
  await page.getByRole('combobox',{name:'Pay frequency'}).click();await page.getByRole('option',{name:'Every 2 weeks',exact:true}).click();
  await check('manual income dialog');await page.getByRole('dialog').getByRole('button',{name:'Add income source',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.getByRole('heading',{name:'Regression salary'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Hidden demo income'}).count(),0);
  await page.getByRole('button',{name:'Edit source'}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Add as income source'}).click();await page.getByRole('dialog').waitFor();await check('detected income dialog');
  await page.getByRole('dialog').getByRole('button',{name:'Add income source',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('heading',{name:'Second payroll'}).waitFor();
  await go('/opportunities');await page.getByLabel('Skills').waitFor();assert(await page.getByRole('button',{name:'Find opportunities'}).isDisabled());
  await page.getByLabel('Skills').fill('Bookkeeping, payroll');await page.getByLabel('Preferred jobs or gigs').fill('Bookkeeper');await page.getByLabel('Location').fill('Denver, CO');
  await check('work profile form');await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Saved',{exact:true}).waitFor();await check('saved work profile');
  await go('/yearly-plan');await page.getByRole('heading',{name:'Regression salary'}).waitFor();await page.getByRole('heading',{name:'Second payroll'}).waitFor();
  assert.equal(rows.IncomeSource.filter(r=>!r.demo_profile).length,2);await check('persisted income cards');
  await go('/opportunities');await page.getByText('Saved',{exact:true}).waitFor();await page.getByText('Bookkeeping, payroll',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Edit profile'}).click();await page.getByLabel('Skills').fill('Bookkeeping, payroll, Excel');await page.getByRole('button',{name:'Save profile'}).click();await page.getByText('Saved',{exact:true}).waitFor();
  await page.reload();await page.getByText('Bookkeeping, payroll, Excel',{exact:true}).waitFor();assert.equal(rows.JobProfile.length,1);await check('persisted updated profile');
  await page.getByRole('button',{name:'Find opportunities'}).click();await page.getByText('Source-linked results',{exact:true}).waitFor();await check('source-linked search');
  searchMode='empty';await page.getByRole('button',{name:'Find opportunities'}).click();await page.getByText('No matches found',{exact:true}).waitFor();await check('empty search');
  searchMode='failure';await page.getByRole('button',{name:'Find opportunities'}).click();await page.getByText('Demonstration listings',{exact:true}).waitFor();await check('unavailable search');
  await page.screenshot({path:`/tmp/avera-followup-opportunities-${theme}-${width}.png`,fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[],`page errors ${theme} ${width}`);await page.close();
 }
 await browser.close();console.log(JSON.stringify({checks:outcomes.length,violations,outcomes},null,2));assert.equal(violations.length,0);
})().catch(e=>{console.error(e);process.exit(1)});
