const { test, expect } = require('@playwright/test');
const {
  FIREBASE_LOGIN_GATE_SESSION_KEY,
  expectBrowserStorageNotToContain,
  fillCorePatient,
  getReadableBrowserStorageText,
  openAppWithoutFirebase,
} = require('./support/quality-helpers');

const LEGACY_PATIENT_DRAFT_STORAGE_KEY = 'temperaturna_lista_pacijent_autosave_v1';

test.describe('Privacy regression tests', () => {
  test('legacy cleartext patient draft is not restored automatically', async ({ page }) => {
    await page.addInitScript(({ legacyKey, gateKey }) => {
      sessionStorage.setItem(gateKey, 'true');
      localStorage.setItem(legacyKey, JSON.stringify({
        fullName: 'Legacy Privacy Testic',
        birthYear: '1966',
        diagnosis: 'Legacy cleartext dijagnoza.',
        therapy: 'Legacy cleartext terapija.',
      }));
    }, {
      legacyKey: LEGACY_PATIENT_DRAFT_STORAGE_KEY,
      gateKey: FIREBASE_LOGIN_GATE_SESSION_KEY,
    });

    const browserSignals = await openAppWithoutFirebase(page);

    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#diagnosis')).toHaveValue('');
    await expect(page.locator('#therapy')).toHaveValue('');
    await expect(page.locator('body')).toContainText(/lokalni draft|nekriptirani draft/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('patient data entry does not persist clinical cleartext locally', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    await fillCorePatient(page, {
      fullName: 'Privacy Regression Testic',
      birthYear: '1988',
      admissionDate: '22.06.2026.',
      diagnosis: 'Privacy regression pneumonija.',
      therapy: 'ceftriakson 2 g i.v.',
      allergies: 'azitromicin',
    });
    await page.waitForTimeout(500);

    await expectBrowserStorageNotToContain(page, [
      'Privacy Regression Testic',
      'Privacy regression pneumonija',
      'ceftriakson 2 g',
      'azitromicin',
      '22.06.2026',
    ]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('parser test capture stores sanitized text instead of obvious identifiers', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    await page.locator('#ohbpPasteBox').fill([
      'Pacijent: Ivan Horvat, 1974.',
      'OIB: 12345678901',
      'E-mail: ivan.horvat@example.com',
      'Telefon: 091 234 5678',
      'Dg: Pneumonija.',
      'Terapija: ceftriakson 2 g i.v.',
    ].join('\n'));
    await page.locator('#fullName').fill('Ivan Horvat');
    await page.locator('#birthYear').fill('1974');
    await page.locator('#diagnosis').fill('Pneumonija.');
    await page.locator('#therapy').fill('ceftriakson 2 g i.v.');

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      if (dialog.type() === 'confirm') {
        expect(dialog.message()).toMatch(/anonimizirane podatke|stvarni pacijentni podaci/i);
        await dialog.accept();
        return;
      }
      if (dialog.type() === 'prompt') {
        await dialog.accept('Test parser privacy sanitizacije.');
        return;
      }
      await dialog.dismiss();
    });
    await page.keyboard.press('Control+Alt+P');

    await expect.poll(async () => page.evaluate(() => {
      const cases = window.TemperaturnaListaParserTests?.exportLocal?.() || [];
      return cases.length;
    })).toBeGreaterThan(0);

    const capturedCase = await page.evaluate(() => window.TemperaturnaListaParserTests.exportLocal()[0]);
    expect(dialogs.map((dialog) => dialog.type)).toEqual(['confirm', 'prompt']);
    expect(capturedCase.privacyStatus).toMatch(/anonymized|synthetic/);
    expect(JSON.stringify(capturedCase)).not.toContain('Ivan Horvat');
    expect(JSON.stringify(capturedCase)).not.toContain('12345678901');
    expect(JSON.stringify(capturedCase)).not.toContain('ivan.horvat@example.com');
    expect(JSON.stringify(capturedCase)).not.toContain('091 234 5678');

    const storageText = await getReadableBrowserStorageText(page);
    for (const forbidden of ['Ivan Horvat', '12345678901', 'ivan.horvat@example.com', '091 234 5678']) {
      expect(storageText, `Parser test storage must not contain ${forbidden}`).not.toContain(forbidden);
    }

    browserSignals.assertCleanBrowserSignals();
  });
});
