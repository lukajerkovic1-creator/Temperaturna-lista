const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'docs', 'evidence');
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8802/';

function buildEvidenceUrl() {
  const url = new URL(baseUrl);
  url.searchParams.set('qa', 'print-evidence');
  url.searchParams.set('firebaseSmoke', '1');
  return url.href;
}

async function fillSyntheticRecord(page) {
  const values = {
    printOperatorName: 'TESTNI OPERATER DOKAZ',
    fullName: 'TESTIC ISPIS',
    birthYear: '1970',
    patientIdentifier: 'TEST-MBO-EVIDENCE-001',
    encounterId: 'TEST-ENC-EVIDENCE-001',
    patientRoom: '12',
    patientBed: '3',
    admissionDate: '17.07.2026.',
    diagnosis: 'Sintetska pneumonija.',
    allergies: 'nema',
    therapy: 'Testcef 2 g i.v.'
  };
  for (const [id, value] of Object.entries(values)) {
    await page.locator(`#${id}`).fill(value);
  }
  await page.locator('#confirmIdentityEncounter').check();
  await page.locator('#confirmAllergyStatus').check();
  await page.locator('#confirmCriticalFields').check();
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__TEMPERATURNA_LISTA_ENABLE_QA_HOOKS__ = true;
      window.__TEMPERATURNA_LISTA_SKIP_PRINT_DIALOG__ = true;
    });
    await page.goto(buildEvidenceUrl(), { waitUntil: 'domcontentloaded' });
    await page.locator('#printOperatorName').waitFor({ state: 'visible' });
    await fillSyntheticRecord(page);
    await page.locator('#printBtn').click();

    const confirmDialog = page.locator('#printConfirmDialog');
    if (await confirmDialog.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false)) {
      await confirmDialog.locator('[data-print-confirm-action="proceed"]').click();
    }

    const printFrame = page.locator('#print-frame');
    try {
      await printFrame.waitFor({ state: 'attached', timeout: 10000 });
    } catch (error) {
      const status = await page.locator('#status').textContent().catch(() => 'status unavailable');
      const dialogText = await confirmDialog.textContent().catch(() => 'dialog unavailable');
      throw new Error(`Print evidence did not reach the print frame. Status: ${status}. Dialog: ${dialogText}.`);
    }
    await page.waitForFunction(() => {
      const frame = document.querySelector('#print-frame');
      return Boolean(frame?.contentDocument?.querySelector('.page img'));
    });

    const printHtml = await printFrame.evaluate((frame) => frame.contentDocument.documentElement.outerHTML);
    const metadataCount = await printFrame.evaluate((frame) => frame.contentDocument.querySelectorAll('.print-page-meta').length);
    if (metadataCount !== 0) {
      throw new Error(`Printed pages unexpectedly contain ${metadataCount} technical metadata rows.`);
    }

    const printPage = await context.newPage();
    await printPage.setContent(printHtml, { waitUntil: 'load' });
    await printPage.waitForFunction(() => Array.from(document.images).every((image) => image.complete));
    await printPage.pdf({
      path: path.join(outputDir, 'aud-p0-014-synthetic-print.pdf'),
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 }
    });
    await printPage.locator('.page').first().screenshot({
      path: path.join(outputDir, 'aud-p0-014-synthetic-print-page.png')
    });
    await context.close();
  } finally {
    await browser.close();
  }
  console.log('Synthetic print evidence written to docs/evidence.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
