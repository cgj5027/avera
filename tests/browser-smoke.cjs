// Run with the Vite server running: node tests/browser-smoke.cjs.
// API responses here are fixtures, not evidence of deployed database behavior.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
  const results=[]; const violations=[];
  for (const theme of ['light','dark']) for(const width of [320,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({theme})=>{localStorage.setItem('base44_access_token','audit-fixture');localStorage.setItem('theme',theme);sessionStorage.setItem('avera_data_mode','manual');},{theme});
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      let body;
      if(path.includes('public-settings'))body={id:'audit',public_settings:{}};
      else if(path.endsWith('/User/me'))body={id:'audit-user',email:'audit@example.test',full_name:'Audit User',role:'user'};
      else if(path.endsWith('/v2/list')) {
        const entity=path.split('/entities/')[1].split('/')[0];
        const fixture={
          Account:[{id:'a',name:'Checking',type:'checking',balance:2500}],
          IncomeSource:[{id:'i',name:'Salary',amount:3000,frequency:'monthly',active:true}],
          Bill:[{id:'b',name:'Utilities',amount:100,frequency:'monthly',next_due_date:'2026-10-15'}],
          BudgetCategory:[{id:'c',name:'Groceries',monthly_limit:300}],
          Transaction:[{id:'t',category:'Groceries',amount:50,type:'expense',date:'2026-10-01'}],
          Property:[{id:'p',nickname:'Home',estimated_value:100000,taxes_monthly:100}],
          MortgageRecord:[{id:'m',property_id:'p',outstanding_balance:40000,monthly_payment:500}],
          Goal:[{id:'g',name:'Emergency fund',target_amount:5000,saved_amount:1000,target_date:'2027-10-01'}],
        };
        body={items:(fixture[entity]||[]).map(r=>({...r,created_by_id:'audit-user'})),has_more:false,next_cursor:null};
      }
      else body={};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    for(const path of ['/','/bills-budget','/yearly-plan','/goals-opportunities','/properties','/settings','/login','/register']) {
      await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173')+path,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(150);
      await page.getByRole('heading').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${theme} ${width} ${path}`);
      const title=await page.getByRole('heading').first().innerText();
      assert(!title.includes('Something went wrong'),`unexpected error ${path}`);
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const accessibility=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
      if(accessibility.length)violations.push({theme,width,path,accessibility});
      results.push({theme,width,path,title,overflow:false});
      const dialogs = {
        '/': ['Add account'], '/bills-budget': ['Add bill'],
        '/yearly-plan': ['Add income source'], '/goals-opportunities': ['Add goal','Log contribution'],
        '/properties': ['Add property'],
      };
      for (const button of dialogs[path] || []) {
        await page.getByRole('button',{name:button,exact:true}).click();
        const dialog=page.getByRole('dialog');await dialog.waitFor();
        await page.waitForTimeout(250);
        const rect=await dialog.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width,`dialog overflow ${width} ${button}`);
        const dialogAxe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
        if(dialogAxe.length)violations.push({theme,width,path,dialog:button,accessibility:dialogAxe});
        if(path==='/properties') {
          assert(await page.getByLabel('Type',{exact:true}).count()===1,'property type has accessible label');
          await page.screenshot({animations:'disabled',path:`/tmp/avera-property-${theme}-${width}.png`});
        }
        await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      }
      if (path === '/bills-budget') {
        await page.getByRole('tab',{name:'Budget',exact:true}).click();
        for (const button of ['Add budget category','Log spending']) {
          await page.getByRole('button',{name:button,exact:true}).click();
          await page.getByRole('dialog').waitFor();await page.waitForTimeout(250);
          const a=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
          if(a.length)violations.push({theme,width,path,dialog:button,accessibility:a});
          await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
        }
      }
    }
    assert.deepEqual(errors,[],`browser errors ${theme} ${width}`);
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({passed:results.length,results,violations},null,2));
  assert.equal(violations.length,0,'Accessibility violations found; inspect the result file');
})().catch(err=>{console.error(err);process.exit(1)});
