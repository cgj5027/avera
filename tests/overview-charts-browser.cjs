// Built frontend with authenticated API fixtures; no hosted financial/model calls.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const results = [];
  for (const theme of ['light', 'dark']) for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let scenario = 'planned';
    await page.addInitScript(theme => {
      localStorage.setItem('base44_access_token', 'fixture'); localStorage.setItem('theme', theme);
      sessionStorage.setItem('avera_data_mode:overview-user', 'sandbox');
    }, theme);
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path.includes('public-settings')) body = { id: 'fixture', public_settings: {} };
      else if (path.endsWith('/User/me')) body = { id: 'overview-user', email: 'fixture@example.test', role: 'user' };
      else if (path.endsWith('/v2/list')) {
        const name = path.split('/entities/')[1].split('/')[0];
        const planned = {
          Account: [{ id: 'cash', name: 'Checking', type: 'checking', balance: 1000 }],
          IncomeSource: [{ id: 'income', name: 'Salary', amount: scenario === 'shortfall' ? 1000 : 3000, frequency: 'monthly', active: true }],
          Bill: [{ id: 'bill', name: 'Rent', amount: 600, frequency: 'monthly', next_due_date: '2026-11-01' }],
          BudgetCategory: [{ id: 'budget', name: 'Groceries', monthly_limit: 300 }],
          Property: [{ id: 'home', nickname: 'Home', estimated_value: 100000, taxes_monthly: 100 }],
          MortgageRecord: [{ id: 'mortgage', property_id: 'home', monthly_payment: 500, outstanding_balance: 50000 }],
          Transaction: ['2026-08-01', '2026-09-01'].flatMap((date, i) => [
            { id: `income-${i}`, type: 'income', amount: 1800, date, plaid_item_id: 'fixture-item', plaid_transaction_id: `income-${i}` },
            { id: `expense-${i}`, type: 'expense', amount: 900, date, plaid_item_id: 'fixture-item', plaid_transaction_id: `expense-${i}` },
          ]),
        };
        const records = scenario === 'empty' ? [] : scenario === 'estimated' ? (name === 'Transaction' ? planned.Transaction : []) : planned[name] || [];
        body = { items: records.map(row => ({ ...row, created_by_id: 'overview-user', demo_profile: null })), has_more: false };
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    async function check(state) {
      await page.waitForTimeout(250);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow ${theme} ${width} ${state}`);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, message: n.failureSummary })) })));
      assert.deepEqual(violations, [], `accessibility ${theme} ${width} ${state}`);
      results.push({ theme, width, state });
    }
    for (scenario of ['planned', 'shortfall', 'estimated', 'empty']) {
      await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173') + '/');
      const pie = page.getByRole('region', { name: 'Monthly income allocation' });
      await pie.waitFor();
      if (scenario === 'empty') {
        assert(await pie.getByText('—', { exact: true }).isVisible());
        assert(await pie.getByText(/Add an active income source/).isVisible());
        await check(scenario);
        continue;
      }
      const outlook = page.getByRole('region', { name: 'Income and spending outlook' });
      await outlook.locator('.recharts-bar-rectangle').first().waitFor();
      assert.equal(await outlook.locator('.recharts-bar-rectangle').count(), 8, 'two bars for each of four months');
      assert((await pie.locator('.recharts-pie-sector').count()) > 0, 'actual pie sectors rendered');
      const pieRect = await pie.boundingBox(), barRect = await outlook.boundingBox();
      if (width >= 1024) {
        assert(Math.abs(pieRect.y - barRect.y) < 1, 'charts inline in row four');
        assert(Math.abs(barRect.width - 2 * pieRect.width - 16) < 2, 'one-third/two-thirds columns');
      } else assert(barRect.y >= pieRect.y + pieRect.height, 'mobile/tablet cards stack');
      const ticks = await outlook.locator('.recharts-xAxis .recharts-cartesian-axis-tick').evaluateAll(elements => elements.map(el => el.getBoundingClientRect()));
      assert.equal(ticks.length, 4, 'all four month labels displayed');
      assert(ticks.every(tick => Math.abs(tick.y - ticks[0].y) < 2), 'four months fit inline');
      const expectedIncome = scenario === 'planned' ? '$3,000.00' : scenario === 'shortfall' ? '$1,000.00' : '$1,800.00';
      assert(await pie.getByText(expectedIncome, { exact: true }).isVisible());
      if (scenario === 'planned') {
        assert(await pie.getByText('50% of income', { exact: true }).isVisible());
        assert(await pie.getByText('Mortgage & property', { exact: true }).isVisible());
        const hint = outlook.getByRole('button', { name: 'About the income and spending outlook' });
        await hint.focus();
        await page.getByRole('tooltip').waitFor();
        assert((await page.getByRole('tooltip').innerText()).includes('current month and next three months'));
        await page.keyboard.press('Escape');
        await page.getByRole('tooltip').waitFor({ state: 'hidden' });
      }
      if (scenario === 'shortfall') assert(await pie.getByText(/\$500.00 projected monthly shortfall/).isVisible());
      if (scenario === 'estimated') assert(await pie.getByText('Estimated spending', { exact: true }).isVisible());
      await check(scenario);
      const values = outlook.locator('summary').filter({ hasText: 'View monthly values' });
      await values.focus(); await values.press('Enter');
      assert(await outlook.getByRole('table').isVisible(), 'keyboard-accessible data table');
      assert.equal(await outlook.getByRole('row').count(), 5);
      await check(`${scenario} table`);
      if (scenario === 'planned') await page.screenshot({ path: `/tmp/avera-overview-charts-${theme}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
    assert.deepEqual(errors, [], 'no runtime errors');
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({ checks: results.length, violations: [], results }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
