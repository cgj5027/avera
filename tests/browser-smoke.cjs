// Run with the Vite server running: node tests/browser-smoke.cjs.
// API responses here are fixtures, not evidence of deployed database behavior.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless:true, executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox'] });
  const results=[]; const violations=[];
  for (const theme of ['light','dark']) for(const width of [320,390,768,1440]) {
    const page=await browser.newPage({viewport:{width,height:Number(process.env.AUDIT_HEIGHT)||900}});
    const feedbackPayloads=[];
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({theme})=>{localStorage.setItem('base44_access_token','audit-fixture');localStorage.setItem('theme',theme);sessionStorage.setItem('avera_data_mode:audit-user','manual');},{theme});
    await page.route('https://**/*',route=>route.abort());
    await page.route('**/api/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      if (!path.startsWith('/api/')) return route.continue();
      let body;
      if(path.includes('public-settings'))body={id:'audit',public_settings:{}};
      else if(path.endsWith('/User/me'))body={id:'audit-user',email:'audit@example.test',full_name:'Audit User',role:'user'};
      else if(path.includes('/functions/submitFeedback')) {
        feedbackPayloads.push(route.request().postDataJSON());
        if(feedbackPayloads.length===1) return route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture network failure"}'});
        body={saved:true};
      }
      else if(path.includes('/functions/askAvera')) body={answer:'Browser fixture only: **$100.00** is a test figure, not a live calculation. '+ 'longword'.repeat(30)};
      else if(path.includes('/functions/searchJobOpportunities')) body={opportunities:[{title:'Fixture role',company:'Fixture employer',compensation:'$25/hr',location:'Remote',url:'https://www.indeed.com/viewjob?jk=fixture'}]};
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
          JobProfile:[{id:'job',skills:'Bookkeeping',job_type:'any'}],
          Goal:[{id:'g',name:'Emergency fund',target_amount:5000,saved_amount:1000,target_date:'2027-10-01'}],
        };
        body={items:(fixture[entity]||[]).map(r=>({...r,created_by_id:'audit-user'})),has_more:false,next_cursor:null};
      }
      else body={};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    const paths=process.env.AUDIT_PATHS?JSON.parse(process.env.AUDIT_PATHS):['/','/bills-budget','/yearly-plan','/opportunities','/properties','/settings','/login','/register','/ask-avera'];
    for(const path of paths) {
      await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173')+path,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(150);
      await page.getByRole('heading').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${theme} ${width} ${path}`);
      const title=await page.getByRole('heading').first().innerText();
      assert(!title.includes('Something went wrong'),`unexpected error ${path}`);
      if (path === '/ask-avera') {
        await page.getByLabel('Ask Avera',{exact:true}).fill('What are my savings?');
        await page.getByRole('button',{name:'Send question'}).click();
        await page.getByText(/Browser fixture only/).waitFor();
      }
      const feedbackTrigger=page.getByRole('button',{name:'Give app feedback'});
      const hasFeedback=!['/login','/register'].includes(path);
      if(hasFeedback) {
        await feedbackTrigger.click();
        await page.getByRole('dialog',{name:'App feedback'}).waitFor();
      }
      if (path === '/settings') {
        await page.getByRole('radio',{name:'4 of 5'}).check();
        await page.getByLabel('Your feedback').fill('Fixture testing feedback');
        await page.getByRole('checkbox',{name:'I agree to send this rating and message to the app team.'}).check();
        await page.getByRole('button',{name:'Submit feedback'}).click();
        await page.getByRole('alert').filter({hasText:'Feedback was not confirmed'}).waitFor();
        assert.equal(await page.getByLabel('Your feedback').inputValue(),'Fixture testing feedback');
        await page.getByRole('button',{name:'Submit feedback'}).click();
        await page.getByRole('status').filter({hasText:'Feedback saved'}).waitFor();
        assert.deepEqual(feedbackPayloads[0],feedbackPayloads[1],'feedback retry preserves idempotency key');
        assert.deepEqual(Object.keys(feedbackPayloads[0]).sort(),['consent','message','rating','request_id'],'no financial context attached');
      }
      if (path === '/opportunities') {
        await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Find opportunities'}).click();
        await page.getByText('Source-linked results',{exact:true}).waitFor();
        await feedbackTrigger.click();
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`response overflow ${theme} ${width} ${path}`);
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const accessibility=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
      if(accessibility.length)violations.push({theme,width,path,accessibility});
      if(hasFeedback) {
        await page.keyboard.press('Escape');
        await page.getByRole('dialog',{name:'App feedback'}).waitFor({state:'hidden'});
        assert(await feedbackTrigger.evaluate(el=>document.activeElement===el),'feedback focus restored');
      }
      results.push({theme,width,path,title,overflow:false});
      const dialogs = {
        '/': ['Add account'], '/bills-budget': ['Add bill','Add goal','Log contribution'],
        '/yearly-plan': ['Add income source'], '/opportunities': [],
        '/properties': ['Add property'],
      };
      for (const button of dialogs[path] || []) {
        if(path==='/') await page.getByRole('button',{name:/Accounts/}).click();
        if(path==='/bills-budget' && ['Add goal','Log contribution'].includes(button)) await page.getByRole('tab',{name:'Goals',exact:true}).click();
        await page.getByRole('button',{name:button,exact:true}).click();
        const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForTimeout(250);
        if(button==='Add goal') {
          const target=await dialog.getByLabel('Target amount').boundingBox();
          const starting=await dialog.getByLabel('Starting savings').boundingBox();
          if(width<640)assert(starting.y>target.y+target.height,'goal inputs stack on mobile');
          else assert(Math.abs(starting.y-target.y)<2,'goal inputs share desktop row');
          const save=dialog.getByRole('button',{name:'Add goal',exact:true});await save.scrollIntoViewIfNeeded();
          assert((await save.boundingBox()).height>=44,'goal save touch target');
          assert((await dialog.getByRole('button',{name:'Cancel',exact:true}).boundingBox()).height>=44,'goal cancel touch target');
          if(width===320 && theme==='light')await page.screenshot({animations:'disabled',path:'/tmp/avera-final-goal-layout.png'});
        }
        const rect=await dialog.boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width,`dialog overflow ${width} ${button}`);
        const dialogAxe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
        if(dialogAxe.length)violations.push({theme,width,path,dialog:button,accessibility:dialogAxe});
        if(path==='/properties') {
          assert(await page.getByLabel('Type',{exact:true}).count()===1,'property type has accessible label');
          await page.screenshot({animations:'disabled',path:`/tmp/avera-property-${theme}-${width}.png`});
        }
        await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
      }
      if (path === '/opportunities') {
        await page.keyboard.press('Escape');
        await page.route('**/api/**',route=>new URL(route.request().url()).pathname.includes('/functions/searchJobOpportunities') ? route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture unavailable"}'}) : route.fallback());
        await page.getByRole('button',{name:'Find opportunities'}).click();
        await page.getByText('Demonstration listings',{exact:true}).waitFor();
        const a=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
        if(a.length)violations.push({theme,width,path,state:'opportunity unavailable',accessibility:a});
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'unavailable result overflow');
      }
      if (path === '/') {
        const launcher=page.getByRole('button',{name:'Ask Avera',exact:true});
        await launcher.click();
        const drawer=page.getByRole('dialog');await drawer.waitFor();await page.waitForTimeout(250);
        await drawer.getByLabel('Ask Avera',{exact:true}).fill('How much can I save?');
        await drawer.getByRole('button',{name:'Send question'}).click();await drawer.getByText(/Browser fixture only/).waitFor();
        const bounds=await drawer.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width,`AI drawer bounds ${width}`);
        const transcript=drawer.getByRole('log');assert(await transcript.evaluate(el=>el.clientHeight>40),'AI transcript remains visible');
        const a=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
        if(a.length)violations.push({theme,width,path,dialog:'Ask Avera',accessibility:a});
        await page.screenshot({animations:'disabled',path:`/tmp/avera-ask-${theme}-${width}.png`});
        await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
        await page.waitForTimeout(50);assert(await launcher.evaluate(el=>document.activeElement===el),'Ask Avera focus returns to launcher');
      }
      if (path === '/bills-budget') {
        await page.getByRole('tab',{name:'Budget',exact:true}).click();
        for (const button of ['Add budget category','Log spending']) {
          if(path==='/') await page.getByRole('button',{name:/Accounts/}).click();
        if(path==='/bills-budget' && ['Add goal','Log contribution'].includes(button)) await page.getByRole('tab',{name:'Goals',exact:true}).click();
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
