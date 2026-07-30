const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'evidence');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8800/';

const syntheticOhbpText = [
  'Nalaz hitne',
  'TESTIĆ DOKAZ, rođen 10.10.1970, TESTNA 1, 47000 TESTGRAD',
  'Datum nalaza: 16.07.2026.',
  'Dijagnoza: Sintetska pneumonija.',
  'Lijekovi: Sintetikin 500 mg 1,0,0 tbl p.o.',
  'Alergije na lijekove: nema.',
  'Th: Testcef 2 g i.v.',
  'RR 130/80 mmHg, Puls 82/min, SpO2 98%.'
].join('\n');

async function capture(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#ohbpPasteBox').fill(syntheticOhbpText);
  await page.locator('#fullName').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#fullName')?.value.includes('Dokaz'));
  const panel = page.locator('#parserProvenancePanel');
  await panel.scrollIntoViewIfNeeded();
  await panel.screenshot({ path: path.join(outputDir, `parser-provenance-${name}.png`) });
  await context.close();
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    await capture(browser, 'desktop', { width: 1440, height: 1000 });
    await capture(browser, 'mobile', { width: 390, height: 844 });
  } finally {
    await browser.close();
  }
  console.log(`Parser provenance evidence written to ${path.relative(root, outputDir)}.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
