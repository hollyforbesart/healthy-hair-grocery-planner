import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 787 }, deviceScaleFactor: 3, serviceWorkers: 'block' });
const p = await ctx.newPage();
await p.goto('http://localhost:4174/');
await p.getByRole('button', { name: /Start with what I have/ }).click();
for (const n of ['Chicken breast', 'Eggs', 'Spinach', 'Rice', 'Greek yogurt', 'Bell peppers', 'Avocado', 'Black beans', 'Rolled oats', 'Olive oil']) {
  const btn = p.getByRole('button', { name: `+ ${n}`, exact: true });
  if (await btn.count()) await btn.first().click();
  else { await p.getByRole('combobox').fill(n); await p.keyboard.press('Enter'); }
}
await p.getByRole('button', { name: 'Staple: Olive oil' }).click();
await p.getByRole('button', { name: 'Staple: Eggs' }).click();
await p.evaluate(() => document.activeElement?.blur());
await p.locator('.kitchen-status').evaluate((e) => (e.textContent = ''));
const h1 = await p.locator('.step-header').evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
await p.evaluate((y) => window.scrollTo(0, y - 16), h1);
await p.waitForTimeout(300);
await p.mouse.move(0, 0); await p.waitForTimeout(200); await p.screenshot({ path: 's1-kitchen.png' });
await p.locator('.step-footer .btn--primary').click();
await p.waitForTimeout(500);
// pick two meals with good matches
const cards = p.locator('.meal-section').first().locator('.meal-card');
await cards.nth(0).getByRole('button', { name: 'Add to my plan' }).click();
for (const name of ['Chicken Fajita Bowls', 'Lemon Garlic Salmon + Quinoa + Asparagus']) {
  await p.getByLabel('Search meals or ingredients').fill(name);
  await p.locator('.meal-card', { has: p.getByRole('heading', { name, exact: true }) }).first().getByRole('button', { name: 'Add to my plan' }).click();
}
await p.getByLabel('Search meals or ingredients').fill('');
const top = await p.locator('.meal-section').first().evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
await p.evaluate((y) => window.scrollTo(0, y - 44), top);
await p.waitForTimeout(600);
await p.mouse.move(0, 0); await p.waitForTimeout(200); await p.screenshot({ path: 's2-meals.png' });
console.log('meals:', (await p.locator('.meal-card.is-selected h3').allInnerTexts()).join(' | '));
await p.locator('.review-bar button').click();
await p.waitForTimeout(300);
await p.locator('.step-footer .btn--primary').click();
await p.waitForTimeout(500);
for (const n of ['Coffee', 'Sparkling water']) { await p.locator('#new-item').fill(n); await p.getByRole('button', { name: 'Add to list' }).click(); }
await p.locator('.add-status').evaluate((e) => (e.textContent = ''));
await p.evaluate(() => document.activeElement?.blur());
const t3 = await p.locator('.plan-reminder').evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
await p.evaluate((y) => window.scrollTo(0, y - 16), t3);
await p.waitForTimeout(300);
await p.mouse.move(0, 0); await p.screenshot({ path: 's3-list.png' });
console.log('list items:', await p.locator('.grocery-group li').count());
await b.close();
