// Actual UI with intercepted API fixtures; no cloud/model calls.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const results = [];
  const cases = [320, 390, 768, 1440].map(width => ({ width, height: 900, mode: 'sandbox' }));
  cases.push({ width: 390, height: 520, mode: 'sandbox' }, { width: 320, height: 700, mode: 'demo' }, { width: 1440, height: 600, mode: 'demo' });
  for (const theme of ['light', 'dark']) for (const size of cases) {
    const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(({ theme, mode }) => {
      localStorage.setItem('base44_access_token', 'fixture');
      localStorage.setItem('theme', theme);
      sessionStorage.setItem('avera_data_mode:chat-user', mode);
      if (mode === 'demo') localStorage.setItem('avera_demo_workspace:chat-user', JSON.stringify({ profile: 'multi_income' }));
    }, { theme, mode: size.mode });
    await page.route('https://**/*', route => route.abort());
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body = {};
      if (path.includes('public-settings')) body = { id: 'fixture', public_settings: {} };
      else if (path.endsWith('/User/me')) body = { id: 'chat-user', email: 'fixture@example.test', role: 'user' };
      else if (path.includes('/functions/askAvera')) {
        await new Promise(resolve => setTimeout(resolve, 350));
        body = { answer: '**Fixture answer only.**\n\n- Review your saved bills.\n- Confirm your recorded income.\n\n1. Open Bills & Budget.\n2. Review amounts.\n\n' + 'A paragraph about sample financial records.\n\n'.repeat(45) + 'longword'.repeat(35) };
      } else if (path.endsWith('/v2/list')) body = { items: [], has_more: false };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    async function check(scope, state) {
      const form = scope.getByRole('form', { name: 'Send a message to Ask Avera' });
      const rect = await form.boundingBox();
      const bottomNav = page.locator('nav[aria-label="Primary"].fixed');
      const nav = await bottomNav.isVisible() ? await bottomNav.boundingBox() : null;
      const availableBottom = scope === page && nav ? nav.y : size.height;
      if (rect.y < 0 || rect.y + rect.height > availableBottom + 1) {
        await page.screenshot({ path: '/tmp/avera-chat-layout-failure.png' });
        console.error({ rect, availableBottom, containers: await page.locator('#main-content, #main-content > div, header').evaluateAll(elements => elements.map(el => ({ classes: el.className, top: el.getBoundingClientRect().top, height: el.getBoundingClientRect().height }))) });
      }
      assert(rect.y >= 0 && rect.y + rect.height <= availableBottom + 1, `composer visible ${theme} ${JSON.stringify(size)} ${state}`);
      assert(rect.y + rect.height / 2 > size.height / 2, `composer in lower half ${state}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `page overflow ${state}`);
      assert(await scope.getByLabel('Ask Avera', { exact: true }).isVisible());
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
      assert.deepEqual(violations, [], `accessibility ${state}`);
      results.push({ theme, ...size, state });
      return rect;
    }
    async function exercise(scope, prefix) {
      await scope.getByText('Try a question', { exact: true }).waitFor();
      const before = await check(scope, `${prefix} ready`);
      const input = scope.getByLabel('Ask Avera', { exact: true });
      await input.fill('First line');
      await input.press('Shift+Enter');
      await input.press('a');
      assert.equal(await input.inputValue(), 'First line\na');
      await input.press('Enter');
      await scope.getByText('Waiting for an answer…', { exact: true }).waitFor();
      const pending = await scope.getByRole('form').boundingBox();
      assert(Math.abs(pending.y - before.y) < 2, `${prefix} pending composer stays anchored`);
      await scope.getByText('Fixture answer only.', { exact: true }).waitFor();
      const after = await check(scope, `${prefix} long answer`);
      assert(Math.abs(after.y - before.y) < 2, `${prefix} answer composer stays anchored`);
      const log = scope.getByRole('log');
      assert(await log.evaluate(el => el.scrollHeight > el.clientHeight), `${prefix} messages scroll independently`);
      assert(await log.evaluate(el => el.scrollTop > 0), `${prefix} latest reply visible`);
      await log.evaluate(el => { el.scrollTop = 0; });
      await check(scope, `${prefix} earlier messages`);
    }
    const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
    await page.goto(base + '/ask-avera');
    await page.getByRole('heading', { name: 'Ask Avera', exact: true }).waitFor();
    if (size.mode === 'demo') {
      const disclosure = page.locator('summary').filter({ hasText: 'Demo Mode' });
      await disclosure.click();
      assert(await page.getByRole('button', { name: 'Reset demo profile', exact: true }).isVisible(), 'demo controls retained');
      await disclosure.click();
      assert(!(await page.getByRole('button', { name: 'Reset demo profile', exact: true }).isVisible()), 'compact demo bar leaves room for chat');
    }
    await exercise(page, 'page');
    if (size.width === 1440) {
      const chat = await page.getByRole('log').boundingBox();
      assert(chat.width > 900, 'desktop page wider than previous 768px shell');
    }
    await page.screenshot({ path: `/tmp/avera-chat-page-${theme}-${size.width}-${size.height}-${size.mode}.png`, animations: 'disabled' });
    await page.goto(base + '/');
    const launcher = page.getByRole('button', { name: 'Ask Avera', exact: true });
    await launcher.click();
    const drawer = page.getByRole('dialog');
    await drawer.waitFor();
    await page.waitForTimeout(550);
    if (size.width >= 768) assert((await drawer.boundingBox()).width >= 670, 'drawer widened to 672px');
    await exercise(drawer, 'drawer');
    await page.screenshot({ path: `/tmp/avera-chat-drawer-${theme}-${size.width}-${size.height}-${size.mode}.png`, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await drawer.waitFor({ state: 'hidden' });
    await page.waitForTimeout(100);
    assert(await launcher.evaluate(el => el === document.activeElement), 'drawer restores launcher focus');
    assert.deepEqual(errors, [], 'no runtime errors');
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify({ checks: results.length, violations: [], results }, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
