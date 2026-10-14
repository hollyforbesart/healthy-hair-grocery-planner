import { chromium } from 'playwright';
// One phone screen that shows the planner working, with the logo header on top.
// For this image only, the step's intro, search, filters and "Foods to leave out"
// are hidden so the meal cards sit right under the header and step tracker.
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 390, height: 787 }, deviceScaleFactor: 3, serviceWorkers: 'block' })).newPage();
await p.goto('http://localhost:4174/');
await p.getByRole('button', { name: /Start with what I have/ }).click();
for (const n of ['Chicken breast', 'Eggs', 'Spinach', 'Rice', 'Greek yogurt', 'Bell peppers', 'Avocado', 'Rolled oats']) {
  const btn = p.getByRole('button', { name: `+ ${n}`, exact: true });
  if (await btn.count()) await btn.first().click();
}
await p.locator('.step-footer .btn--primary').click();
await p.waitForTimeout(400);
await p.locator('.meal-section').first().locator('.meal-card').first().getByRole('button', { name: 'Add to my plan' }).click();
await p.locator('.meal-section').nth(2).locator('.meal-card').first().getByRole('button', { name: 'Add to my plan' }).click();
await p.addStyleTag({ content: `
  .site-header__actions, .step-header, .path-switch, .notice, .meal-search, .filter-bar, .avoid-panel,
  section > p.small.muted[aria-live] { display: none !important; }
  .meal-section__title { margin-top: 0 !important; }
` });
await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
await p.mouse.move(0, 0);
await p.waitForTimeout(400);
await p.screenshot({ path: 's0-home.png' });
console.log(await p.locator('.meal-card h3').first().innerText(), '|', await p.locator('.review-bar').innerText().catch(() => 'no bar'));
await b.close();
