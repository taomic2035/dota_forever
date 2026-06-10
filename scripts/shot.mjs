/**
 * 截图/冒烟脚本:node scripts/shot.mjs <url> <outfile> [waitMs] [evalExpr]
 * 等待 window.__game 就绪后截图;可选执行表达式并打印结果(自动化断言用)。
 */
import { chromium } from 'playwright';

const [url = 'http://localhost:5180/', out = 'docs/screenshots/shot.png', waitMs = '1500', evalExpr = ''] = process.argv.slice(2);

const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => (window).__game !== undefined, { timeout: 15000 });
await page.waitForTimeout(Number(waitMs));

if (evalExpr) {
  const result = await page.evaluate(evalExpr);
  console.log('EVAL:', JSON.stringify(result));
}
await page.screenshot({ path: out });
console.log('SHOT:', out);
if (errors.length) {
  console.log('PAGE_ERRORS:', errors.slice(0, 5).join(' | '));
  process.exit(2);
}
await browser.close();
