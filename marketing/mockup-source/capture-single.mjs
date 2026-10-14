import { chromium } from 'playwright';
// One phone screen with the logo header: the home page, top of the page.
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 390, height: 787 }, deviceScaleFactor: 3, serviceWorkers: 'block' })).newPage();
await p.goto('http://localhost:4174/');
await p.evaluate(() => document.activeElement?.blur());
await p.mouse.move(0, 0);
await p.waitForTimeout(300);
await p.screenshot({ path: 's0-home.png' });
await b.close();
