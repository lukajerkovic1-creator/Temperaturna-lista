const { test, expect } = require('@playwright/test');
const { fillCorePatient, openAppWithoutFirebase } = require('./support/quality-helpers');

test.describe('Performance smoke tests', () => {
  test('local app reaches first meaningful screen within budget', async ({ page }) => {
    const startedAt = Date.now();
    const browserSignals = await openAppWithoutFirebase(page);
    const wallClockMs = Date.now() - startedAt;

    const timing = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.startTime) : null,
        loadEventMs: navigation ? Math.round(navigation.loadEventEnd - navigation.startTime) : null,
      };
    });

    expect(wallClockMs, `Wall clock load ${wallClockMs}ms`).toBeLessThan(12_000);
    if (timing.domContentLoadedMs !== null) {
      expect(timing.domContentLoadedMs, JSON.stringify(timing)).toBeLessThan(8_000);
    }

    browserSignals.assertCleanBrowserSignals();
  });

  test('core patient input remains responsive enough for clinical workflow', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    const durationMs = await page.evaluate(async () => {
      const setValue = (selector, value) => {
        const field = document.querySelector(selector);
        if (!field) throw new Error(`Missing field: ${selector}`);
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const start = performance.now();
      setValue('#fullName', 'Performance Testic');
      setValue('#birthYear', '1975');
      setValue('#admissionDate', '21.06.2026.');
      setValue('#diagnosis', 'Performance smoke pneumonija.');
      setValue('#therapy', Array.from({ length: 25 }, (_, index) => `Terapija ${index + 1} 1,0,0 tbl`).join('\n'));
      setValue('#allergies', 'nema');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return Math.round(performance.now() - start);
    });

    expect(durationMs, `Core input update took ${durationMs}ms`).toBeLessThan(1_500);
    await expect(page.locator('#patientSyncStatus')).toContainText(/nespremljene promjene/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('preview rendering after large therapy input stays under smoke budget', async ({ page }) => {
    const browserSignals = await openAppWithoutFirebase(page);

    const startedAt = Date.now();
    await fillCorePatient(page, {
      fullName: 'Preview Performance Testic',
      diagnosis: 'Performance preview dijagnoza.',
      therapy: Array.from({ length: 40 }, (_, index) => `Lijek ${index + 1} 1,0,0 tbl`).join('\n'),
    });
    await expect(page.locator('#page1Title')).toBeVisible();
    await expect(page.locator('#patientSyncStatus')).toContainText(/nespremljene promjene/i);
    const durationMs = Date.now() - startedAt;

    expect(durationMs, `Large preview update took ${durationMs}ms`).toBeLessThan(5_000);

    browserSignals.assertCleanBrowserSignals();
  });
});
