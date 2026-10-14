import { chromium } from 'playwright';
import path from 'node:path';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1600, height: 1180 }, deviceScaleFactor: 2 })).newPage();
await p.goto('file://' + path.resolve('mockup.html'));
await p.waitForLoadState('networkidle'); await p.waitForTimeout(300);
await p.screenshot({ path: 'mane-meals-mockup.png' });
await b.close();
