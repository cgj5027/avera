// Built UI with API fixtures; does not certify deployed AI or cloud persistence.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const results=[];
 for(const theme of ['light','dark']) for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});let added=[],dismissed=[];
  await page.addInitScript(theme=>{localStorage.setItem('base44_access_token','fixture');localStorage.setItem('theme',theme);sessionStorage.setItem('avera_data_mode:user','manual');},theme);
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;let body={};
   if(path.includes('public-settings'))body={id:'fixture',public_settings:{}};
   else if(path.endsWith('/User/me'))body={id:'user',email:'fixture@example.test',role:'user'};
   else if(path.endsWith('/v2/list'))body={items:[],has_more:false};
   else if(path.includes('suggestBills')){
    const request=route.request().postDataJSON();
    if(request.action==='scan') body={ai_available:true,mortgages_tracked:1,suggestions:['Electric utility','Insurance'].map((name,i)=>({name,fingerprint:'candidate'+i,amount:80,frequency:'monthly',next_due_date:'2026-11-05',category:'Utilities',confidence:'High',reason:'Four monthly payments with similar amounts.',evidence:[{date:'2026-10-05',amount:80,source:'Manual'}]}))};
    if(request.action==='add'){added.push(request);body={bill:{id:'bill'}};}
    if(request.action==='dismiss'){dismissed.push(request);body={dismissed:true};}
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4182')+'/bills-budget');
  const suggest=page.getByRole('button',{name:'Suggest bills'});
  const add=page.getByRole('button',{name:'Add bill',exact:true});
  assert.equal(await page.getByRole('region',{name:'Review bill suggestions'}).count(),0);
  const suggestRect=await suggest.boundingBox(),addRect=await add.boundingBox();
  assert(Math.abs(suggestRect.y-addRect.y)<1,'bill actions inline');
  await suggest.focus();
  await page.getByRole('tooltip').waitFor();
  await suggest.click();await page.getByRole('heading',{name:'Electric utility'}).waitFor();
  assert(await page.getByRole('button',{name:'Add selected bills (0)'}).isDisabled());
  await page.getByText('Supporting payments',{exact:true}).first().click();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  assert.deepEqual(violations,[],`${theme}/${width} accessibility`);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme}/${width} overflow`);
  await page.getByLabel('Amount (estimated)').first().fill('95');await page.getByRole('button',{name:'Keep',exact:true}).first().click();
  await page.getByRole('button',{name:'Dismiss',exact:true}).last().click();await page.getByRole('heading',{name:'Insurance'}).waitFor({state:'detached'});
  await page.getByRole('button',{name:'Add selected bills (1)'}).click();await page.getByText('1 selected bill added.',{exact:true}).waitFor();
  assert.equal(added.length,1);assert.equal(added[0].bill.amount,95);assert.equal(dismissed.length,1);
  results.push({theme,width,violations});await page.close();
 }
 await browser.close();console.log(JSON.stringify({checks:results.length,results},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
