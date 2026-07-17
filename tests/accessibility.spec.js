const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');
const {
  closeFirebaseGateIfVisible,
  fillCorePatient,
  openApp,
  openAppWithoutFirebase,
} = require('./support/quality-helpers');

test.describe('Accessibility smoke tests', () => {
  test('startup gate and main form have no serious axe violations', async ({ page }) => {
    const browserSignals = await openApp(page);

    const gateResults = await new AxeBuilder({ page })
      .include('#firebaseLoginGate')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(gateResults.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact))).toEqual([]);

    await closeFirebaseGateIfVisible(page);
    const formResults = await new AxeBuilder({ page })
      .include('body')
      .exclude('#adminModal')
      .exclude('#firebasePatientDialog')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(formResults.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact))).toEqual([]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('keyboard can reach chronic therapy and visible focus stays inside controls', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    await page.locator('#fullName').focus();
    const focusedIds = [];
    for (let index = 0; index < 36; index += 1) {
      const focusedId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent || '');
      focusedIds.push(String(focusedId).trim());
      if (focusedIds.includes('therapy')) break;
      await page.keyboard.press('Tab');
    }

    expect(focusedIds).toContain('therapy');
    await expect(page.locator('#therapy')).toBeFocused();

    browserSignals.assertCleanBrowserSignals();
  });

  test('mobile viewport does not create horizontal overflow in primary workflow', async ({ page }, testInfo) => {
    test.skip(!/mobile/i.test(testInfo.project.name), 'Mobile overflow is checked in the mobile project.');

    const browserSignals = await openAppWithoutFirebase(page);
    await fillCorePatient(page, {
      fullName: 'Mobile Accessibility Testic',
      diagnosis: 'Mobilna provjera prikaza.',
      therapy: Array.from({ length: 12 }, (_, index) => `Terapija ${index + 1}`).join('\n'),
    });

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    }));
    expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 2);
    expect(overflow.bodyScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.bodyClientWidth + 2);

    browserSignals.assertCleanBrowserSignals();
  });
});
