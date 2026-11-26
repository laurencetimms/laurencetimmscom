// Regenerates public/images/laurence-timms-og.jpg from card.html.
// Run from the repo root:  node docs/og-card/render.cjs
// Needs (not project dependencies): npm i --no-save @fontsource/libre-franklin playwright
// and ImageMagick's `convert` (the PNG is written first if you'd rather convert it yourself).
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const here = path.resolve('docs/og-card');
  const png = path.join(here, 'card.png');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.join(here, 'card.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check('200 20px LF') && document.fonts.check('700 20px LF'));
  if (!ok) throw new Error('Libre Franklin did not load: run npm i --no-save @fontsource/libre-franklin');
  await page.screenshot({ path: png });
  await browser.close();
  execFileSync('convert', [png, '-quality', '88', '-interlace', 'Plane', 'public/images/laurence-timms-og.jpg']);
  console.log('wrote public/images/laurence-timms-og.jpg');
})();
