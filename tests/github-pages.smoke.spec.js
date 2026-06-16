const { test, expect } = require('@playwright/test');

const SAMPLE_OHBP_TEXT = [
  'Pacijent: TEST TESTIC, 1954.',
  'Datum prijema: 13.05.2026.',
  'Dg: Pneumonija.',
  'Alergije: nema.',
  'Terapija: ceftriakson 2 g iv.',
  'T 38.2, RR 135/80, puls 92.'
].join('\n');

const PARSER_TEST_STORAGE_KEY = 'temperaturna_lista_parser_test_cases_v1';

function installFirebaseSmokeClient(page) {
  return page.addInitScript(() => {
    const writes = [];
    const events = [];
    const docs = new Map();
    let idCounter = 0;
    const smokeUser = {
      uid: 'smoke-user-uid',
      email: 'smoke.firebase@example.test',
      displayName: 'Smoke Firebase User'
    };
    const cloneJson = (value) => JSON.parse(JSON.stringify(value));
    const collectionNameOf = (ref) => ref?.collectionName || ref?.name || '';
    window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ = events;
    window.__TEMPERATURNA_LISTA_SKIP_PRINT_DIALOG__ = true;
    window.__TEMPERATURNA_LISTA_PRINT_CALLS__ = 0;

    window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__ = {
      __smokeWrites: writes,
      __smokeEvents: events,
      __smokeUser: smokeUser,
      auth: { currentUser: smokeUser },
      db: { __smokeDb: true },
      provider: {},
      onAuthStateChanged(_auth, callback) {
        window.setTimeout(() => callback(smokeUser), 0);
        return () => {};
      },
      signInWithPopup: async () => ({ user: smokeUser }),
      signOut: async () => {},
      collection(_db, name) {
        return { name };
      },
      doc(_db, collectionName, id) {
        return { collectionName, id };
      },
      addDoc: async (collectionRef, payload) => {
        const id = `smoke-${String(++idCounter).padStart(3, '0')}`;
        const collection = collectionNameOf(collectionRef);
        const storedPayload = cloneJson(payload);
        docs.set(`${collection}/${id}`, storedPayload);
        writes.push({ op: 'addDoc', collection, id, payload: storedPayload });
        events.push({ op: 'addDoc', collection, id, payload: storedPayload });
        return { id };
      },
      setDoc: async (docRef, payload, options = {}) => {
        const collection = collectionNameOf(docRef);
        const key = `${collection}/${docRef.id}`;
        const previous = options.merge ? (docs.get(key) || {}) : {};
        const storedPayload = { ...previous, ...cloneJson(payload) };
        docs.set(key, storedPayload);
        writes.push({ op: 'setDoc', collection, id: docRef.id, options: cloneJson(options), payload: storedPayload });
        events.push({ op: 'setDoc', collection, id: docRef.id, options: cloneJson(options), payload: storedPayload });
      },
      getDocs: async () => ({ docs: [] }),
      getDoc: async (docRef) => {
        const collection = collectionNameOf(docRef);
        const key = `${collection}/${docRef.id}`;
        return {
          id: docRef.id,
          exists: () => docs.has(key),
          data: () => cloneJson(docs.get(key) || {})
        };
      },
      deleteDoc: async (docRef) => {
        const collection = collectionNameOf(docRef);
        docs.delete(`${collection}/${docRef.id}`);
        writes.push({ op: 'deleteDoc', collection, id: docRef.id });
        events.push({ op: 'deleteDoc', collection, id: docRef.id });
      },
      query: (...parts) => ({ parts }),
      where: (...args) => ({ type: 'where', args }),
      limit: (value) => ({ type: 'limit', value }),
      serverTimestamp: () => ({
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        __smokeServerTimestamp: true
      })
    };
  });
}

async function openApp(page, path = './') {
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

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
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

  test('opens the searchable Firebase patient dialog from the top action', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const openButton = page.getByRole('button', { name: /^Otvori pacijenta$/i });
    await expect(openButton).toBeVisible();
    await expect(openButton).toBeEnabled();
    await openButton.click();

    const dialog = page.locator('#firebasePatientDialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Otvori pacijenta$/i })).toBeVisible();
    await expect(page.locator('#firebasePatientSearchInput')).toBeVisible();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/Firebase prijava|prijavi/i);
    const dialogLayer = await page.evaluate(() => {
      const backdrop = document.getElementById('firebasePatientDialog');
      const panel = backdrop?.querySelector('.firebase-patient-dialog');
      if (!backdrop || !panel) return { mountedOnBody: false, coveredPoints: ['missing-dialog'] };
      const rect = panel.getBoundingClientRect();
      const samplePoints = [
        [rect.left + rect.width / 2, rect.top + 24],
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + rect.width / 2, rect.bottom - 24]
      ];
      const coveredPoints = samplePoints.map(([x, y]) => {
        const element = document.elementFromPoint(x, y);
        return element?.closest?.('#firebasePatientDialog') ? '' : (element?.tagName || 'none');
      }).filter(Boolean);
      return {
        mountedOnBody: backdrop.parentElement === document.body,
        coveredPoints
      };
    });
    expect(dialogLayer.mountedOnBody, 'Firebase patient dialog should escape the sidebar stacking context').toBe(true);
    expect(dialogLayer.coveredPoints, 'Firebase patient dialog should not be covered by the A4 preview').toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(openButton).toBeFocused();

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

  test('saves patient data to Firebase through the smoke client', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    await page.locator('#fullName').fill('Firebase Smoke Testic');
    await page.locator('#birthYear').fill('1968');
    await page.locator('#admissionDate').fill('14.06.2026.');
    await page.locator('#diagnosis').fill('Pneumonija smoke test.');
    await page.locator('#therapy').fill('amoksicilin 1 g p.o.');

    const advancedSection = page.locator('#dataAdminAdvancedSection');
    const advancedSummary = advancedSection.locator('summary');
    await advancedSummary.click();
    await expect(advancedSection).toHaveAttribute('open', '');

    const saveButton = page.locator('#savePatientToFirebaseBtn');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase kolekciju "patients"/i);
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Spremljeno|Firebase auto-save spremljen/i);

    const write = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.find(item => item.op === 'addDoc' && item.collection === 'patients') || null;
    });

    expect(write).toBeTruthy();
    expect(write.payload.schema).toBe('temperaturna-lista-patient-v1');
    expect(write.payload.ownerUid).toBe('smoke-user-uid');
    expect(write.payload.ownerEmail).toBe('smoke.firebase@example.test');
    expect(write.payload.lastSaveTrigger).toBe('manual');
    expect(write.payload.label).toContain('Firebase Smoke Testic');
    expect(write.payload.data.fullName).toBe('Firebase Smoke Testic');
    expect(write.payload.data.birthYear).toBe('1968');
    expect(write.payload.data.admissionDate).toBe('2026-06-14');
    expect(write.payload.data.diagnosis).toContain('Pneumonija smoke test');
    expect(write.payload.data.therapy).toContain('amoksicilin');
    expect(write.payload.expiresAt).toMatch(/^2026-09-/);
    expect(write.payload.serverCreatedAt.__smokeServerTimestamp).toBe(true);

    browserSignals.assertCleanBrowserSignals();
  });

  test('starts a new top entry after offering Firebase save', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    await page.locator('#fullName').fill('Novi Unos Testic');
    await page.locator('#birthYear').fill('1974');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Dijagnoza prije novog unosa.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    const newEntryButton = page.locator('#newPatientEntryBtn');
    await expect(newEntryButton).toBeVisible();
    await expect(newEntryButton).toBeEnabled();
    await newEntryButton.click();

    await expect(page.locator('#statusBar')).toContainText(/Novi unos je spreman.*spremljen u Firebase/i);
    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#birthYear')).toHaveValue('');
    await expect(page.locator('#admissionDate')).toHaveValue('');
    await expect(page.locator('#diagnosis')).toHaveValue('');
    await expect(page.locator('#therapy')).toHaveValue('');
    await expect(page.locator('#fullName')).toBeFocused();

    const write = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites
        .filter(item => ['addDoc', 'setDoc'].includes(item.op) && item.collection === 'patients')
        .reverse()
        .find(item => item.payload?.lastSaveTrigger === 'new-entry') || null;
    });

    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].type).toBe('confirm');
    expect(dialogs[0].message).toContain('Spremiti trenutnog pacijenta u Firebase');
    expect(write).toBeTruthy();
    expect(write.payload.schema).toBe('temperaturna-lista-patient-v1');
    expect(write.payload.ownerUid).toBe('smoke-user-uid');
    expect(write.payload.lastSaveTrigger).toBe('new-entry');
    expect(write.payload.label).toContain('Novi Unos Testic');
    expect(write.payload.data.fullName).toBe('Novi Unos Testic');
    expect(write.payload.data.birthYear).toBe('1974');
    expect(write.payload.data.admissionDate).toBe('2026-06-16');
    expect(write.payload.data.diagnosis).toContain('Dijagnoza prije novog unosa');
    expect(write.payload.data.therapy).toContain('ceftriakson');

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves patient to Firebase before opening print dialog through the smoke client', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    await page.locator('#fullName').fill('Print Save Testic');
    await page.locator('#birthYear').fill('1981');
    await page.locator('#admissionDate').fill('15.06.2026.');
    await page.locator('#diagnosis').fill('Print smoke dijagnoza.');
    await page.locator('#therapy').fill('paracetamol 1 g p.o.');

    const printButton = page.locator('#printBtn');
    await expect(printButton).toBeVisible();
    await expect(printButton).toBeEnabled();
    await printButton.click();

    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Firebase spremanje prije ispisa spremljen/i);
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase i otvoren je dijalog za ispis/i);
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(1);

    const result = await page.evaluate(() => {
      const events = window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ || [];
      const printIndex = events.findIndex(item => item.op === 'print');
      const writeBeforePrint = events
        .slice(0, printIndex)
        .reverse()
        .find(item => ['addDoc', 'setDoc'].includes(item.op) && item.collection === 'patients') || null;
      const pageVersion = document.title.match(/offline\s+(.+)$/)?.[1] || '';
      return { printIndex, writeBeforePrint, pageVersion };
    });

    expect(result.printIndex).toBeGreaterThan(0);
    expect(result.writeBeforePrint).toBeTruthy();
    expect(result.writeBeforePrint.payload.schema).toBe('temperaturna-lista-patient-v1');
    expect(result.writeBeforePrint.payload.appVersion).toBe(result.pageVersion);
    expect(result.writeBeforePrint.payload.lastSaveTrigger).toBe('print');
    expect(result.writeBeforePrint.payload.ownerUid).toBe('smoke-user-uid');
    expect(result.writeBeforePrint.payload.label).toContain('Print Save Testic');
    expect(result.writeBeforePrint.payload.data.fullName).toBe('Print Save Testic');
    expect(result.writeBeforePrint.payload.data.birthYear).toBe('1981');
    expect(result.writeBeforePrint.payload.data.admissionDate).toBe('2026-06-15');
    expect(result.writeBeforePrint.payload.data.diagnosis).toContain('Print smoke dijagnoza');
    expect(result.writeBeforePrint.payload.data.therapy).toContain('paracetamol');
    expect(result.writeBeforePrint.payload.expiresAt).toMatch(/^2026-09-/);

    browserSignals.assertCleanBrowserSignals();
  });

  test('captures a parser test case with Ctrl Alt P', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);
    await page.evaluate((key) => localStorage.removeItem(key), PARSER_TEST_STORAGE_KEY);

    await page.locator('#ohbpPasteBox').fill(SAMPLE_OHBP_TEXT);
    await page.locator('#fullName').fill('Test Testic');
    await page.locator('#birthYear').fill('1954');
    await page.locator('#admissionDate').fill('13.05.2026.');

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      if (dialog.type() === 'confirm') {
        await dialog.accept();
        return;
      }
      if (dialog.type() === 'prompt') {
        await dialog.accept('Krivo parsira terapiju iz OHBP nalaza.');
        return;
      }
      await dialog.dismiss();
    });

    await page.keyboard.press('Control+Alt+P');

    await expect.poll(async () => page.evaluate(() => {
      const cases = window.TemperaturnaListaParserTests?.exportLocal?.() || [];
      return cases[0]?.note || '';
    })).toContain('Krivo parsira terapiju');

    const capture = await page.evaluate(() => window.TemperaturnaListaParserTests.exportLocal()[0]);
    expect(dialogs.map(item => item.type)).toEqual(['confirm', 'prompt']);
    expect(capture.source).toBe('ctrl-alt-p');
    expect(capture.raw).toContain('Pacijent: TEST TESTIC');
    expect(capture.expected.fullName).toBe('Test Testic');
    expect(capture.expected.birthYear).toBe('1954');
    expect(capture.expected.admissionDate).toBe('2026-05-13');
    expect(capture.currentData.fullName).toBe('Test Testic');
    expect(capture.parserWarningsAtCapture).toEqual(expect.any(Array));
    await expect(page.locator('#statusBar')).toContainText(/Parser test spremljen lokalno/i);

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
