const fs = require('fs');
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
const LEGACY_PATIENT_DRAFT_STORAGE_KEY = 'temperaturna_lista_pacijent_autosave_v1';
const ENCRYPTED_PATIENT_DRAFT_STORAGE_KEY = 'temperaturna_lista_pacijent_sifrirani_draft_v2';
const PATIENT_DRAFT_TEST_PASSPHRASE = 'sigurna-lozinka-test-123';

async function getReadableBrowserStorageText(page) {
  return page.evaluate(async () => {
    const storagePairs = (storage) => {
      const pairs = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        pairs.push([key, storage.getItem(key)]);
      }
      return pairs;
    };
    const indexedDbRecords = [];
    const openDatabase = (name) => new Promise((resolve) => {
      const request = indexedDB.open(name);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
    });
    const getAllFromStore = (db, storeName) => new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => resolve([]);
        request.onsuccess = () => resolve(request.result || []);
      } catch (error) {
        resolve([]);
      }
    });

    if (indexedDB.databases) {
      const databases = await indexedDB.databases().catch(() => []);
      for (const dbInfo of databases || []) {
        if (!dbInfo?.name) continue;
        const db = await openDatabase(dbInfo.name);
        if (!db) continue;
        try {
          for (const storeName of Array.from(db.objectStoreNames || [])) {
            const rows = await getAllFromStore(db, storeName);
            indexedDbRecords.push({ db: dbInfo.name, store: storeName, rows });
          }
        } finally {
          db.close();
        }
      }
    }

    return JSON.stringify({
      localStorage: storagePairs(localStorage),
      sessionStorage: storagePairs(sessionStorage),
      indexedDB: indexedDbRecords
    });
  });
}

async function expectBrowserStorageNotToContain(page, forbiddenTerms) {
  const storageText = await getReadableBrowserStorageText(page);
  for (const term of forbiddenTerms) {
    expect(storageText, `Browser storage must not contain cleartext term: ${term}`).not.toContain(term);
  }
}

function isTransientNetworkConsoleMessage(text) {
  return /^Failed to load resource: net::ERR_(NETWORK_CHANGED|INTERNET_DISCONNECTED)\b/i.test(String(text || ''));
}

function isIgnorableFailedRequest(url, errorText) {
  const href = String(url || '');
  const failure = String(errorText || '');
  if (href.includes('/favicon')) return true;
  if (/https:\/\/www\.google\.com\/images\/cleardot\.gif/i.test(href) && /net::ERR_ABORTED/i.test(failure)) return true;
  return /identitytoolkit\/v3\/relyingparty\/getProjectConfig/i.test(href)
    && /net::ERR_ABORTED/i.test(failure);
}

async function markFirebaseLoginGateDismissed(page) {
  await page.evaluate(() => {
    sessionStorage.setItem('temperaturna_lista_firebase_login_gate_dismissed_v1', 'true');
  }).catch(() => {});
}

function installFirebaseSmokeClient(page, options = {}) {
  return page.addInitScript((smokeOptions = {}) => {
    const writes = [];
    const events = [];
    const docs = new Map();
    let idCounter = 0;
    const failWritesWithPermissionDenied = Boolean(smokeOptions.failWritesWithPermissionDenied);
    const failPatientWritesWithPermissionDenied = Boolean(smokeOptions.failPatientWritesWithPermissionDenied);
    let popupClosedFailuresRemaining = Number(smokeOptions.popupClosedFailures || 0);
    const smokeUser = {
      uid: 'smoke-user-uid',
      email: smokeOptions.userEmail || 'smoke.firebase@example.test',
      displayName: smokeOptions.displayName || 'Smoke Firebase User'
    };
    if (!smokeOptions.noUserProfile) {
      const profile = {
        schema: 'temperaturna-lista-user-profile-v1',
        appVersion: 'smoke-test',
        uid: smokeUser.uid,
        firstName: smokeOptions.firstName || 'Smoke',
        lastName: smokeOptions.lastName || 'Firebase User',
        department: smokeOptions.department || 'Infektologija',
        organizationId: 'temperaturna-lista-dev',
        wardIds: ['infektologija'],
        activeWardId: 'infektologija',
        roles: smokeOptions.roles || ['clinician'],
        email: smokeUser.email,
        displayName: 'Smoke Firebase User',
        role: (smokeOptions.roles || ['clinician'])[0] || 'clinician',
        createdAt: '2026-06-20T00:00:00.000Z',
        updatedAt: '2026-06-20T00:00:00.000Z'
      };
      if (smokeOptions.invalidClinicalContext) {
        delete profile.organizationId;
        profile.wardIds = [];
        profile.activeWardId = '';
        profile.roles = [];
        profile.role = '';
      }
      docs.set(`userProfiles/${smokeUser.uid}`, profile);
    }
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
      signInWithPopup: async () => {
        if (popupClosedFailuresRemaining > 0) {
          popupClosedFailuresRemaining -= 1;
          const error = new Error('Popup closed by user');
          error.code = 'auth/popup-closed-by-user';
          throw error;
        }
        return { user: smokeUser };
      },
      signOut: async () => {},
      collection(_db, name) {
        return { name };
      },
      doc(_db, collectionName, id) {
        return { collectionName, id };
      },
      addDoc: async (collectionRef, payload) => {
        const collection = collectionNameOf(collectionRef);
        if (failWritesWithPermissionDenied || (failPatientWritesWithPermissionDenied && collection === 'patients')) throwPermissionDenied();
        const id = `smoke-${String(++idCounter).padStart(3, '0')}`;
        const storedPayload = cloneJson(payload);
        docs.set(`${collection}/${id}`, storedPayload);
        writes.push({ op: 'addDoc', collection, id, payload: storedPayload });
        events.push({ op: 'addDoc', collection, id, payload: storedPayload });
        return { id };
      },
      setDoc: async (docRef, payload, options = {}) => {
        const collection = collectionNameOf(docRef);
        if (failWritesWithPermissionDenied || (failPatientWritesWithPermissionDenied && collection === 'patients')) throwPermissionDenied();
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
        events.push({ op: 'getDocs', collection, filters: cloneJson(filters), limit: maxRows });
        const roles = smokeOptions.roles || ['clinician'];
        const isSmokeSuperAdmin = smokeUser.email === 'luka.jerkovic1@gmail.com' && roles.includes('admin');
        if ((collection === 'userProfiles' || collection === 'patientAuditEvents') && !isSmokeSuperAdmin) {
          throwPermissionDenied();
        }
        if (collection === 'patients') {
          const filterMap = new Map(filters
            .filter(([, operator]) => operator === '==')
            .map(([field, , expectedValue]) => [field, expectedValue]));
          const hasClinicalListScope =
            filterMap.get('accessModel') === 'organization-ward-role-v1' &&
            filterMap.get('organizationId') === 'temperaturna-lista-dev' &&
            filterMap.get('wardId') === 'infektologija' &&
            filterMap.get('clinicalPartitionKey') === 'clinical-v1|temperaturna-lista-dev|infektologija';
          const hasLegacyOwnerMigrationScope = filterMap.get('ownerUid') === smokeUser.uid;
          const hasLegacyEmailMigrationScope = filterMap.get('ownerEmail') === smokeUser.email;
          if (!isSmokeSuperAdmin && !hasClinicalListScope && !hasLegacyOwnerMigrationScope && !hasLegacyEmailMigrationScope) throwPermissionDenied();
        }
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
    const errorText = request.failure()?.errorText || 'request failed';
    if (!isIgnorableFailedRequest(url, errorText)) {
      failedRequests.push(`${url} :: ${errorText}`);
    }
  });

  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `GitHub Pages response should be OK, got ${response?.status()}`).toBe(true);
  await expect(page).toHaveTitle(/Temperaturna lista.*v\d+/);
  await expect(page.locator('h1', { hasText: 'Generator temperaturne liste' })).toBeVisible();
  await expect(page.locator('#page1Title')).toBeVisible();

  return {
    assertCleanBrowserSignals() {
      expect(consoleProblems, 'No console errors or page errors').toEqual([]);
      expect(failedRequests, 'No failed network requests').toEqual([]);
    }
  };
}

async function closeFirebaseGateIfVisible(page, timeout = 1000) {
  await markFirebaseLoginGateDismissed(page);
  const gate = page.locator('#firebaseLoginGate');
  const deadline = Date.now() + timeout;
  let closed = false;
  while (Date.now() <= deadline) {
    const visible = await gate.isVisible().catch(() => false);
    if (!visible) {
      if (!closed) return false;
      await page.waitForTimeout(150);
      if (!(await gate.isVisible().catch(() => false))) return true;
    } else {
      await page.evaluate(() => {
        window.__TEMPERATURNA_LISTA_TEST_DISMISS_FIREBASE_LOGIN_GATE__?.();
      });
      await expect(gate).toBeHidden({ timeout: 3000 });
      closed = true;
    }
  }
  await expect(gate).toBeHidden();
  return closed;
}

async function continueWithoutFirebase(page) {
  const gate = page.locator('#firebaseLoginGate');
  try {
    await expect(gate).toBeVisible({ timeout: 3000 });
  } catch (error) {
    return;
  }
  await closeFirebaseGateIfVisible(page, 4000);
}

async function continueWithoutFirebaseIfVisible(page) {
  await closeFirebaseGateIfVisible(page, 1000);
}

async function openDataAdminAdvanced(page) {
  const details = page.locator('#dataAdminAdvancedSection');
  const isOpen = await details.evaluate((element) => Boolean(element.open)).catch(() => false);
  if (!isOpen) {
    await details.locator('summary').click();
  }
  await expect(details).toHaveJSProperty('open', true);
}

async function scrollFieldOutOfAutocompleteView(page, selector) {
  await page.evaluate((fieldSelector) => {
    const field = document.querySelector(fieldSelector);
    if (!field) return;
    let scroller = field.parentElement;
    while (scroller && scroller !== document.body) {
      const style = window.getComputedStyle(scroller);
      if (/(auto|scroll|overlay)/i.test(style.overflowY) && scroller.scrollHeight > scroller.clientHeight + 24) break;
      scroller = scroller.parentElement;
    }
    const scrollBy = () => {
      const fieldRect = field.getBoundingClientRect();
      const distance = Math.max(420, Math.round(fieldRect.height + 160));
      if (!scroller || scroller === document.body) {
        window.scrollBy(0, distance);
      } else {
        scroller.scrollTop += distance;
        scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
      window.dispatchEvent(new Event('scroll'));
    };
    for (let i = 0; i < 8; i += 1) {
      const rect = field.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      if (rect.bottom <= 0 || rect.top >= viewportHeight) break;
      scrollBy();
    }
  }, selector);
  await page.waitForTimeout(150);
}

test.describe('GitHub Pages smoke test', () => {
  test('loads the app without browser errors', async ({ page }) => {
    const browserSignals = await openApp(page);

    await expect(page.locator('#firebaseLoginGate')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Dobro došli natrag/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nastavi s Googleom/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Novi korisnik/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nastavi bez Firebasea/i })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/\bVite\b|Next\.js|Webpack|Unhandled Runtime Error/i);

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
    await expect(page.locator('#patientSyncStatus')).toContainText(/nespremljene promjene/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('shows downtime availability when the browser goes offline', async ({ page, context }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await expect(page.locator('#appAvailabilityStatus')).toContainText(/Dostupnost/i);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('#appAvailabilityStatus')).toContainText(/offline na/i);
    await expect(page.locator('#appAvailabilityStatus')).toHaveAttribute('data-network-status', 'offline');
    await expect(page.locator('#appAvailabilityStatus')).toHaveAttribute('data-firebase-status', 'unavailable');

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.locator('#appAvailabilityStatus')).toHaveAttribute('data-network-status', 'online');
  });

  test('exports and restores a downtime backup envelope without browser auto-storage', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await page.locator('#fullName').fill('Downtime Testic');
    await page.locator('#birthYear').fill('1961');
    await page.locator('#admissionDate').fill('18.06.2026.');
    await page.locator('#diagnosis').fill('Downtime smoke dijagnoza.');
    await page.locator('#therapy').fill('Downtime smoke terapija.');

    await openDataAdminAdvanced(page);
    await expect(page.locator('#downloadDowntimeBackupBtn')).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#downloadDowntimeBackupBtn').click();
    const download = await downloadPromise;
    const backupPath = await download.path();
    expect(backupPath).toBeTruthy();
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const backupImportPath = `${backupPath}.json`;
    fs.copyFileSync(backupPath, backupImportPath);

    expect(backup.schema).toBe('temperaturna-lista-downtime-backup-v1');
    expect(backup.containsPatientData).toBe(true);
    expect(backup.authorizedUseOnly).toBe(true);
    expect(backup.retentionPolicy).toEqual({
      patientDays: 90,
      localDraftHours: 12,
      parserTestDays: 30,
      auditDays: 3650
    });
    expect(backup.availability).toHaveProperty('networkStatus');
    expect(backup.data.fullName).toBe('Downtime Testic');
    expect(backup.data.diagnosis).toBe('Downtime smoke dijagnoza.');

    await page.locator('#fullName').fill('');
    await page.locator('#diagnosis').fill('');
    await page.locator('#therapy').fill('');
    await page.locator('#loadDataInput').setInputFiles(backupImportPath);

    await expect(page.locator('#fullName')).toHaveValue('Downtime Testic');
    await expect(page.locator('#diagnosis')).toHaveValue('Downtime smoke dijagnoza.');
    await expect(page.locator('#therapy')).toHaveValue('Downtime smoke terapija.');
    await expect(page.locator('#statusBar')).toContainText(/downtime backup/i);
    await expect(page.locator('#patientSyncStatus')).toContainText(/nespremljene promjene/i);
    await expectBrowserStorageNotToContain(page, [
      'Downtime Testic',
      'Downtime smoke dijagnoza',
      'Downtime smoke terapija'
    ]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('registers a new Firebase user profile from the startup gate', async ({ page }) => {
    await installFirebaseSmokeClient(page, {
      noUserProfile: true,
      userEmail: 'novi.korisnik@gmail.com'
    });
    const browserSignals = await openApp(page, './?qa=firebase-user-profile-smoke&firebaseSmoke=1');

    const gate = page.locator('#firebaseLoginGate');
    await expect(gate).toBeVisible();
    await expect(page.getByRole('button', { name: /Novi korisnik/i })).toBeVisible();
    await page.getByRole('button', { name: /Novi korisnik/i }).click();
    await expect(page.locator('#firebaseRegistrationForm')).toBeVisible();
    await page.locator('#firebaseRegisterFirstName').fill('Luka');
    await page.locator('#firebaseRegisterLastName').fill('Jerkovic');
    await page.locator('#firebaseRegisterDepartment').fill('Infektologija');
    await page.locator('#firebaseRegisterEmail').fill('novi.korisnik@gmail.com');
    await page.getByRole('button', { name: /Spremi profil/i }).click();

    await expect(gate).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Luka Jerkovic.*Infektologija/i);
    await expect(page.locator('#firebaseUserPanelName')).toHaveText('Luka Jerkovic');
    await expect(page.locator('#firebaseUserPanelToggleBtn')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#firebaseUserPanelBody')).toBeHidden();
    const userPanelScrollBehavior = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar');
      const panel = document.querySelector('#firebaseUserPanel');
      const isDesktop = window.matchMedia('(min-width: 901px)').matches;
      if (!sidebar || !panel) {
        return { checked: false, position: 'missing', visibleAtTop: false, visibleAtBottom: false };
      }
      const position = window.getComputedStyle(panel).position;
      if (!isDesktop || sidebar.scrollHeight <= sidebar.clientHeight + 20) {
        return { checked: false, position, visibleAtTop: false, visibleAtBottom: false };
      }
      sidebar.scrollTop = 0;
      const topSidebarRect = sidebar.getBoundingClientRect();
      const topPanelRect = panel.getBoundingClientRect();
      const visibleAtTop = topPanelRect.bottom > topSidebarRect.top && topPanelRect.top < topSidebarRect.bottom;
      sidebar.scrollTop = sidebar.scrollHeight;
      const bottomSidebarRect = sidebar.getBoundingClientRect();
      const bottomPanelRect = panel.getBoundingClientRect();
      const visibleAtBottom = bottomPanelRect.bottom > bottomSidebarRect.top && bottomPanelRect.top < bottomSidebarRect.bottom;
      return { checked: true, position, visibleAtTop, visibleAtBottom };
    });
    expect(userPanelScrollBehavior.position).not.toBe('sticky');
    if (userPanelScrollBehavior.checked) {
      expect(userPanelScrollBehavior.visibleAtTop).toBe(false);
      expect(userPanelScrollBehavior.visibleAtBottom).toBe(true);
    }
    await page.locator('#firebaseUserPanelToggleBtn').click();
    await expect(page.locator('#firebaseUserPanelToggleBtn')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#firebaseUserPanelBody')).toBeVisible();
    await expect(page.locator('#firebaseUserPanelMeta')).toContainText(/Infektologija/i);
    await expect(page.locator('#firebaseUserSwitchBtn')).toContainText(/Promijeni račun/i);
    await expect(page.locator('#firebaseUserNewBtn')).toContainText(/Novi korisnik/i);
    await expect(page.locator('#firebaseUserSignOutBtn')).toBeEnabled();
    await expect(page.locator('#firebaseUserSettings')).toHaveCount(0);
    await expect(page.getByText('Osnovne postavke')).toHaveCount(0);
    await expect(page.locator('#savePatientTopBtn')).toBeEnabled();
    await expect(page.locator('#openFirebasePatientDialogBtn')).toBeEnabled();

    const profileWrite = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites
        .find(item => item.op === 'setDoc' && item.collection === 'userProfiles' && item.id === 'smoke-user-uid') || null;
    });
    expect(profileWrite).toBeTruthy();
    expect(profileWrite.payload.schema).toBe('temperaturna-lista-user-profile-v1');
    expect(profileWrite.payload.firstName).toBe('Luka');
    expect(profileWrite.payload.lastName).toBe('Jerkovic');
    expect(profileWrite.payload.department).toBe('Infektologija');
    expect(profileWrite.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(profileWrite.payload.wardIds).toEqual(['infektologija']);
    expect(profileWrite.payload.activeWardId).toBe('infektologija');
    expect(profileWrite.payload.roles).toEqual(['clinician']);
    expect(profileWrite.payload.email).toBe('novi.korisnik@gmail.com');

    browserSignals.assertCleanBrowserSignals();
  });

  test('fails closed when Firebase profile has no valid clinical context', async ({ page }) => {
    await installFirebaseSmokeClient(page, { invalidClinicalContext: true });
    const browserSignals = await openApp(page, './?qa=firebase-clinical-context-fail-closed&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeVisible();
    await expect(page.locator('#firebaseLoginGateStatus')).toContainText(/klinički kontekst|profil/i);
    await expect(page.locator('#savePatientTopBtn')).toBeDisabled();
    await expect(page.locator('#openFirebasePatientDialogBtn')).toBeDisabled();

    const patientWrites = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.filter(item => item.collection === 'patients').length;
    });
    expect(patientWrites).toBe(0);

    browserSignals.assertCleanBrowserSignals();
  });

  test('keeps Firebase availability healthy when account switch popup is cancelled', async ({ page }) => {
    await installFirebaseSmokeClient(page, { popupClosedFailures: 1 });
    const browserSignals = await openApp(page, './?qa=firebase-popup-cancel-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);
    await expect(page.locator('#appAvailabilityStatus')).toContainText(/Firebase je dostupan/i);

    await page.locator('#firebaseUserPanelToggleBtn').click();
    await page.locator('#firebaseUserSwitchBtn').click();

    await expect(page.locator('#firebasePatientQuickStatus')).toContainText(/Promjena računa je prekinuta/i);
    await expect(page.locator('#appAvailabilityStatus')).toContainText(/Firebase je dostupan/i);
    await expect(page.locator('#appAvailabilityStatus')).not.toContainText(/nije dostupan|zatvorena prije završetka/i);

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
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-dialog-smoke&firebaseSmoke=1');
    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

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
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/Nema/i);
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

  test('does not write patient cleartext to local browser storage by default', async ({ page }) => {
    const browserSignals = await openApp(page, './?qa=local-draft-disabled');
    await continueWithoutFirebase(page);

    await page.locator('#fullName').fill('Auto Save Testic');
    await page.locator('#birthYear').fill('1977');
    await page.locator('#admissionDate').fill('13.05.2026.');
    await page.locator('#diagnosis').fill('Pneumonija sigurnosni test.');
    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');
    await page.locator('#allergies').fill('Penicilin');
    await page.waitForTimeout(1200);

    await expect(page.locator('#patientDraftStatus')).toContainText(/Lokalni auto-save pacijentnih podataka je isključen/i);
    const patientDraftKeys = await page.evaluate(([legacyKey, encryptedKey]) => ({
      legacy: localStorage.getItem(legacyKey),
      encrypted: localStorage.getItem(encryptedKey)
    }), [LEGACY_PATIENT_DRAFT_STORAGE_KEY, ENCRYPTED_PATIENT_DRAFT_STORAGE_KEY]);
    expect(patientDraftKeys.legacy).toBeNull();
    expect(patientDraftKeys.encrypted).toBeNull();
    await expectBrowserStorageNotToContain(page, [
      'Auto Save Testic',
      '13.05.2026.',
      'Pneumonija sigurnosni test',
      'Amlodipin 5 mg',
      'Penicilin'
    ]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('does not automatically restore the legacy cleartext patient draft', async ({ page }) => {
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
    await expect(page.locator('#patientDraftStatus')).toContainText(/stari nešifrirani lokalni draft/i);
    await openDataAdminAdvanced(page);
    await expect(page.locator('#restorePatientDraftBtn')).toHaveText(/Migriraj stari draft/i);
    await expect(page.locator('#clearPatientDraftBtn')).toHaveText(/Trajno obriši lokalni draft/i);
    await expect(page.locator('#page1Title')).toBeVisible();

    browserSignals.assertCleanBrowserSignals();
  });

  test('encrypted local draft requires passphrase after reload and restores with the correct passphrase', async ({ page }) => {
    const browserSignals = await openApp(page, './?qa=encrypted-local-draft');
    await continueWithoutFirebase(page);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('Passphrase se ne sprema');
      await dialog.accept(PATIENT_DRAFT_TEST_PASSPHRASE);
    });
    await openDataAdminAdvanced(page);
    await page.locator('#enableEncryptedPatientDraftBtn').click();
    await expect(page.locator('#patientDraftStatus')).toContainText(/Šifrirani lokalni oporavak je uključen/i);

    await page.locator('#fullName').fill('Auto Save Testic');
    await page.locator('#birthYear').fill('1977');
    await page.locator('#admissionDate').fill('13.05.2026.');
    await page.locator('#diagnosis').fill('Pneumonija za šifrirani draft.');
    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');

    await expect.poll(async () => page.evaluate(() => {
      const raw = localStorage.getItem('temperaturna_lista_pacijent_sifrirani_draft_v2');
      if (!raw) return '';
      try {
        return JSON.parse(raw)?.schema || '';
      } catch (error) {
        return '';
      }
    })).toBe('temperaturna-lista-encrypted-patient-draft-v1');
    await expectBrowserStorageNotToContain(page, [
      'Auto Save Testic',
      '13.05.2026.',
      'Pneumonija za šifrirani draft',
      'Amlodipin 5 mg'
    ]);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page1Title')).toBeVisible();
    await continueWithoutFirebaseIfVisible(page);

    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#patientDraftStatus')).toContainText(/Za vraćanje unesite passphrase/i);
    await openDataAdminAdvanced(page);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept('pogresna-lozinka-123');
    });
    await page.locator('#restorePatientDraftBtn').click();
    await expect(page.locator('#patientDraftStatus')).toContainText(/Passphrase nije ispravan/i);
    await expect(page.locator('#fullName')).toHaveValue('');

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(PATIENT_DRAFT_TEST_PASSPHRASE);
    });
    await page.locator('#restorePatientDraftBtn').click();
    await expect(page.locator('#fullName')).toHaveValue('Auto Save Testic');
    await expect(page.locator('#birthYear')).toHaveValue('1977');
    await expect(page.locator('#admissionDate')).toHaveValue('13.05.2026.');
    await expect(page.locator('#diagnosis')).toHaveValue('Pneumonija za šifrirani draft.');
    await expect(page.locator('#therapy')).toHaveValue('Amlodipin 5 mg 1,0,0 tbl');
    await expect(page.locator('#patientDraftStatus')).toContainText(/Lokalni draft vraćen/i);
    await expectBrowserStorageNotToContain(page, [
      'Auto Save Testic',
      'Pneumonija za šifrirani draft',
      'Amlodipin 5 mg'
    ]);

    browserSignals.assertCleanBrowserSignals();
  });

  test('expired encrypted local draft is removed instead of restored', async ({ page }) => {
    const browserSignals = await openApp(page, './?qa=encrypted-local-draft-expired');
    await continueWithoutFirebase(page);

    page.once('dialog', async (dialog) => {
      await dialog.accept(PATIENT_DRAFT_TEST_PASSPHRASE);
    });
    await openDataAdminAdvanced(page);
    await page.locator('#enableEncryptedPatientDraftBtn').click();
    await page.locator('#fullName').fill('Istek Draft Testic');
    await page.locator('#diagnosis').fill('Istekli lokalni draft.');
    await expect.poll(async () => page.evaluate((key) => Boolean(localStorage.getItem(key)), ENCRYPTED_PATIENT_DRAFT_STORAGE_KEY)).toBe(true);

    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      const envelope = raw ? JSON.parse(raw) : null;
      envelope.expiresAt = '2020-01-01T00:00:00.000Z';
      localStorage.setItem(key, JSON.stringify(envelope));
    }, ENCRYPTED_PATIENT_DRAFT_STORAGE_KEY);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#page1Title')).toBeVisible();
    await continueWithoutFirebaseIfVisible(page);

    await expect(page.locator('#fullName')).toHaveValue('');
    await expect(page.locator('#patientDraftStatus')).toContainText(/istekao i obrisan|isključen/i);
    await openDataAdminAdvanced(page);
    await expect(page.locator('#restorePatientDraftBtn')).toBeDisabled();
    await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), ENCRYPTED_PATIENT_DRAFT_STORAGE_KEY)).toBeNull();
    await expectBrowserStorageNotToContain(page, ['Istek Draft Testic', 'Istekli lokalni draft']);

    browserSignals.assertCleanBrowserSignals();
  });

  test('blocks admin dashboard for authenticated non-admin users', async ({ page }) => {
    await installFirebaseSmokeClient(page, {
      userEmail: 'iva.korisnik@example.test',
      displayName: 'Iva Korisnik',
      firstName: 'Iva',
      lastName: 'Korisnik',
      roles: ['clinician']
    });
    const browserSignals = await openApp(page, './?qa=admin-access-block&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#dataAdminAdvancedSection')).toBeHidden();
    await page.keyboard.press('Control+Alt+A');
    await expect(page.locator('#adminPanel')).toBeHidden();
    await expect(page.locator('#statusBar')).toContainText(/samo Luka Jerković|Admin dashboard je zaključan/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('opens admin dashboard only for Luka super admin and loads safe admin overview', async ({ page }) => {
    await installFirebaseSmokeClient(page, {
      userEmail: 'luka.jerkovic1@gmail.com',
      displayName: 'Luka Jerković',
      firstName: 'Luka',
      lastName: 'Jerković',
      roles: ['clinician', 'admin']
    });
    const browserSignals = await openApp(page, './?qa=admin-dashboard&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      client.__smokeDocs.set('userProfiles/ana-admin-test', {
        schema: 'temperaturna-lista-user-profile-v1',
        appVersion: 'smoke-test',
        uid: 'ana-admin-test',
        firstName: 'Ana',
        lastName: 'Admin Test',
        displayName: 'Ana Admin Test',
        department: 'Infektologija',
        organizationId: 'temperaturna-lista-dev',
        wardIds: ['infektologija'],
        activeWardId: 'infektologija',
        roles: ['clinician'],
        role: 'clinician',
        email: 'ana.admin@example.test',
        createdAt: '2026-06-20T08:00:00.000Z',
        updatedAt: '2026-06-20T08:00:00.000Z',
        status: 'active'
      });
      client.__smokeDocs.set('patients/admin-patient-001', {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: 'smoke-test',
        accessModel: 'organization-ward-role-v1',
        organizationId: 'temperaturna-lista-dev',
        wardId: 'infektologija',
        clinicalPartitionKey: 'clinical-v1|temperaturna-lista-dev|infektologija',
        ownerUid: 'ana-admin-test',
        ownerEmail: 'ana.admin@example.test',
        patientMode: 'ward',
        label: 'SINTETSKI PACIJENT',
        status: 'active',
        createdAt: '2026-06-20T08:10:00.000Z',
        updatedAt: '2026-06-20T08:30:00.000Z',
        data: { patientMode: 'ward', fullName: 'SINTETSKI PACIJENT' }
      });
      client.__smokeDocs.set('patientAuditEvents/audit-admin-001', {
        schema: 'temperaturna-lista-audit-v1',
        eventType: 'patient.update',
        accessModel: 'organization-ward-role-v1',
        organizationId: 'temperaturna-lista-dev',
        wardId: 'infektologija',
        clinicalPartitionKey: 'clinical-v1|temperaturna-lista-dev|infektologija',
        actorUid: 'ana-admin-test',
        actorEmail: 'ana.admin@example.test',
        actorRole: 'clinician',
        patientDocId: 'admin-patient-001',
        createdAt: '2026-06-20T08:35:00.000Z',
        source: 'client',
        trigger: 'smoke-test'
      });
      client.__smokeDocs.set('patientAuditEvents/audit-admin-002', {
        schema: 'temperaturna-lista-audit-v1',
        eventType: 'patient.saveFailed',
        accessModel: 'organization-ward-role-v1',
        organizationId: 'temperaturna-lista-dev',
        wardId: 'infektologija',
        clinicalPartitionKey: 'clinical-v1|temperaturna-lista-dev|infektologija',
        actorUid: 'ana-admin-test',
        actorEmail: 'ana.admin@example.test',
        actorRole: 'clinician',
        patientDocId: 'admin-patient-001',
        createdAt: '2026-06-20T08:40:00.000Z',
        source: 'client',
        trigger: 'smoke-test'
      });
    });

    await expect(page.locator('#dataAdminAdvancedSection')).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await page.keyboard.press('Control+Alt+A');
    await expect(page.locator('#adminPanel')).toBeVisible();
    await expect(page.locator('#adminAccessStatus')).toContainText(/Admin pristup potvrđen/i);
    await expect(page.locator('#adminUsersTableBody')).toContainText(/Ana Admin Test/i);
    await expect(page.locator('#adminMetricPatients')).toHaveText('1');
    await expect(page.locator('#adminMetricErrors')).toHaveText('1');
    await expect(page.locator('#adminAuditList')).toContainText(/patient\.update/i);
    await expect(page.locator('#adminErrorList')).toContainText(/patient\.saveFailed/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves patient data to Firebase through the smoke client', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    await page.locator('#fullName').fill('Firebase Smoke Testic');
    await page.locator('#birthYear').fill('1968');
    await page.locator('#admissionDate').fill('14.06.2026.');
    await page.locator('#diagnosis').fill('Pneumonija smoke test.');
    await page.locator('#therapy').fill('amoksicilin 1 g p.o.');
    await expect(page.locator('#patientSyncStatus')).toContainText(/nespremljene promjene/i);

    const saveButton = page.locator('#savePatientTopBtn');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase kolekciju "patients"/i);
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Spremljeno|Firebase auto-save spremljen/i);
    await expect(page.locator('#patientSyncStatus')).toContainText(/spremljeno u Firebase/i);
    await expect(page.locator('#patientSyncStatus')).toHaveAttribute('data-sync-state', 'synced');

    const write = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.find(item => item.op === 'addDoc' && item.collection === 'patients') || null;
    });

    expect(write).toBeTruthy();
    expect(write.payload.schema).toBe('temperaturna-lista-patient-v1');
    expect(write.payload.status).toBe('active');
    expect(write.payload.ownerUid).toBe('smoke-user-uid');
    expect(write.payload.ownerEmail).toBe('smoke.firebase@example.test');
    expect(write.payload.ownerDepartment).toBe('Infektologija');
    expect(write.payload.ownerDisplayName).toBe('Smoke Firebase User');
    expect(write.payload.accessModel).toBe('organization-ward-role-v1');
    expect(write.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(write.payload.wardId).toBe('infektologija');
    expect(write.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
    expect(write.payload.roles).toContain('clinician');
    expect(write.payload.lastSaveTrigger).toBe('manual');
    expect(write.payload.label).toContain('Firebase Smoke Testic');
    expect(write.payload.patientMode).toBe('ward');
    expect(write.payload.patientKey).toBe('patient-v1|ward|firebase smoke testic|1968|2026-06-14');
    expect(write.payload.data.patientMode).toBe('ward');
    expect(write.payload.data.fullName).toBe('Firebase Smoke Testic');
    expect(write.payload.data.birthYear).toBe('1968');
    expect(write.payload.data.admissionDate).toBe('2026-06-14');
    expect(write.payload.data.diagnosis).toContain('Pneumonija smoke test');
    expect(write.payload.data.therapy).toContain('amoksicilin');
    expect(write.payload.version).toBe(1);
    expect(write.payload.dataHash).toMatch(/^[a-f0-9]{64}$/);
    expect(write.payload.updatedByUid).toBe('smoke-user-uid');
    expect(write.payload.updatedByEmail).toBe('smoke.firebase@example.test');
    expect(write.payload.clinicalRecord.schema).toBe('temperaturna-lista-clinical-record-v1');
    expect(write.payload.clinicalRecord.patient.fullName).toBe('Firebase Smoke Testic');
    expect(write.payload.clinicalRecord.conditions[0].text).toContain('Pneumonija');
    expect(write.payload.clinicalRecord.medications[0].name).toContain('amoksicilin');
    expect(write.payload.clinicalValidation.ok).toBe(true);
    expect(write.payload.medicationSafety.issues).toEqual(expect.any(Array));
    expect(write.payload.expiresAt).toMatch(/^2026-09-/);
    expect(write.payload.serverCreatedAt.__smokeServerTimestamp).toBe(true);

    const audit = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.find(item => item.op === 'addDoc' && item.collection === 'patientAuditEvents' && item.payload?.eventType === 'patient.create') || null;
    });
    expect(audit).toBeTruthy();
    expect(audit.payload.schema).toBe('temperaturna-lista-audit-v1');
    expect(audit.payload.patientDocId).toBe(write.id);
    expect(audit.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(audit.payload.wardId).toBe('infektologija');
    expect(audit.payload.actorUid).toBe('smoke-user-uid');
    expect(audit.payload.previousHash).toBe('');
    expect(audit.payload.newHash).toMatch(/^[a-f0-9]{64}$/);

    browserSignals.assertCleanBrowserSignals();
  });

  test('shows owned legacy Firebase patients and migrates them on save', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-legacy-patient-migration-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      client.__smokeDocs.set('patients/legacy-001', {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: 'legacy-smoke',
        ownerUid: 'smoke-user-uid',
        ownerEmail: 'smoke.firebase@example.test',
        label: 'Legacy Firebase Testic (1971) 14.06.2026.',
        patientKey: 'patient-v1|legacy firebase testic|1971|2026-06-14',
        patientMode: 'ward',
        data: {
          patientMode: 'ward',
          fullName: 'Legacy Firebase Testic',
          birthYear: '1971',
          admissionDate: '2026-06-14',
          diagnosis: 'Legacy migracijska dijagnoza.',
          allergies: 'nema',
          therapy: 'Legacy migracijska terapija.',
          vitalSigns: '',
          showDiagnosisOnList: true,
          showAllergiesOnList: true,
          showTherapyOnList: true,
          showVitalSignsOnList: true
        },
        createdAt: '2026-06-14T07:00:00.000Z',
        updatedAt: '2026-06-14T07:15:00.000Z'
      });
    });

    await page.locator('#openFirebasePatientDialogBtn').click();
    await expect(page.locator('#firebasePatientDialog')).toBeVisible();
    await expect(page.locator('#firebasePatientDialogList')).toContainText('Legacy Firebase Testic');
    await expect(page.locator('#firebasePatientDialogList')).toContainText(/Stari zapis|stari zapis/i);
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/starih za migraciju/i);

    const legacyQuery = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeEvents
        .filter(item => item.op === 'getDocs' && item.collection === 'patients')
        .find(item => (item.filters || []).some(([field, operator, value]) => field === 'ownerUid' && operator === '==' && value === 'smoke-user-uid')) || null;
    });
    expect(legacyQuery).toBeTruthy();

    await page.locator('[data-firebase-patient-action="open"][data-firebase-patient-id="legacy-001"]').click();
    await expect(page.locator('#firebasePatientDialog')).toBeHidden();
    await expect(page.locator('#fullName')).toHaveValue('Legacy Firebase Testic');

    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je .*Firebase/i);
    const migrationWrite = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites
        .find(item => item.op === 'setDoc' && item.collection === 'patients' && item.id === 'legacy-001') || null;
    });
    expect(migrationWrite).toBeTruthy();
    expect(migrationWrite.payload.accessModel).toBe('organization-ward-role-v1');
    expect(migrationWrite.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(migrationWrite.payload.wardId).toBe('infektologija');
    expect(migrationWrite.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
    expect(migrationWrite.payload.data.fullName).toBe('Legacy Firebase Testic');

    browserSignals.assertCleanBrowserSignals();
  });

  test('bulk migrates legacy Firebase patients to the current ward profile', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-legacy-bulk-migration-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      client.__smokeDocs.set('patients/legacy-uid-001', {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: 'legacy-smoke',
        ownerUid: 'smoke-user-uid',
        ownerEmail: 'smoke.firebase@example.test',
        label: 'Legacy UID Testic (1972) 15.06.2026.',
        patientKey: 'patient-v1|legacy uid testic|1972|2026-06-15',
        patientMode: 'ward',
        data: {
          patientMode: 'ward',
          fullName: 'Legacy UID Testic',
          birthYear: '1972',
          admissionDate: '2026-06-15',
          diagnosis: 'Legacy UID dijagnoza.',
          allergies: 'nema',
          therapy: 'Legacy UID terapija.',
          vitalSigns: '',
          showDiagnosisOnList: true,
          showAllergiesOnList: true,
          showTherapyOnList: true,
          showVitalSignsOnList: true
        },
        createdAt: '2026-06-15T07:00:00.000Z',
        updatedAt: '2026-06-15T07:15:00.000Z'
      });
      client.__smokeDocs.set('patients/legacy-email-001', {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: 'legacy-smoke',
        ownerEmail: 'smoke.firebase@example.test',
        label: 'Legacy Email Testic (1973) 16.06.2026.',
        patientKey: 'patient-v1|legacy email testic|1973|2026-06-16',
        patientMode: 'outpatient',
        data: {
          patientMode: 'outpatient',
          fullName: 'Legacy Email Testic',
          birthYear: '1973',
          admissionDate: '2026-06-16',
          diagnosis: 'Legacy Email dijagnoza.',
          allergies: 'nema',
          therapy: 'Legacy Email terapija.',
          vitalSigns: '',
          showDiagnosisOnList: true,
          showAllergiesOnList: true,
          showTherapyOnList: true,
          showVitalSignsOnList: true
        },
        createdAt: '2026-06-16T07:00:00.000Z',
        updatedAt: '2026-06-16T07:15:00.000Z'
      });
    });

    await page.locator('#openFirebasePatientDialogBtn').click();
    await expect(page.locator('#firebasePatientDialog')).toBeVisible();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/starih za migraciju: 2/i);
    await page.locator('#firebasePatientDialogCloseBtn').click();
    await expect(page.locator('#firebasePatientDialog')).toBeHidden();

    await page.locator('#firebaseUserPanelToggleBtn').click();
    await expect(page.locator('#firebaseUserMigrateLegacyPatientsBtn')).toContainText('Prebaci stare pacijente (2)');
    await expect(page.locator('#firebaseUserMigrateLegacyPatientsBtn')).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Prebaciti 2 starih Firebase pacijenata');
      await dialog.accept();
    });
    await page.locator('#firebaseUserMigrateLegacyPatientsBtn').click();
    await expect(page.locator('#firebasePatientQuickStatus')).toContainText(/Prebačeno starih Firebase pacijenata.*2/i);

    const migrationResult = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const writes = client.__smokeWrites
        .filter(item => item.op === 'setDoc' && item.collection === 'patients' && ['legacy-uid-001', 'legacy-email-001'].includes(item.id));
      const emailQuery = client.__smokeEvents
        .find(item => item.op === 'getDocs' && item.collection === 'patients' &&
          (item.filters || []).some(([field, operator, value]) => field === 'ownerEmail' && operator === '==' && value === 'smoke.firebase@example.test')) || null;
      return { writes, emailQuery };
    });
    expect(migrationResult.emailQuery).toBeTruthy();
    expect(migrationResult.writes).toHaveLength(2);
    migrationResult.writes.forEach((write) => {
      expect(write.payload.accessModel).toBe('organization-ward-role-v1');
      expect(write.payload.organizationId).toBe('temperaturna-lista-dev');
      expect(write.payload.wardId).toBe('infektologija');
      expect(write.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
      expect(write.payload.ownerUid).toBe('smoke-user-uid');
      expect(write.payload.ownerEmail).toBe('smoke.firebase@example.test');
      expect(write.payload.patientMode).toBe('ward');
      expect(write.payload.data.patientMode).toBe('ward');
      expect(write.payload.lastSaveTrigger).toBe('legacy-bulk-migration');
    });

    browserSignals.assertCleanBrowserSignals();
  });

  test('super admin recovers orphan Firebase patients into Luka ward profile', async ({ page }) => {
    await installFirebaseSmokeClient(page, {
      userEmail: 'luka.jerkovic1@gmail.com',
      displayName: 'Luka Jerković',
      firstName: 'Luka',
      lastName: 'Jerković',
      roles: ['clinician', 'admin']
    });
    const browserSignals = await openApp(page, './?qa=firebase-admin-orphan-recovery-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      client.__smokeDocs.set('patients/orphan-admin-recovery-001', {
        appVersion: 'pre-access-model-smoke',
        label: 'Orphan Recovery Testic (1974) 17.06.2026.',
        data: {
          fullName: 'Orphan Recovery Testic',
          birthYear: '1974',
          admissionDate: '2026-06-17',
          diagnosis: 'Orphan recovery dijagnoza.',
          allergies: 'nema',
          therapy: 'Orphan recovery terapija.',
          vitalSigns: '',
          patientMode: 'outpatient',
          showDiagnosisOnList: true,
          showAllergiesOnList: true,
          showTherapyOnList: true,
          showVitalSignsOnList: true
        },
        createdAt: '2026-06-17T07:00:00.000Z',
        updatedAt: '2026-06-17T07:20:00.000Z'
      });
    });

    await page.locator('#openFirebasePatientDialogBtn').click();
    await expect(page.locator('#firebasePatientDialog')).toBeVisible();
    await page.locator('#firebasePatientDialogRefreshBtn').click();
    await expect(page.locator('#firebasePatientDialogList')).toContainText('Orphan Recovery Testic');
    await expect(page.locator('#firebasePatientDialogList')).toContainText(/stari zapis/i);
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/starih za migraciju/i);

    await page.locator('#firebasePatientDialogCloseBtn').click();
    await page.locator('#firebaseUserPanelToggleBtn').click();
    await expect(page.locator('#firebaseUserMigrateLegacyPatientsBtn')).toContainText('Prebaci stare pacijente (1)');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Prebaciti 1 starih Firebase pacijenata');
      await dialog.accept();
    });
    await page.locator('#firebaseUserMigrateLegacyPatientsBtn').click();
    await expect(page.locator('#firebasePatientQuickStatus')).toContainText(/Prebačeno starih Firebase pacijenata.*1/i);

    const recoveryResult = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const unfilteredAdminQuery = client.__smokeEvents
        .find(item => item.op === 'getDocs' && item.collection === 'patients' && !(item.filters || []).length) || null;
      const write = client.__smokeWrites
        .find(item => item.op === 'setDoc' && item.collection === 'patients' && item.id === 'orphan-admin-recovery-001') || null;
      return { unfilteredAdminQuery, write };
    });
    expect(recoveryResult.unfilteredAdminQuery).toBeTruthy();
    expect(recoveryResult.write).toBeTruthy();
    expect(recoveryResult.write.payload.accessModel).toBe('organization-ward-role-v1');
    expect(recoveryResult.write.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(recoveryResult.write.payload.wardId).toBe('infektologija');
    expect(recoveryResult.write.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
    expect(recoveryResult.write.payload.ownerEmail).toBe('luka.jerkovic1@gmail.com');
    expect(recoveryResult.write.payload.patientMode).toBe('ward');
    expect(recoveryResult.write.payload.data.patientMode).toBe('ward');
    expect(recoveryResult.write.payload.data.fullName).toBe('Orphan Recovery Testic');

    browserSignals.assertCleanBrowserSignals();
  });

  test('separates ambulatory and ward patient modes in the form and Firebase dialog', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=patient-mode-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    await expect(page.locator('#patientModeWardBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-collapsible-field="therapy"]')).toBeVisible();

    await page.locator('#patientModeOutpatientBtn').click();
    await expect(page.locator('#patientModeOutpatientBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-collapsible-field="diagnosis"]')).toBeHidden();
    await expect(page.locator('[data-collapsible-field="therapy"]')).toBeVisible();
    await expect(page.locator('#therapyCsvStatus')).toBeVisible();
    await expect(page.locator('[data-collapsible-field="labRaw"]')).toBeHidden();
    await expect(page.locator('[data-collapsible-field="radiologyRaw"]')).toBeHidden();
    await expect(page.locator('[data-collapsible-field="patientOrigin"]')).toBeVisible();
    await expect(page.locator('[data-collapsible-field="followUpControl"]')).toBeVisible();
    await expect(page.locator('[data-collapsible-field="microbiologySamples"]')).toBeVisible();

    await page.locator('#fullName').fill('Ambulanta Mode Testic');
    await page.locator('#birthYear').fill('1988');
    await page.locator('#admissionDate').fill('20.06.2026.');
    await page.locator('#allergies').fill('nema');
    await page.locator('#patientOrigin').fill('Ambulanta');
    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    const outpatientWrite = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites
        .filter(item => item.op === 'addDoc' && item.collection === 'patients')
        .find(item => item.payload?.data?.fullName === 'Ambulanta Mode Testic') || null;
    });
    expect(outpatientWrite).toBeTruthy();
    expect(outpatientWrite.payload.patientMode).toBe('outpatient');
    expect(outpatientWrite.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(outpatientWrite.payload.wardId).toBe('infektologija');
    expect(outpatientWrite.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
    expect(outpatientWrite.payload.patientKey).toBe('patient-v1|outpatient|ambulanta mode testic|1988|2026-06-20');
    expect(outpatientWrite.payload.data.patientMode).toBe('outpatient');
    expect(outpatientWrite.payload.data.therapy).toBe('Amlodipin 5 mg 1,0,0 tbl');
    expect(outpatientWrite.payload.data.showTherapyOnList).toBe(true);

    await page.locator('#openFirebasePatientDialogBtn').click();
    const dialog = page.locator('#firebasePatientDialog');
    await expect(dialog).toBeVisible();
    const patientListQuery = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeEvents
        .filter(item => item.op === 'getDocs' && item.collection === 'patients')
        .find(item => (item.filters || []).some(([field, operator, value]) => field === 'accessModel' && operator === '==' && value === 'organization-ward-role-v1')) || null;
    });
    expect(patientListQuery).toBeTruthy();
    expect(patientListQuery.filters).toEqual(expect.arrayContaining([
      ['accessModel', '==', 'organization-ward-role-v1'],
      ['organizationId', '==', 'temperaturna-lista-dev'],
      ['wardId', '==', 'infektologija'],
      ['clinicalPartitionKey', '==', 'clinical-v1|temperaturna-lista-dev|infektologija']
    ]));
    await expect(page.locator('#firebasePatientDialogOutpatientModeBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#firebasePatientDialogList')).toContainText('Ambulanta Mode Testic');
    await page.locator('#firebasePatientDialogWardModeBtn').click();
    await expect(page.locator('#firebasePatientDialogWardModeBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#firebasePatientDialogList')).not.toContainText('Ambulanta Mode Testic');
    await page.locator('#firebasePatientDialogOutpatientModeBtn').click();
    await expect(page.locator('#firebasePatientDialogList')).toContainText('Ambulanta Mode Testic');
    await page.locator('#firebasePatientDialogCloseBtn').click();

    page.once('dialog', async (confirmDialog) => {
      expect(confirmDialog.type()).toBe('confirm');
      expect(confirmDialog.message()).toContain('pretvoriti');
      await confirmDialog.accept();
    });
    await page.locator('#patientModeWardBtn').click();
    await expect(page.locator('#patientModeWardBtn')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-collapsible-field="therapy"]')).toBeVisible();
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    const modeCounts = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const patientWrites = client.__smokeWrites
        .filter(item => ['addDoc', 'setDoc'].includes(item.op) && item.collection === 'patients')
        .filter(item => item.payload?.data?.fullName === 'Ambulanta Mode Testic');
      const patientAdds = patientWrites.filter(item => item.op === 'addDoc');
      const patientUpdates = patientWrites.filter(item => item.op === 'setDoc');
      const activeDocs = Array.from(client.__smokeDocs.entries())
        .filter(([key, payload]) => key.startsWith('patients/') && payload?.data?.fullName === 'Ambulanta Mode Testic')
        .filter(([, payload]) => payload?.status !== 'deleted');
      return {
        addCount: patientAdds.length,
        updateCount: patientUpdates.length,
        writeIds: patientWrites.map(item => item.id),
        modes: patientWrites.map(item => item.payload?.patientMode),
        keys: patientWrites.map(item => item.payload?.patientKey),
        activeDocCount: activeDocs.length,
        docModes: activeDocs.map(([, payload]) => payload.patientMode)
      };
    });
    expect(modeCounts.addCount).toBe(1);
    expect(modeCounts.updateCount).toBeGreaterThanOrEqual(1);
    expect(new Set(modeCounts.writeIds).size).toBe(1);
    expect(modeCounts.modes).toEqual(expect.arrayContaining(['outpatient', 'ward']));
    expect(modeCounts.keys).toEqual(expect.arrayContaining([
      'patient-v1|outpatient|ambulanta mode testic|1988|2026-06-20',
      'patient-v1|ward|ambulanta mode testic|1988|2026-06-20'
    ]));
    expect(modeCounts.activeDocCount).toBe(1);
    expect(modeCounts.docModes).toEqual(['ward']);

    browserSignals.assertCleanBrowserSignals();
  });

  test('starts a new top entry after offering Firebase save', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

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
    expect(write.payload.patientMode).toBe('ward');
    expect(write.payload.data.patientMode).toBe('ward');
    expect(write.payload.data.fullName).toBe('Novi Unos Testic');
    expect(write.payload.data.birthYear).toBe('1974');
    expect(write.payload.data.admissionDate).toBe('2026-06-16');
    expect(write.payload.data.diagnosis).toContain('Dijagnoza prije novog unosa');
    expect(write.payload.data.therapy).toContain('ceftriakson');

    browserSignals.assertCleanBrowserSignals();
  });

  test('blocks Firebase save and warns before clearing unnamed patient', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=unnamed-patient-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    await page.locator('#birthYear').fill('1979');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Dijagnoza bez imena.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');

    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent neće biti spremljen jer nema imena/i);
    await expect(page.locator('#fullName')).toBeFocused();

    let patientWrites = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.filter(item => item.collection === 'patients');
    });
    expect(patientWrites).toHaveLength(0);

    const dialogs = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    await page.locator('#newPatientEntryBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/nije spremljen jer nema imena/i);
    await expect(page.locator('#birthYear')).toHaveValue('');
    await expect(page.locator('#diagnosis')).toHaveValue('');
    await expect(page.locator('#therapy')).toHaveValue('');

    patientWrites = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.filter(item => item.collection === 'patients');
    });
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].type).toBe('confirm');
    expect(dialogs[0].message).toContain('Pacijent neće biti spremljen jer nema imena');
    expect(patientWrites).toHaveLength(0);

    browserSignals.assertCleanBrowserSignals();
  });

  test('updates an existing Firebase patient instead of creating a duplicate', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    const saveButton = page.locator('#savePatientTopBtn');

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
    expect(result.lastPayload.patientKey).toBe('patient-v1|ward|duplikat testic|1978|2026-06-16');
    expect(result.lastPayload.patientMode).toBe('ward');
    expect(result.lastPayload.data.patientMode).toBe('ward');
    expect(result.lastPayload.data.diagnosis).toContain('Ažurirana dijagnoza');
    expect(result.lastPayload.data.therapy).toContain('pantoprazol');

    browserSignals.assertCleanBrowserSignals();
  });

  test('detects a remote Firebase update before saving over another user version', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=firebase-conflict-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await page.locator('#fullName').fill('Konflikt Testic');
    await page.locator('#birthYear').fill('1970');
    await page.locator('#admissionDate').fill('18.06.2026.');
    await page.locator('#diagnosis').fill('Lokalna bazna dijagnoza.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    const savedId = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites.find(item => item.op === 'addDoc' && item.collection === 'patients')?.id || '';
    });
    expect(savedId).toBeTruthy();

    await page.evaluate((id) => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const key = `patients/${id}`;
      const current = client.__smokeDocs.get(key);
      client.__smokeDocs.set(key, {
        ...current,
        version: Number(current.version || 1) + 1,
        updatedAt: '2026-06-18T12:00:00.000Z',
        updatedByUid: 'remote-user-uid',
        updatedByEmail: 'remote@example.test',
        data: {
          ...current.data,
          diagnosis: 'Udaljena izmjena koju lokalni korisnik ne smije pregaziti.'
        }
      });
      window.__TEMPERATURNA_LISTA_CONFLICT_RESOLUTION__ = 'cancel';
    }, savedId);

    await page.locator('#therapy').fill('ceftriakson 2 g iv.\npantoprazol 40 mg iv.');
    const writesBeforeConflictSave = await page.evaluate(() => window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__.__smokeWrites.length);
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/novija verzija pacijenta/i);

    const conflictResult = await page.evaluate((id) => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const patientWritesAfterFirstSave = client.__smokeWrites
        .filter(item => item.collection === 'patients' && item.id === id);
      const auditTypes = client.__smokeWrites
        .filter(item => item.collection === 'patientAuditEvents')
        .map(item => item.payload?.eventType);
      return {
        patientWritesAfterFirstSave,
        auditTypes,
        remoteDiagnosis: client.__smokeDocs.get(`patients/${id}`)?.data?.diagnosis || ''
      };
    }, savedId);

    expect(conflictResult.patientWritesAfterFirstSave.filter(item => item.op === 'setDoc')).toHaveLength(0);
    expect(conflictResult.auditTypes).toContain('patient.conflictDetected');
    expect(conflictResult.remoteDiagnosis).toContain('Udaljena izmjena');

    await page.evaluate(() => {
      window.__TEMPERATURNA_LISTA_CONFLICT_RESOLUTION__ = 'save-copy';
    });
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/spremljen u Firebase/i);

    const copyResult = await page.evaluate((writesBefore) => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const laterWrites = client.__smokeWrites.slice(writesBefore);
      return {
        copyAdd: laterWrites.find(item => item.op === 'addDoc' && item.collection === 'patients') || null,
        auditTypes: laterWrites
          .filter(item => item.collection === 'patientAuditEvents')
          .map(item => item.payload?.eventType)
      };
    }, writesBeforeConflictSave);
    expect(copyResult.copyAdd).toBeTruthy();
    expect(copyResult.copyAdd.payload.version).toBe(1);
    expect(copyResult.auditTypes).toContain('patient.conflictSavedAsCopy');

    browserSignals.assertCleanBrowserSignals();
  });

  test('renames, archives and restores Firebase patients from the open patient dialog', async ({ page }) => {
    await installFirebaseSmokeClient(page, { roles: ['clinician', 'admin'] });
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    await page.locator('#fullName').fill('Baza Akcija Testic');
    await page.locator('#birthYear').fill('1982');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Test upravljanja Firebase pacijentima.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');
    await page.locator('#savePatientTopBtn').click();
    await expect(page.locator('#statusBar')).toContainText(/Pacijent je spremljen u Firebase/i);

    await page.locator('#openFirebasePatientDialogBtn').click();
    const dialog = page.locator('#firebasePatientDialog');
    const list = page.locator('#firebasePatientDialogList');
    await expect(dialog).toBeVisible();
    const savedRow = list.locator('.firebase-patient-row').filter({ hasText: 'Baza Akcija Testic' }).first();
    await expect(savedRow).toBeVisible();
    await expect(savedRow.locator('[data-firebase-patient-action="rename"]')).toBeVisible();
    await expect(savedRow.locator('[data-firebase-patient-action="archive"]')).toBeVisible();

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
      expect(confirmDialog.message()).toContain('ostaje u Firebaseu i revizijskom tragu');
      await confirmDialog.accept();
    });
    await renamedRow.locator('[data-firebase-patient-action="archive"]').click();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/arhiviran/i);
    await expect(list.locator('.firebase-patient-row')).toHaveCount(0);

    await expect(page.locator('#firebasePatientShowArchivedFilter')).toBeVisible();
    await page.locator('#firebasePatientShowArchivedToggle').check();
    const archivedRow = list.locator('.firebase-patient-row').filter({ hasText: 'Baza Uredena Testic' }).first();
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow).toHaveClass(/is-archived/);
    await expect(archivedRow.locator('[data-firebase-patient-action="restore"]')).toBeVisible();

    page.once('dialog', async (restoreDialog) => {
      expect(restoreDialog.type()).toBe('confirm');
      expect(restoreDialog.message()).toContain('Vratiti arhiviranog pacijenta');
      await restoreDialog.accept();
    });
    await archivedRow.locator('[data-firebase-patient-action="restore"]').click();
    await expect(page.locator('#firebasePatientDialogStatus')).toContainText(/vraćen|vracen/i);
    await page.locator('#firebasePatientShowArchivedToggle').uncheck();
    await expect(list).toContainText('Baza Uredena Testic');

    const result = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const writes = client.__smokeWrites.filter(item => item.collection === 'patients');
      const renameWrite = writes
        .slice()
        .reverse()
        .find(item => item.op === 'setDoc' && item.payload?.lastSaveTrigger === 'rename') || null;
      const archiveWrite = writes
        .slice()
        .reverse()
        .find(item => item.op === 'setDoc' && item.payload?.status === 'deleted') || null;
      const restoreWrite = writes
        .slice()
        .reverse()
        .find(item => item.op === 'setDoc' && item.payload?.lastSaveTrigger === 'restore') || null;
      const auditTypes = client.__smokeWrites
        .filter(item => item.collection === 'patientAuditEvents')
        .map(item => item.payload?.eventType);
      return {
        renameWrite,
        archiveWrite,
        restoreWrite,
        auditTypes,
        deleteCount: writes.filter(item => item.op === 'deleteDoc').length,
        remainingDocs: Array.from(client.__smokeDocs.keys()).filter(key => key.startsWith('patients/')).length
      };
    });

    expect(result.renameWrite).toBeTruthy();
    expect(result.renameWrite.payload.label).toContain('Baza Uredena Testic');
    expect(result.renameWrite.payload.data.fullName).toBe('Baza Uredena Testic');
    expect(result.renameWrite.payload.patientKey).toBe('patient-v1|ward|baza uredena testic|1982|2026-06-16');
    expect(result.renameWrite.payload.patientMode).toBe('ward');
    expect(result.renameWrite.payload.organizationId).toBe('temperaturna-lista-dev');
    expect(result.renameWrite.payload.wardId).toBe('infektologija');
    expect(result.renameWrite.payload.clinicalPartitionKey).toBe('clinical-v1|temperaturna-lista-dev|infektologija');
    expect(result.archiveWrite).toBeTruthy();
    expect(result.archiveWrite.payload.status).toBe('deleted');
    expect(result.archiveWrite.payload.deletedByUid).toBe('smoke-user-uid');
    expect(result.archiveWrite.payload.deletedByEmail).toBe('smoke.firebase@example.test');
    expect(result.archiveWrite.payload.deleteReason).toContain('arhivirano');
    expect(result.restoreWrite).toBeTruthy();
    expect(result.restoreWrite.payload.status).toBe('active');
    expect(result.auditTypes).toEqual(expect.arrayContaining([
      'patient.create',
      'patient.rename',
      'patient.softDelete',
      'patient.restore'
    ]));
    expect(result.deleteCount).toBe(0);
    expect(result.remainingDocs).toBe(1);

    browserSignals.assertCleanBrowserSignals();
  });

  test('keeps patient data and explains Firebase save failure before new entry', async ({ page }) => {
    await installFirebaseSmokeClient(page, { failWritesWithPermissionDenied: true });
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

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
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

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
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(1);
    await expect(page.locator('#patientSyncStatus')).toHaveAttribute('data-sync-state', 'synced');

    const result = await page.evaluate(() => {
      const events = window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ || [];
      const printIndex = events.findIndex(item => item.op === 'print');
      const writeBeforePrint = events
        .slice(0, printIndex)
        .reverse()
        .find(item => ['addDoc', 'setDoc'].includes(item.op) && item.collection === 'patients') || null;
      const auditPrint = events
        .filter(item => item.op === 'addDoc' && item.collection === 'patientAuditEvents')
        .find(item => item.payload?.eventType === 'patient.print') || null;
      const pageVersion = document.title.match(/offline\s+(.+)$/)?.[1] || '';
      return { printIndex, writeBeforePrint, auditPrint, pageVersion };
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
    expect(result.auditPrint).toBeTruthy();
    expect(result.auditPrint.payload.patientDocId).toBe(result.writeBeforePrint.id);
    expect(result.auditPrint.payload.eventType).toBe('patient.print');

    browserSignals.assertCleanBrowserSignals();
  });

  test('blocks print after Firebase save failure until the user confirms', async ({ page }) => {
    await installFirebaseSmokeClient(page, { failPatientWritesWithPermissionDenied: true });
    const browserSignals = await openApp(page, './?qa=firebase-save-smoke&firebaseSmoke=1');

    await expect(page.locator('#firebaseLoginGate')).toBeHidden();
    await expect(page.locator('#firebasePatientAuthStatus')).toContainText(/Smoke Firebase User.*Infektologija/i);

    await page.locator('#fullName').fill('Print Failure Testic');
    await page.locator('#birthYear').fill('1982');
    await page.locator('#admissionDate').fill('16.06.2026.');
    await page.locator('#diagnosis').fill('Print failure smoke dijagnoza.');
    await page.locator('#therapy').fill('paracetamol 1 g p.o.');

    const printButton = page.locator('#printBtn');
    await printButton.click();

    const confirmDialog = page.locator('#printConfirmDialog');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.locator('#printConfirmDialogTitle')).toContainText(/Lista nije sinkronizirana/i);
    await expect(confirmDialog.locator('#printConfirmDialogDescription')).toContainText(/Firebase pravila.*ne dopu/i);
    await expect(confirmDialog.locator('#printConfirmDialogDescription')).toContainText(/lokalna kopija/i);
    await expect(confirmDialog.locator('[data-print-confirm-action="proceed"]')).toContainText(/Ispiši lokalnu kopiju/i);
    await expect(page.locator('#patientSyncStatus')).toHaveAttribute('data-sync-state', 'failed');
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
    await expect(page.locator('#statusBar')).toContainText(/Ispis je otvoren nakon izričite potvrde lokalne kopije/i);
    await expect(page.locator('#fullName')).toHaveValue('Print Failure Testic');

    const auditTypes = await page.evaluate(() => {
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      return client.__smokeWrites
        .filter(item => item.collection === 'patientAuditEvents')
        .map(item => item.payload?.eventType);
    });
    expect(auditTypes).toEqual(expect.arrayContaining([
      'patient.saveFailed',
      'patient.printWithoutSync',
      'patient.print'
    ]));

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
    expect(dialogs[0].message).toContain('Parser testovi smiju sadržavati samo sintetske ili anonimizirane podatke');
    expect(capture.source).toBe('ctrl-alt-p');
    expect(capture.raw).toContain('TEST PACIJENT');
    expect(capture.expected.fullName).toBe('TEST PACIJENT');
    expect(capture.expected.birthYear).toBe('1970');
    expect(capture.expected.admissionDate).toBe('2026-01-01');
    expect(capture.currentData.fullName).toBe('TEST PACIJENT');
    expect(capture.currentData.birthYear).toBe('1970');
    expect(capture.privacyStatus).toMatch(/anonymized|synthetic/);
    expect(capture.sanitizerVersion).toBe('parser-test-sanitizer-v1');
    expect(capture.parserWarningsAtCapture).toEqual(expect.any(Array));
    await expect(page.locator('#statusBar')).toContainText(/Parser test spremljen privremeno u ovoj sesiji/i);
    await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), PARSER_TEST_STORAGE_KEY)).toBeNull();

    browserSignals.assertCleanBrowserSignals();
  });

  test('anonymizes risky parser test capture data before local or Firebase storage', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    const browserSignals = await openApp(page, './?qa=parser-privacy-smoke&firebaseSmoke=1');

    await page.locator('#ohbpPasteBox').fill([
      'Pacijent: Ivan Horvat, roden 12.03.1975.',
      'OIB: 12345678901, MBO: 123456789',
      'Kontakt: ivan.horvat@example.com, 091 234 5678',
      'Adresa: Ulica Testna 12',
      'Dg: Pneumonija.',
      'Th: ceftriakson 2 g iv.'
    ].join('\n'));
    await page.locator('#fullName').fill('Ivan Horvat');
    await page.locator('#birthYear').fill('1975');
    await page.locator('#admissionDate').fill('12.03.2026.');
    await page.locator('#diagnosis').fill('Pneumonija.');
    await page.locator('#therapy').fill('ceftriakson 2 g iv.');

    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        await dialog.accept();
      } else if (dialog.type() === 'prompt') {
        await dialog.accept('Test anonimizacije parser capturea.');
      } else {
        await dialog.dismiss();
      }
    });

    await page.keyboard.press('Control+Alt+P');
    await expect(page.locator('#statusBar')).toContainText(/Parser test spremljen/i);

    const saved = await page.evaluate(() => {
      const localCase = window.TemperaturnaListaParserTests.exportLocal()[0];
      const client = window.__TEMPERATURNA_LISTA_FIREBASE_SMOKE_CLIENT__;
      const firebaseWrite = client.__smokeWrites
        .filter(item => item.op === 'addDoc' && item.collection === 'parserTestCases')
        .at(-1) || null;
      return {
        localCase,
        firebasePayload: firebaseWrite?.payload || null,
        serializedLocal: JSON.stringify(localCase),
        serializedFirebase: JSON.stringify(firebaseWrite?.payload || {})
      };
    });

    expect(saved.localCase.privacyStatus).toBe('anonymized');
    expect(saved.localCase.removedSensitiveFieldsCount).toBeGreaterThan(0);
    expect(saved.firebasePayload.privacyStatus).toBe('anonymized');
    expect(saved.firebasePayload.sanitizerVersion).toBe('parser-test-sanitizer-v1');
    for (const serialized of [saved.serializedLocal, saved.serializedFirebase]) {
      expect(serialized).not.toContain('Ivan Horvat');
      expect(serialized).not.toContain('12345678901');
      expect(serialized).not.toContain('ivan.horvat@example.com');
      expect(serialized).not.toContain('091 234 5678');
      expect(serialized).not.toContain('Ulica Testna');
    }
    await expectBrowserStorageNotToContain(page, [
      'Ivan Horvat',
      '12345678901',
      'ivan.horvat@example.com',
      '091 234 5678',
      'Ulica Testna'
    ]);

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
    const rememberedTherapyLine = await page.locator('#therapy').inputValue();
    await page.locator('#therapy').fill(rememberedTherapyLine);
    await expect(page.locator('#therapyAutocompleteBox .therapy-autocomplete-option.is-save-custom')).toHaveCount(0);
    await expect(page.locator('#therapyAutocompleteBox')).toBeHidden();

    browserSignals.assertCleanBrowserSignals();
  });

  test('builds ClinicalRecordV1, medication safety warnings and a basic FHIR Bundle', async ({ page }) => {
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    await page.locator('#fullName').fill('Clinical Model Testic');
    await page.locator('#birthYear').fill('1960');
    await page.locator('#admissionDate').fill('19.06.2026.');
    await page.locator('#diagnosis').fill('Pneumonija.');
    await page.locator('#allergies').fill('levofloksacin');
    await page.locator('#therapy').fill([
      'ceftriakson 2 g iv.',
      'ceftriakson 2 g iv.',
      'levofloksacin 500 mg p.o.'
    ].join('\n'));
    await page.evaluate(() => {
      const setValue = (id, value) => {
        const element = document.getElementById(id);
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('vitalSigns', 'T 38.4, RR 135/85, puls 96, SpO2 93%');
      setValue('labRaw', 'eGFR 45, CRP 120, L 13.2');
    });

    const result = await page.evaluate(() => {
      const record = window.TemperaturnaListaClinical.fromCurrentForm();
      const validation = window.TemperaturnaListaClinical.validateClinicalRecord(record);
      const safety = window.TemperaturnaListaClinical.runMedicationSafetyChecks(record);
      const bundle = window.TemperaturnaListaClinical.clinicalRecordToFhirBundle(record);
      const bundleValidation = window.TemperaturnaListaClinical.validateBasicFhirBundle(bundle);
      const suggestions = window.TemperaturnaListaClinical.getMedicationAutocompleteSuggestions('Amlod');
      return { record, validation, safety, bundle, bundleValidation, suggestions };
    });

    expect(result.record.schema).toBe('temperaturna-lista-clinical-record-v1');
    expect(result.record.patient.fullName).toBe('Clinical Model Testic');
    expect(result.record.conditions[0].text).toContain('Pneumonija');
    expect(result.record.allergies[0].substance).toContain('levofloksacin');
    expect(result.record.medications).toHaveLength(3);
    expect(result.record.vitalSigns[0].temperatureC).toBeCloseTo(38.4);
    expect(result.record.labs.map(item => item.analyte)).toEqual(expect.arrayContaining(['eGFR', 'CRP']));
    expect(result.validation.ok).toBe(true);
    expect(result.safety.issues.map(issue => issue.metadata?.type)).toEqual(expect.arrayContaining([
      'duplicate',
      'allergy-match',
      'ams-review',
      'renal'
    ]));
    expect(result.bundle.resourceType).toBe('Bundle');
    expect(result.bundleValidation.ok).toBe(true);
    expect(result.bundle.entry.map(entry => entry.resource.resourceType)).toEqual(expect.arrayContaining([
      'Patient',
      'Encounter',
      'Condition',
      'MedicationStatement',
      'Observation'
    ]));
    expect(JSON.stringify(result.suggestions)).toContain('Amlodipin');

    await page.locator('#therapy').fill('ceftriakson 2 g iv.\nceftriakson 2 g iv.');
    await page.evaluate(() => window.TemperaturnaListaClinical.validateCurrentTherapy());
    await expect(page.locator('#medicationAutocompleteDisclaimer')).toContainText(/Ne provjerava dozu, interakcije, alergije/i);
    await expect(page.locator('#medicationSafetyPanel')).toContainText(/Osnovna provjera terapije/i);
    await expect(page.locator('#medicationSafetySummary')).toContainText(/upozorenja/i);
    await expect(page.locator('#medicationSafetyPanel')).not.toContainText(/sigurna/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves and deletes a custom chronic therapy suggestion without touching the embedded medicine database', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1');
    });
    const browserSignals = await openApp(page);
    await continueWithoutFirebase(page);

    const therapyBox = page.locator('#therapyAutocompleteBox');
    await page.locator('#therapy').fill('Zzzcustomol 7 mg 1,0,0 tbl');
    const saveOption = therapyBox.locator('.therapy-autocomplete-option.is-save-custom');
    await expect(saveOption).toBeVisible();
    await expect(saveOption).toContainText(/Spremi moj unos/i);
    await expect(saveOption).toContainText(/Zzzcustomol 7 mg 1,0,0 tbl/i);
    await continueWithoutFirebaseIfVisible(page);
    await saveOption.click();

    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1'))).toBeNull();

    await page.locator('#therapy').fill('Zzzcustomol 7 mg 1,0,0 tbl');
    await expect(therapyBox.locator('.therapy-autocomplete-option.is-save-custom')).toHaveCount(0);
    await expect(therapyBox).toBeHidden();

    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');
    const amlodipinSaveOption = therapyBox.locator('.therapy-autocomplete-option.is-save-custom');
    await expect(amlodipinSaveOption).toBeVisible();
    await expect(amlodipinSaveOption).toContainText(/Spremi moj unos/i);
    await continueWithoutFirebaseIfVisible(page);
    await amlodipinSaveOption.click();

    await page.locator('#therapy').fill('amlodipin 5 mg 1,0,0 tbl');
    await expect(therapyBox.locator('.therapy-autocomplete-option.is-save-custom')).toHaveCount(0);
    await expect(therapyBox).toBeHidden();

    await page.locator('#therapy').fill('Zzz');
    await expect(therapyBox).toBeVisible();
    await expect(therapyBox).toContainText(/Zzzcustomol 7 mg 1,0,0 tbl/i);
    await expect(therapyBox).toContainText(/moj spremljeni prijedlog/i);
    await scrollFieldOutOfAutocompleteView(page, '#therapy');
    await expect(therapyBox).toBeHidden();

    await page.locator('#therapy').scrollIntoViewIfNeeded();
    await page.locator('#therapy').fill('Zzz');
    await expect(therapyBox).toBeVisible();
    await expect(therapyBox).toContainText(/Zzzcustomol 7 mg 1,0,0 tbl/i);
    const deleteButton = therapyBox.locator('[data-therapy-autocomplete-delete]');
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toHaveText(/Obri/i);
    await continueWithoutFirebaseIfVisible(page);
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Jeste li sigurni da želite obrisati spremljenu terapiju');
      expect(dialog.message()).toContain('Zzzcustomol 7 mg 1,0,0 tbl');
      await dialog.dismiss();
    });
    await deleteButton.click();
    await expect(therapyBox).toBeVisible();
    await expect(therapyBox).toContainText(/Zzzcustomol 7 mg 1,0,0 tbl/i);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1'))).toBeNull();

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Jeste li sigurni da želite obrisati spremljenu terapiju');
      expect(dialog.message()).toContain('Zzzcustomol 7 mg 1,0,0 tbl');
      await dialog.accept();
    });
    await deleteButton.click();
    await expect(page.locator('#statusBar')).toContainText(/Obrisan je lokalni prijedlog/i);
    await expect(therapyBox).toBeHidden();
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_kronicna_terapija_autocomplete_ucestalost_v1'))).toBeNull();
    await expect(page.locator('#therapyCsvStatus')).toContainText(/Baza lijekova OK/i);

    browserSignals.assertCleanBrowserSignals();
  });

  test('saves and deletes a custom diagnosis suggestion from the side flyout', async ({ page, isMobile }) => {
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
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1'))).toBeNull();

    await page.locator('#diagnosis').fill('Ur');
    await expect(diagnosisBox).toBeVisible();
    await expect(diagnosisBox).toContainText(/Uro/i);
    await expect(diagnosisBox).toContainText(/moj spremljeni prijedlog/i);
    const deleteButton = diagnosisBox.locator('[data-diagnosis-autocomplete-delete]');
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toHaveText(/Obri/i);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message().toLowerCase()).toContain('obrisati spremljenu dijagnozu');
      expect(dialog.message()).toContain('Uro');
      await dialog.dismiss();
    });
    await deleteButton.click();
    await expect(diagnosisBox).toBeVisible();
    await expect(diagnosisBox).toContainText(/Uro/i);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1'))).toBeNull();

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message().toLowerCase()).toContain('obrisati spremljenu dijagnozu');
      expect(dialog.message()).toContain('Uro');
      await dialog.accept();
    });
    await deleteButton.click();
    await expect(page.locator('#statusBar')).toContainText(/Obrisan je lokalni prijedlog dijagnoze/i);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('temperaturna_lista_dijagnoze_autocomplete_ucestalost_v1'))).toBeNull();

    await page.locator('#diagnosis').fill('Ur');
    await expect(diagnosisBox).not.toContainText(/moj spremljeni prijedlog/i);
    await scrollFieldOutOfAutocompleteView(page, '#diagnosis');
    await expect(diagnosisBox).toBeHidden();

    browserSignals.assertCleanBrowserSignals();
  });

  test('navigates preview page pairs and prints only the active pair', async ({ page }) => {
    await installFirebaseSmokeClient(page);
    await page.addInitScript(() => {
      window.__TL_CANVAS_TEXT__ = [];
      const originalFillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function patchedFillText(text, ...args) {
        window.__TL_CANVAS_TEXT__.push(String(text || ''));
        return originalFillText.call(this, text, ...args);
      };
    });
    const browserSignals = await openApp(page, './?qa=page-pair-print-smoke&firebaseSmoke=1');

    await page.locator('#fullName').fill('Nastavak Testic');
    await page.locator('#birthYear').fill('1960');
    await page.locator('#admissionDate').fill('15.06.2026.');
    await page.locator('#diagnosis').fill('Kontrola nastavka terapijske liste.');
    await page.locator('#therapy').fill('Amlodipin 5 mg 1,0,0 tbl');
    await page.evaluate(() => { window.__TL_CANVAS_TEXT__ = []; });

    const controls = page.locator('#previewPageControls');
    const previousPair = controls.locator('#previewPrevPagePairBtn');
    const nextPair = controls.locator('#previewNextPagePairBtn');
    const firstSlot = controls.locator('#previewPageSlot1Btn');
    const secondSlot = controls.locator('#previewPageSlot2Btn');

    await expect(page.locator('[data-preview-list-tabs]')).toHaveCount(0);
    await expect(previousPair).toBeDisabled();
    await expect(firstSlot).toHaveText('Stranica 1');
    await expect(secondSlot).toHaveText('Stranica 2');
    await expect(firstSlot).toHaveClass(/is-active/);

    await secondSlot.click();
    await expect(secondSlot).toHaveClass(/is-active/);
    const slot2ViewState = await page.evaluate(() => {
      const controls = document.querySelector('#previewPageControls');
      const controlsRow = controls?.closest('.preview-title-row');
      const page2Card = document.querySelector('#shell2')?.closest('.page-card');
      const controlsRect = controlsRow?.getBoundingClientRect();
      const page2Rect = page2Card?.getBoundingClientRect();
      return {
        controlsVisible: Boolean(
          controlsRect &&
          controlsRect.top >= 0 &&
          controlsRect.bottom <= window.innerHeight &&
          controlsRect.width > 0 &&
          controlsRect.height > 0
        ),
        page2VisibleNearTop: Boolean(
          page2Rect &&
          page2Rect.top >= 0 &&
          page2Rect.top < window.innerHeight * 0.65
        ),
        controlsStayAbovePage2: Boolean(
          controlsRect &&
          page2Rect &&
          controlsRect.bottom <= page2Rect.top + 8
        )
      };
    });
    expect(slot2ViewState.controlsVisible).toBe(true);
    expect(slot2ViewState.page2VisibleNearTop).toBe(true);
    expect(slot2ViewState.controlsStayAbovePage2).toBe(true);

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message().toLowerCase()).toContain('terapij');
      await dialog.accept();
    });
    await nextPair.click();

    await expect(previousPair).toBeEnabled();
    await expect(firstSlot).toHaveText('Stranica 3');
    await expect(secondSlot).toHaveText('Stranica 4');
    await expect(firstSlot).toHaveClass(/is-active/);
    await expect(page.locator('#page1Title')).toContainText(/Stranica 3/);
    await expect(page.locator('#page1Title')).toContainText(/29\.06\.-05\.07\./);
    await expect(page.locator('#page2Title')).toContainText(/Stranica 4/);
    await expect(page.locator('#page2Title')).toContainText(/06\.07\.-12\.07\./);
    await expect(page.locator('#shell1').locator('xpath=..')).toHaveClass(/is-preview-selected/);
    await expect(page.locator('#shell2').locator('xpath=..')).toHaveClass(/is-preview-selected/);
    await expect(page.locator('body')).not.toHaveClass(/preview-continuation-print-mode/);

    await expect.poll(async () => page.evaluate(() => {
      const text = (window.__TL_CANVAS_TEXT__ || []).join('\n');
      return text.includes('29.06.') && text.includes('06.07.') && text.includes('Amlodipin 5 mg 1,0,0 tbl');
    })).toBe(true);

    await secondSlot.click();
    await expect(secondSlot).toHaveClass(/is-active/);

    await page.locator('#printBtn').click();
    const printConfirmDialog = page.locator('#printConfirmDialog');
    if (await printConfirmDialog.isVisible().catch(() => false)) {
      await printConfirmDialog.locator('[data-print-confirm-action="proceed"]').click();
    }
    await expect.poll(async () => page.evaluate(() => window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0)).toBe(1);
    const printEvent = await page.evaluate(() => {
      const events = window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__ || [];
      return events.filter(item => item.op === 'print').at(-1) || null;
    });
    expect(printEvent).toBeTruthy();
    expect(printEvent.pageCount).toBe(2);
    const printFrameLayout = await page.evaluate(() => {
      const frame = document.querySelector('#print-frame');
      const doc = frame?.contentDocument || null;
      const win = frame?.contentWindow || null;
      const pageNode = doc?.querySelector('.page') || null;
      const imageNode = doc?.querySelector('.page img') || null;
      const pageStyle = pageNode && win ? win.getComputedStyle(pageNode) : null;
      const imageStyle = imageNode && win ? win.getComputedStyle(imageNode) : null;
      return {
        styleText: Array.from(doc?.querySelectorAll('style') || []).map(style => style.textContent || '').join('\n'),
        pageCount: doc?.querySelectorAll('.page').length || 0,
        pageWidthPx: pageStyle ? Number.parseFloat(pageStyle.width) : 0,
        pageHeightPx: pageStyle ? Number.parseFloat(pageStyle.height) : 0,
        imageWidthPx: imageStyle ? Number.parseFloat(imageStyle.width) : 0,
        imageHeightPx: imageStyle ? Number.parseFloat(imageStyle.height) : 0,
        imageNaturalWidth: imageNode?.naturalWidth || 0,
        imageNaturalHeight: imageNode?.naturalHeight || 0,
        imageObjectFit: imageStyle?.objectFit || ''
      };
    });
    expect(printFrameLayout.pageCount).toBe(2);
    expect(printFrameLayout.styleText).toContain('size: A4 landscape');
    expect(printFrameLayout.styleText).toContain('object-fit: contain');
    expect(printFrameLayout.imageNaturalWidth).toBeGreaterThan(3000);
    expect(printFrameLayout.imageNaturalHeight).toBeGreaterThan(2000);
    expect(printFrameLayout.pageWidthPx).toBeGreaterThan(1000);
    expect(printFrameLayout.pageWidthPx).toBeLessThan(1300);
    expect(printFrameLayout.pageHeightPx).toBeGreaterThan(700);
    expect(printFrameLayout.pageHeightPx).toBeLessThan(900);
    expect(printFrameLayout.imageWidthPx).toBeLessThan(1300);
    expect(printFrameLayout.imageHeightPx).toBeLessThan(900);
    expect(printFrameLayout.imageObjectFit).toBe('contain');

    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await nextPair.click();
    await expect(firstSlot).toHaveText('Stranica 5');
    await expect(secondSlot).toHaveText('Stranica 6');
    await expect(page.locator('#page1Title')).toContainText(/Stranica 5/);
    await expect(page.locator('#page2Title')).toContainText(/Stranica 6/);

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
