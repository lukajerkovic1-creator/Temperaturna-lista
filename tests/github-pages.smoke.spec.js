const { test, expect } = require('@playwright/test');

const SAMPLE_OHBP_TEXT = [
  'Pacijent: TEST TESTIC, 1954.',
  'Datum prijema: 13.05.2026.',
  'Dg: Pneumonija.',
  'Alergije: nema.',
  'Terapija: ceftriakson 2 g iv.',
  'T 38.2, RR 135/80, puls 92.'
].join('\n');

async function openApp(page) {
  const consoleProblems = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleProblems.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    consoleProblems.push(error.message || String(error));
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!url.includes('/favicon')) {
      failedRequests.push(`${url} :: ${request.failure()?.errorText || 'request failed'}`);
    }
  });

  const response = await page.goto('./', { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `GitHub Pages response should be OK, got ${response?.status()}`).toBe(true);
  await expect(page).toHaveTitle(/Temperaturna lista.*v\d+/);
  await expect(page.getByRole('heading', { name: /Generator temperaturne liste/i })).toBeVisible();
  await expect(page.locator('#page1Title')).toBeVisible();

  return {
    assertCleanBrowserSignals() {
      expect(consoleProblems, 'No console errors or page errors').toEqual([]);
      expect(failedRequests, 'No failed network requests').toEqual([]);
    }
  };
}

async function continueWithoutFirebase(page) {
  const gate = page.locator('#firebaseLoginGate');
  await expect(gate).toBeVisible();
  await page.getByRole('button', { name: /Nastavi bez Firebasea/i }).click();
  await expect(gate).toBeHidden();
}

async function continueWithoutFirebaseIfVisible(page) {
  const gate = page.locator('#firebaseLoginGate');
  if (await gate.isVisible()) {
    await page.getByRole('button', { name: /Nastavi bez Firebasea/i }).click();
    await expect(gate).toBeHidden();
  }
}

test.describe('GitHub Pages smoke test', () => {
  test('loads the app without browser errors', async ({ page }) => {
    const browserSignals = await openApp(page);

    await expect(page.locator('#firebaseLoginGate')).toBeVisible();
    await expect(page.getByRole('button', { name: /Prijava Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nastavi bez Firebasea/i })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/Vite|Next\.js|Webpack|Unhandled Runtime Error/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('continues without Firebase and updates core patient fields', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await page.locator('#ohbpPasteBox').fill(SAMPLE_OHBP_TEXT);
    await page.locator('#fullName').fill('Test Testic');
    await page.locator('#birthYear').fill('1954');
    await page.locator('#admissionDate').fill('13.05.2026.');

    await expect(page.locator('#fullName')).toHaveValue('Test Testic');
    await expect(page.locator('#birthYear')).toHaveValue('1954');
    await expect(page.locator('#admissionDate')).toHaveValue('13.05.2026.');
    await expect(page.locator('#quickIdentityStatus')).toHaveText(/Spremno/i);
    await expect(page.locator('#page1Title')).toContainText(/prijem u srijedu/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('auto-saves patient data and restores it after reload', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await page.locator('#fullName').fill('Auto Save Testic');
    await page.locator('#birthYear').fill('1977');
    await page.locator('#admissionDate').fill('13.05.2026.');

    await expect.poll(async () => page.evaluate(() => {
      const raw = localStorage.getItem('temperaturna_lista_pacijent_autosave_v1');
      if (!raw) return '';
      try {
        return JSON.parse(raw)?.data?.fullName || '';
      } catch (error) {
        return '';
      }
    })).toBe('Auto Save Testic');
    await expect(page.locator('#patientDraftStatus')).toContainText(/Auto-save spremljen/i);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page1Title')).toBeVisible();
    await continueWithoutFirebaseIfVisible(page);

    await expect(page.locator('#fullName')).toHaveValue('Auto Save Testic');
    await expect(page.locator('#birthYear')).toHaveValue('1977');
    await expect(page.locator('#admissionDate')).toHaveValue('13.05.2026.');
    await expect(page.locator('#patientDraftStatus')).toContainText(/Auto-save (vraćen|spremljen)/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('loads embedded therapy database and suggests a known medicine', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const therapyCsvStatus = page.locator('#therapyCsvStatus');
    await expect(therapyCsvStatus).toContainText(/Baza lijekova OK/i);
    await expect(therapyCsvStatus).toContainText(/Ugrađena baza lijekova|Ugradena baza lijekova/i);
    await expect(therapyCsvStatus).toContainText(/2026_06_15|15\.06\.2026|10257/i);
    await expect(therapyCsvStatus).toHaveAttribute('data-health-state', 'ok');
    await expect(therapyCsvStatus).toHaveAttribute('data-alias-count', '10257');
    await expect(therapyCsvStatus).toHaveAttribute('data-stale', 'false');
    await expect(therapyCsvStatus).toHaveAttribute('data-stale-after-days', '45');
    await expect(therapyCsvStatus).toHaveAttribute('data-source', 'embedded');
    await expect(therapyCsvStatus).not.toContainText(/nije automatski učitana|nije automatski ucitana|ograničena|ogranicena/i);

    await page.locator('#therapy').fill('Verz');
    await expect(page.locator('#therapyAutocompleteBox')).toBeVisible();
    await expect(page.locator('#therapyAutocompleteBox')).toContainText(/Verzenios/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test.describe('desktop-only checks', () => {
    test.skip(({ isMobile }) => isMobile, 'Keyboard focus trap is a desktop smoke check.');

    test('keeps keyboard focus inside the Firebase login modal', async ({ page }) => {
      const browserSignals = await openApp(page);
      const gate = page.locator('#firebaseLoginGate');
      await expect(gate).toBeVisible();

      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press('Tab');
        const active = await page.evaluate(() => {
          const element = document.activeElement;
          return {
            id: element?.id || '',
            tag: element?.tagName || '',
            text: (element?.innerText || element?.value || element?.getAttribute?.('aria-label') || '').trim(),
            insideGate: Boolean(element?.closest?.('#firebaseLoginGate'))
          };
        });
        expect(active.insideGate, `Tab ${i + 1} moved focus outside Firebase modal: ${JSON.stringify(active)}`).toBe(true);
      }

      browserSignals.assertCleanBrowserSignals();
    });
  });

  test.describe('mobile-only checks', () => {
    test.skip(({ isMobile }) => !isMobile, 'Mobile overflow is checked only on the mobile project.');

    test('keeps the mobile workflow form within the viewport', async ({ page }) => {
      const browserSignals = await openApp(page);
      await continueWithoutFirebase(page);

      const overflowingElements = await page.evaluate(() => {
        const selectors = ['.sidebar', '.workflow-grid', '.workflow-step'];
        return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            selector,
            tag: element.tagName,
            className: String(element.className || ''),
            text: (element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            rectWidth: Math.round(rect.width)
          };
        })).filter((item) => item.scrollWidth > item.clientWidth + 2);
      });

      expect(overflowingElements, 'No hidden horizontal overflow in the mobile workflow form').toEqual([]);
      browserSignals.assertCleanBrowserSignals();
    });
  });
});
