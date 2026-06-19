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

function isTransientNetworkConsoleMessage(text) {
  return /^Failed to load resource: net::ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED)\b/i.test(String(text || ''));
}

function installFirebaseSmokeClient(page, options = {}) {
  return page.addInitScript((smokeOptions = {}) => {
    const writes = [];
    const events = [];
    const docs = new Map();
    let idCounter = 0;
    const failWritesWithPermissionDenied = Boolean(smokeOptions.failWritesWithPermissionDenied);
    const smokeUser = {
      uid: 'smoke-user-uid',
      email: 'smoke.firebase@example.test',
      displayName: 'Smoke Firebase User'
    };
    const cloneJson = (value) => JSON.parse(JSON.stringify(value));
    const collectionNameOf = (ref) => ref?.collectionName || ref?.name || '';
    const queryCollectionNameOf = (queryRef) => {
      if (!queryRef?.parts) return collectionNameOf(queryRef);
      return queryRef.parts.map(collectionNameOf).find(Boolean) || '';
    };
    const queryFiltersOf = (queryRef) => (queryRef?.parts || [])
      .filter(part => part?.type === 'where')
      .map(part => part.args || []);
    const queryLimitOf = (queryRef) => {
      const limitPart = (queryRef?.parts || []).find(part => part?.type === 'limit');
      return Number.isFinite(limitPart?.value) ? limitPart.value : null;
    };
    const throwPermissionDenied = () => {
      const error = new Error('Missing or insufficient permissions.');
      error.code = 'permission-denied';
      throw error;
    };
    window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ = events;
    window.__TEMPERATURNA_LISTA_SKIP_PRINT_DIALOG__ = true;
    window.__TEMPERATURNA_LISTA_PRINT_CALLS__ = 0;

    window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__ = {
      __smokeWrites: writes,
      __smokeEvents: events,
      __smokeDocs: docs,
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
        if (failWritesWithPermissionDenied) throwPermissionDenied();
        const id = `smoke-${String(++idCounter).padStart(3, '0')}`;
        const collection = collectionNameOf(collectionRef);
        const storedPayload = cloneJson(payload);
        docs.set(`${collection}/${id}`, storedPayload);
        writes.push({ op: 'addDoc', collection, id, payload: storedPayload });
        events.push({ op: 'addDoc', collection, id, payload: storedPayload });
        return { id };
      },
      setDoc: async (docRef, payload, options = {}) => {
        if (failWritesWithPermissionDenied) throwPermissionDenied();
        const collection = collectionNameOf(docRef);
        const key = `${collection}/${docRef.id}`;
        const previous = options.merge ? (docs.get(key) || {}) : {};
        const storedPayload = { ...previous, ...cloneJson(payload) };
        docs.set(key, storedPayload);
        writes.push({ op: 'setDoc', collection, id: docRef.id, options: cloneJson(options), payload: storedPayload });
        events.push({ op: 'setDoc', collection, id: docRef.id, options: cloneJson(options), payload: storedPayload });
      },
      getDocs: async (queryRef = {}) => {
        const collection = queryCollectionNameOf(queryRef);
        const filters = queryFiltersOf(queryRef);
        const maxRows = queryLimitOf(queryRef);
        let rows = Array.from(docs.entries())
          .map(([key, payload]) => {
            const [collectionName, id] = key.split('/');
            return { collectionName, id, payload };
          })
          .filter(item => !collection || item.collectionName === collection);
        filters.forEach(([field, operator, expectedValue]) => {
          if (operator !== '==') return;
          rows = rows.filter(item => item.payload?.[field] === expectedValue);
        });
        if (maxRows !== null) rows = rows.slice(0, maxRows);
        return {
          docs: rows.map(item => ({
            id: item.id,
            data: () => cloneJson(item.payload)
          }))
        };
      },
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
  }, options);
}

async function openApp(page, path = './') {
  const consoleProblems = [];
  const failedRequests = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isTransientNetworkConsoleMessage(text)) {
        consoleProblems.push(text);
      }
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
  try {
    await expect(gate).toBeVisible({ timeout: 3000 });
  } catch (error) {
    return;
  }
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

  test('builds follow-up control labs from checkbox picker', async ({ page }) => {
    await page.addInitScript(() => {
      if (window.__TL_CANVAS_TEXT_PATCHED__) return;
      window.__TL_CANVAS_TEXT_PATCHED__ = true;
      window.__TL_CANVAS_TEXT__ = [];
      window.__TL_CANVAS_TEXT_POSITIONS__ = [];
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function patchedFillText(text, ...args) {
        const renderedText = String(text || '');
        window.__TL_CANVAS_TEXT__.push(renderedText);
        window.__TL_CANVAS_TEXT_POSITIONS__.push({
          text: renderedText,
          x: Number(args[0]),
          y: Number(args[1])
        });
        return originalFillText.call(this, text, ...args);
      };
    });

    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await page.locator('#admissionDate').fill('15.06.2026.');
    await page.evaluate(() => {
      const setValue = (selector, value) => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('#therapy', Array.from({ length: 18 }, (_, index) => `Terapija ${index + 1}`).join('\n'));
      setValue('#labRaw', [
        'CRP 42',
        'E 4.5',
        'Hb 130',
        'Trc 220',
        'L 7',
        'GUK 6',
        'ureja 5',
        'kreatinin 80'
      ].join('\n'));
    });
    await page.locator('[data-collapsible-edit-target="followUpControl"]').click();
    await expect(page.locator('#followUpControl')).toBeVisible();
    await page.locator('#followUpControlDate').fill('19.06.2026.');
    await page.locator('#followUpControl').fill('Kontrola');

    const labGroups = await page.evaluate(() => Array.from(document.querySelectorAll('.followup-lab-chip-group'))
      .map(group => Array.from(group.querySelectorAll('[data-followup-lab-option]')).map(input => input.value)));
    expect(labGroups).toEqual([
      ['CRP', 'KKS'],
      ['GUK', 'ureja', 'kreatinin', 'Na', 'K', 'Cl'],
      ['bil', 'AST', 'ALT', 'AP', 'GGT', 'CK', 'LDH', 'Troponin', 'D-dimeri', 'urin']
    ]);

    await page.locator('[data-followup-lab-option][value="CRP"]').check();
    await page.locator('[data-followup-lab-option][value="KKS"]').check();
    await page.locator('[data-followup-lab-option][value="kreatinin"]').check();
    await expect(page.locator('#followUpControl')).toHaveValue('Kontrola\nCRP E Hb Trc L\nkreatinin');

    await page.evaluate(() => {
      window.__TL_CANVAS_TEXT__ = [];
      window.__TL_CANVAS_TEXT_POSITIONS__ = [];
      document.querySelector('#followUpControl')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect.poll(async () => page.evaluate(() => window.__TL_CANVAS_TEXT__ || []))
      .toEqual(expect.arrayContaining(['CRP', 'E', 'Hb', 'Trc', 'L', 'kreatinin']));
    const renderedControlLabs = await page.evaluate(() => window.__TL_CANVAS_TEXT__ || []);
    expect(renderedControlLabs).not.toContain('CRP E Hb Trc L');
    const renderedTextPositions = await page.evaluate(() => window.__TL_CANVAS_TEXT_POSITIONS__ || []);
    const admissionCrp = renderedTextPositions.find((entry) => /^CRP\b/.test(entry.text) && entry.text !== 'CRP');
    const followUpCrp = renderedTextPositions.find((entry) => entry.text === 'CRP');
    expect(admissionCrp).toBeTruthy();
    expect(followUpCrp).toBeTruthy();
    expect(Math.abs(admissionCrp.y - followUpCrp.y)).toBeLessThan(1);

    await page.locator('[data-followup-lab-option][value="KKS"]').uncheck();
    await expect(page.locator('#followUpControl')).toHaveValue('Kontrola\nCRP\nkreatinin');
    await expect(page.locator('[data-followup-lab-option][value="CRP"]')).toBeChecked();
    await expect(page.locator('[data-followup-lab-option][value="KKS"]')).not.toBeChecked();

    browserSignals.assertCleanBrowserSignals();
  });

  test('keeps chronic therapy in the Tab order even when collapsed', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const therapyToggle = page.locator('[data-collapsible-target="therapy"]');
    await expect(therapyToggle).toHaveAttribute('aria-expanded', 'true');
    await therapyToggle.click();
    await expect(therapyToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#therapy')).not.toBeVisible();

    await page.locator('#patientOrigin').click();
    await page.keyboard.press('Tab');

    await expect(therapyToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#therapy')).toBeVisible();
    await expect(page.locator('#therapy')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#showTherapyMonday2')).toBeFocused();

    browserSignals.assertCleanBrowserSignals();
  });

  test('opens the searchable Firebase patient dialog from the top action', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const openButton = page.getByRole('button', { name: /^Otvori pacijenta$/i });
    await expect(page.locator('#savePatientTopBtn')).toBeVisible();
    await expect(page.locator('#newPatientEntryBtn')).toBeVisible();
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

  test('starts clean when a stored patient draft is not marked for recovery', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('temperaturna_lista_pacijent_autosave_v1', JSON.stringify({
        version: 1,
        appVersion: 'legacy-local-draft',
        savedAt: '2026-06-16T10:00:00.000Z',
        data: {
          fullName: 'Stari Pacijent Testic',
          birthYear: '1971',
          admissionDate: '2026-06-16',
          diagnosis: 'Stari lokalni draft koji se ne smije sam otvoriti.'
        }
      }));
    });
    const browserSignals = await openApp(page, './?qa=clean-start-draft');
    await continueWithoutFirebaseIfVisible(page);

    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#birthYear')).toHaveValue('');
    await expect(page.locator('#admissionDate')).toHaveValue('');
    await expect(page.locator('#diagnosis')).toHaveValue('');
    await expect(page.locator('#patientDraftStatus')).toContainText(/ručno vraćanje/i);
    await expect(page.locator('#page1Title')).toBeVisible();

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
    await expect(page.locator('#patientDraftStatus')).toContainText(/Auto-save čuva nespremljenog pacijenta/i);

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

    const saveButton = page.locator('#savePatientTopBtn');
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

  test('updates an existing Firebase patient instead of creating a duplicate', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    const saveButton = page.locator('#savePatientToFirebaseBtn');
    const advancedSection = page.locator('#dataAdminAdvancedSection');
    const advancedSummary = advancedSection.locator('summary');
    await advancedSummary.click();
    await expect(advancedSection).toHaveAttribute('open', '');

    await page.locator('#fullName').fill('Duplikat Testic');
    await page.locator('#birthYear').fill('1978');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Prva dijagnoza bez duplikata.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');
    await saveButton.click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });
    await page.locator('#newPatientEntryBtn').click();
    await expect(page.locator('#fullName')).toHaveValue('');

    await page.locator('#fullName').fill('Duplikat Testic');
    await page.locator('#birthYear').fill('1978');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Ažurirana dijagnoza bez novog dokumenta.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv. + pantoprazol.');
    await saveButton.click();
    await expect(page.locator('#statusBar')).toContainText(/ažuriran postojeći zapis/i);

    const result = await page.evaluate(() => {
      const writes = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__.__smokeWrites
        .filter(item => ['addDoc', 'setDoc'].includes(item.op) && item.collection === 'patients');
      const adds = writes.filter(item => item.op === 'addDoc');
      const sets = writes.filter(item => item.op === 'setDoc');
      return {
        writes,
        addCount: adds.length,
        setCount: sets.length,
        firstAddId: adds[0]?.id || '',
        lastSetId: sets[sets.length - 1]?.id || '',
        lastPayload: writes[writes.length - 1]?.payload || null
      };
    });

    expect(dialogs[0].message).toContain('Spremiti trenutnog pacijenta u Firebase');
    expect(result.addCount).toBe(1);
    expect(result.setCount).toBeGreaterThanOrEqual(2);
    expect(result.lastSetId).toBe(result.firstAddId);
    expect(result.lastPayload.patientKey).toBe('patient-v1|duplikat testic|1978|2026-06-16');
    expect(result.lastPayload.data.diagnosis).toContain('Ažurirana dijagnoza');
    expect(result.lastPayload.data.therapy).toContain('pantoprazol');

    browserSignals.assertCleanBrowserSignals();
  });

  test('renames and deletes Firebase patients from the open patient dialog', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    const advancedSection = page.locator('#dataAdminAdvancedSection');
    await advancedSection.locator('summary').click();
    await expect(advancedSection).toHaveAttribute('open', '');

    await page.locator('#fullName').fill('Baza Akcija Testic');
    await page.locator('#birthYear').fill('1982');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Test upravljanja Firebase pacijentima.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');
    await page.locator('#savePatientToFirebaseBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    await page.locator('#openFirebasePatientDialogBtn').click();
    const dialog = page.locator('#firebasePatientDialog');
    const list = page.locator('#firebasePatientDialogList');
    await expect(dialog).toBeVisible();
    const savedRow = list.locator('.firebase-patient-row').filter({ hasText: 'Baza Akcija Testic' }).first();
    await expect(savedRow).toBeVisible();
    await expect(savedRow.locator('[data-firebase-patient-action="rename"]')).toBeVisible();
    await expect(savedRow.locator('[data-firebase-patient-action="delete"]')).toBeVisible();

    page.once('dialog', async (prompt) => {
      expect(prompt.type()).toBe('prompt');
      expect(prompt.message()).toContain('Novi naziv pacijenta');
      await prompt.accept('Baza Uredena Testic');
    });
    await savedRow.locator('[data-firebase-patient-action="rename"]').click();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/Preimenovano/i);
    await expect(list).toContainText('Baza Uredena Testic');
    await expect(list).not.toContainText('Baza Akcija Testic');

    const renamedRow = list.locator('.firebase-patient-row').filter({ hasText: 'Baza Uredena Testic' }).first();
    page.once('dialog', async (confirmDialog) => {
      expect(confirmDialog.type()).toBe('confirm');
      expect(confirmDialog.message()).toContain('Baza Uredena Testic');
      await confirmDialog.accept();
    });
    await renamedRow.locator('[data-firebase-patient-action="delete"]').click();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/obrisan/i);
    await expect(list.locator('.firebase-patient-row')).toHaveCount(0);

    const result = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const writes = client.__smokeWrites.filter(item => item.collection === 'patients');
      const renameWrite = writes
        .slice()
        .reverse()
        .find(item => item.op === 'setDoc' && item.payload?.lastSaveTrigger === 'rename') || null;
      return {
        renameWrite,
        deleteCount: writes.filter(item => item.op === 'deleteDoc').length,
        remainingDocs: Array.from(client.__smokeDocs.keys()).filter(key => key.startsWith('patients/')).length
      };
    });

    expect(result.renameWrite).toBeTruthy();
    expect(result.renameWrite.payload.label).toContain('Baza Uredena Testic');
    expect(result.renameWrite.payload.data.fullName).toBe('Baza Uredena Testic');
    expect(result.renameWrite.payload.patientKey).toBe('patient-v1|baza uredena testic|1982|2026-06-16');
    expect(result.deleteCount).toBe(1);
    expect(result.remainingDocs).toBe(0);

    browserSignals.assertCleanBrowserSignals();
  });

  test('keeps patient data and explains Firebase save failure before new entry', async ({ page }) => {
    await installFirebaseSmokeClient(page, { failWritesWithPermissionDenied: true });
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    await page.locator('#fullName').fill('Firebase Rules Testic');
    await page.locator('#birthYear').fill('1975');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Test pravila spremanja.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      const message = dialog.message();
      dialogs.push({ type: dialog.type(), message });
      if (/Svejedno otvoriti novi unos/i.test(message)) {
        await dialog.dismiss();
      } else {
        await dialog.accept();
      }
    });

    await page.locator('#newPatientEntryBtn').click();

    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Firebase pravila.*ne dopu/i);
    await expect(page.locator('#statusBar')).toContainText(/Novi unos je odgođen|Novi unos je odgo/i);
    await expect(page.locator('#fullName')).toHaveValue('Firebase Rules Testic');
    await expect(page.locator('#birthYear')).toHaveValue('1975');
    await expect(page.locator('#diagnosis')).toHaveValue('Test pravila spremanja.');

    expect(dialogs).toHaveLength(2);
    expect(dialogs[0].message).toContain('Spremiti trenutnog pacijenta u Firebase');
    expect(dialogs[1].message).toMatch(/Firebase pravila.*ne dopu/i);
    expect(dialogs[1].message).toContain('Svejedno otvoriti novi unos');

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

  test('blocks print after Firebase save failure until the user confirms', async ({ page }) => {
    await installFirebaseSmokeClient(page, { failWritesWithPermissionDenied: true });
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/smoke\.firebase@example\.test/i);

    await page.locator('#fullName').fill('Print Failure Testic');
    await page.locator('#birthYear').fill('1982');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Print failure smoke dijagnoza.');
    await page.locator('#therapy').fill('paracetamol 1 g p.o.');

    const printButton = page.locator('#printBtn');
    await printButton.click();

    const confirmDialog = page.locator('#printConfirmDialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.locator('#printConfirmDialogTitle')).toContainText(/Pacijent nije spremljen u Firebase/i);
    await expect(confirmDialog.locator('#printConfirmDialogDescription')).toContainText(/Firebase pravila.*ne dopu/i);
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(0);

    await confirmDialog.locator('[data-print-confirm-action="cancel"]').click();
    await expect(confirmDialog).toBeHidden();
    await expect(page.locator('#statusBar')).toContainText(/Ispis je otkazan.*nije spremljen u Firebase/i);
    await expect(page.locator('#fullName')).toHaveValue('Print Failure Testic');
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(0);

    await printButton.click();
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.locator('[data-print-confirm-action="proceed"]').click();
    await expect(confirmDialog).toBeHidden();
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(1);
    await expect(page.locator('#statusBar')).toContainText(/Ispis je otvoren bez Firebase spremanja/i);
    await expect(page.locator('#fullName')).toHaveValue('Print Failure Testic');

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

  test('loads embedded therapy database and suggests a known medicine', async ({ page, isMobile }) => {
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
    const autocompleteGeometry = await page.evaluate(() => {
      const textarea = document.getElementById('therapy');
      const box = document.getElementById('therapyAutocompleteBox');
      const field = textarea?.getBoundingClientRect();
      const menu = box?.getBoundingClientRect();
      const overlaps = Boolean(field && menu &&
        menu.left < field.right &&
        menu.right > field.left &&
        menu.top < field.bottom &&
        menu.bottom > field.top);
      const sampleX = menu ? Math.round(menu.left + Math.min(32, Math.max(8, menu.width / 2))) : 0;
      const sampleY = menu ? Math.round(menu.top + Math.min(32, Math.max(8, menu.height / 2))) : 0;
      const topElement = menu ? document.elementFromPoint(sampleX, sampleY) : null;
      const rightEdgeElement = menu
        ? document.elementFromPoint(Math.round(menu.right - 12), sampleY)
        : null;
      return {
        field: field ? { left: field.left, right: field.right, top: field.top, bottom: field.bottom } : null,
        menu: menu ? { left: menu.left, right: menu.right, top: menu.top, bottom: menu.bottom } : null,
        overlaps,
        visuallyOnTop: Boolean(box && topElement && (topElement === box || box.contains(topElement))),
        rightEdgeVisible: Boolean(box && rightEdgeElement && (rightEdgeElement === box || box.contains(rightEdgeElement))),
        renderedAtBodyLevel: box?.parentElement === document.body,
        sideFlyout: Boolean(box?.classList.contains('side-flyout')),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
    expect(autocompleteGeometry.field).toBeTruthy();
    expect(autocompleteGeometry.menu).toBeTruthy();
    expect(autocompleteGeometry.menu.left).toBeGreaterThanOrEqual(0);
    expect(autocompleteGeometry.menu.right).toBeLessThanOrEqual(autocompleteGeometry.viewportWidth + 1);
    expect(autocompleteGeometry.menu.top).toBeGreaterThanOrEqual(0);
    expect(autocompleteGeometry.menu.bottom).toBeLessThanOrEqual(autocompleteGeometry.viewportHeight + 1);
    expect(autocompleteGeometry.overlaps, 'Therapy autocomplete must not cover the therapy textarea').toBe(false);
    expect(autocompleteGeometry.visuallyOnTop, 'Therapy autocomplete must not be hidden behind the live preview').toBe(true);
    expect(autocompleteGeometry.rightEdgeVisible, 'Therapy autocomplete must not be clipped by the live preview').toBe(true);
    expect(autocompleteGeometry.renderedAtBodyLevel, 'Therapy autocomplete must render outside the clipped sidebar').toBe(true);
    if (!isMobile) {
      expect(autocompleteGeometry.sideFlyout).toBe(true);
      expect(autocompleteGeometry.menu.left).toBeGreaterThanOrEqual(autocompleteGeometry.field.right + 4);
    }

    await page.locator('#therapy').fill('Amlod');
    const activeTherapyOption = page.locator('#therapyAutocompleteBox .therapy-autocomplete-option.is-active');
    await expect(activeTherapyOption).toContainText(/Amlodipin/i);
    await expect(activeTherapyOption).toContainText(/1,0,0 tbl/i);
    await page.keyboard.press('ArrowRight');
    await expect(activeTherapyOption).toContainText(/0,1,0 tbl/i);
    await page.keyboard.press('ArrowRight');
    await expect(activeTherapyOption).toContainText(/0,0,1 tbl/i);
    await page.keyboard.press('ArrowLeft');
    await expect(activeTherapyOption).toContainText(/0,1,0 tbl/i);
    await page.keyboard.press('Enter');
    await expect(page.locator('#therapy')).toHaveValue(/Amlodipin.*5 mg.*0,1,0 tbl/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves a custom chronic therapy suggestion without touching the embedded medicine database', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1');
    });
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const therapyBox = page.locator('#therapyAutocompleteBox');
    await page.locator('#therapy').fill('Zipantola 40 mg 1,0,0 tbl');
    const saveOption = therapyBox.locator('.therapy-autocomplete-option.is-save-custom');
    await expect(saveOption).toBeVisible();
    await expect(saveOption).toContainText(/Spremi moj unos/i);
    await expect(saveOption).toContainText(/Zipantola 40 mg 1,0,0 tbl/i);
    await saveOption.click();

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const records = parsed?.records || {};
      const first = Object.values(records)[0] || null;
      return { recordCount: Object.keys(records).length, first };
    });
    expect(stored.recordCount).toBe(1);
    expect(stored.first.line).toBe('Zipantola 40 mg 1,0,0 tbl');
    expect(stored.first.source).toBe('custom');

    await page.locator('#therapy').fill('Zip');
    await expect(therapyBox).toBeVisible();
    await expect(therapyBox).toContainText(/Zipantola 40 mg 1,0,0 tbl/i);
    await expect(therapyBox).toContainText(/moj spremljeni prijedlog/i);
    await expect(page.locator('#therapyCsvStatus')).toContainText(/Baza lijekova OK/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves a custom diagnosis suggestion from the side flyout', async ({ page, isMobile }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1');
    });
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const diagnosisBox = page.locator('#diagnosisAutocompleteBox');
    await page.locator('#diagnosis').fill('Uro');
    const saveOption = diagnosisBox.locator('.therapy-autocomplete-option.is-save-custom');
    await expect(saveOption).toBeVisible();
    await expect(saveOption).toContainText(/Spremi moj unos/i);
    await expect(saveOption).toContainText(/Uro/i);

    const autocompleteGeometry = await page.evaluate(() => {
      const textarea = document.getElementById('diagnosis');
      const box = document.getElementById('diagnosisAutocompleteBox');
      const field = textarea?.getBoundingClientRect();
      const menu = box?.getBoundingClientRect();
      const overlaps = Boolean(field && menu &&
        menu.left < field.right &&
        menu.right > field.left &&
        menu.top < field.bottom &&
        menu.bottom > field.top);
      return {
        field: field ? { right: field.right } : null,
        menu: menu ? { left: menu.left, right: menu.right } : null,
        overlaps,
        sideFlyout: Boolean(box?.classList.contains('side-flyout')),
        viewportWidth: window.innerWidth
      };
    });
    expect(autocompleteGeometry.field).toBeTruthy();
    expect(autocompleteGeometry.menu).toBeTruthy();
    expect(autocompleteGeometry.menu.left).toBeGreaterThanOrEqual(0);
    expect(autocompleteGeometry.menu.right).toBeLessThanOrEqual(autocompleteGeometry.viewportWidth + 1);
    if (!isMobile) {
      expect(autocompleteGeometry.overlaps, 'Diagnosis autocomplete must not cover the diagnosis textarea').toBe(false);
      expect(autocompleteGeometry.sideFlyout).toBe(true);
      expect(autocompleteGeometry.menu.left).toBeGreaterThanOrEqual(autocompleteGeometry.field.right + 4);
    }

    await saveOption.click();
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const records = parsed?.records || {};
      const first = Object.values(records)[0] || null;
      return { recordCount: Object.keys(records).length, first };
    });
    expect(stored.recordCount).toBe(1);
    expect(stored.first.line).toBe('Uro');
    expect(stored.first.source).toBe('custom');

    await page.locator('#diagnosis').fill('Ur');
    await expect(diagnosisBox).toBeVisible();
    await expect(diagnosisBox).toContainText(/Uro/i);
    await expect(diagnosisBox).toContainText(/moj spremljeni prijedlog/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('opens continuation lists and adds List 3 and List 4 from plus', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    await page.addInitScript(() => {
      window.__TL_CANVAS_TEXT__ = [];
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function patchedFillText(text, ...args) {
        window.__TL_CANVAS_TEXT__.push(String(text || ''));
        return originalFillText.call(this, text, ...args);
      };
    });
    const browserSignals = await openApp(page, './?qa=list2-print-smoke&firebaseSmoke=1');

    await page.locator('#fullName').fill('Nastavak Testic');
    await page.locator('#birthYear').fill('1960');
    await page.locator('#admissionDate').fill('15.06.2026.');
    await page.locator('#diagnosis').fill('Kontrola nastavka terapijske liste.');
    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');
    await page.evaluate(() => { window.__TL_CANVAS_TEXT__ = []; });

    const mainListTabs = page.locator('#previewListTabs');
    await expect(page.locator('[data-preview-list-tabs]')).toHaveCount(3);
    await mainListTabs.locator('[data-preview-list="2"]').click();

    await expect(mainListTabs.locator('[data-preview-list="2"]')).toHaveClass(/is-active/);
    await expect(page.locator('#page2Title')).toContainText(/List 2 - nastavak terapijske liste/i);
    await expect(page.locator('#page2Title')).toContainText(/22\.06\.-28\.06\./);
    await expect(page.locator('#shell2').locator('xpath=..')).toHaveClass(/is-preview-selected/);
    await expect(page.locator('body')).toHaveClass(/preview-continuation-print-mode/);

    await expect.poll(async () => page.evaluate(() => {
      const text = (window.__TL_CANVAS_TEXT__ || []).join('\n');
      return text.includes('Amlodipin 5 mg 1,0,0 tbl');
    })).toBe(true);

    await page.locator('#printBtn').click();
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(1);
    const printEvent = await page.evaluate(() => {
      const events = window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ || [];
      return events.filter(item => item.op === 'print').at(-1) || null;
    });
    expect(printEvent).toBeTruthy();
    expect(printEvent.pageCount).toBe(1);

    await mainListTabs.locator('[data-preview-list-add]').click();
    await expect(mainListTabs.locator('[data-preview-list="3"]')).toBeVisible();
    await expect(mainListTabs.locator('[data-preview-list="4"]')).toBeVisible();
    await expect(mainListTabs.locator('[data-preview-list-add]')).toHaveCount(0);
    await expect(mainListTabs.locator('[data-preview-list="3"]')).toHaveClass(/is-active/);
    await expect(page.locator('#page2Title')).toContainText(/List 3 - nastavak terapijske liste/i);
    await expect(page.locator('#page2Title')).toContainText(/29\.06\.-05\.07\./);
    await expect(page.locator('#shell2').locator('xpath=..')).toHaveClass(/is-preview-selected/);
    await expect(page.locator('body')).toHaveClass(/preview-continuation-print-mode/);

    const tabState = await page.evaluate(() => Array.from(document.querySelectorAll('[data-preview-list-tabs]')).map((container) => ({
      labels: Array.from(container.querySelectorAll('[data-preview-list]')).map((button) => button.textContent.trim()),
      active: container.querySelector('.is-active')?.textContent?.trim() || '',
      hasPlus: Boolean(container.querySelector('[data-preview-list-add]'))
    })));
    expect(tabState).toEqual([
      { labels: ['List 1', 'List 2', 'List 3', 'List 4'], active: 'List 3', hasPlus: false },
      { labels: ['List 1', 'List 2', 'List 3', 'List 4'], active: 'List 3', hasPlus: false },
      { labels: ['List 1', 'List 2', 'List 3', 'List 4'], active: 'List 3', hasPlus: false }
    ]);

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
