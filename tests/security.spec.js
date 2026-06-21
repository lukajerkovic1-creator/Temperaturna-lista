const { test, expect } = require('@playwright/test');
const {
  expectBrowserStorageNotToContain,
  fillCorePatient,
  openAppWithoutFirebase,
} = require('./support/quality-helpers');

test.describe('Security smoke tests', () => {
  test('escapes clinical text input and does not execute injected markup', async ({ page }) => {
    await page.addInitScript(() => {
      window.__xssProbe = 0;
    });
    const browserSignals = await openAppWithoutFirebase(page);

    const xssPayload = '\"><img src=x onerror="window.__xssProbe=1"><script>window.__xssProbe=2</script>';
    await page.locator('#fullName').fill(`Sigurnost Testic ${xssPayload}`);
    await page.locator('#diagnosis').fill(`Dijagnoza ${xssPayload}`);
    await page.locator('#therapy').fill(`Terapija ${xssPayload}`);
    await page.locator('#allergies').fill(`Alergija ${xssPayload}`);
    await page.waitForTimeout(300);

    await expect(page.locator('#fullName')).toHaveValue(/Sigurnost Testic/);
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await expect(page.locator('script:not([src])')).toHaveCount(0);
    await expect(page.evaluate(() => window.__xssProbe)).resolves.toBe(0);

    browserSignals.assertCleanBrowserSignals();
  });

  test('does not leave cleartext patient identifiers in browser storage by default', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    await fillCorePatient(page, {
      fullName: 'Security Storage Testic',
      birthYear: '1981',
      admissionDate: '21.06.2026.',
      diagnosis: 'Dijagnoza za sigurnosni storage test.',
      therapy: 'Amlodipin 5 mg 1,0,0 tbl',
      allergies: 'Penicilin storage test',
    });
    await page.waitForTimeout(500);

    await expectBrowserStorageNotToContain(page, [
      'Security Storage Testic',
      'Dijagnoza za sigurnosni storage test',
      'Amlodipin 5 mg',
      'Penicilin storage test',
      '21.06.2026',
    ]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('keeps dangerous URL schemes out of generated links and actions', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    await fillCorePatient(page, {
      fullName: 'Link Safety Testic',
      diagnosis: 'javascript:alert(1)',
      therapy: 'data:text/html,<script>alert(1)</script>',
      allergies: 'vbscript:msgbox(1)',
    });

    const unsafeLinks = await page.locator('a[href^="javascript:"], a[href^="data:"], a[href^="vbscript:"]').count();
    expect(unsafeLinks).toBe(0);

    browserSignals.assertCleanBrowserSignals();
  });
});
