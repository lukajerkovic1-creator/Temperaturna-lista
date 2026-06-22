const { expect } = require('@playwright/test');

const FIREBASE_LOGIN_GATE_SESSION_KEY = 'temperaturna_lista_firebase_login_gate_dismissed_v1';

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

async function installConsoleAndNetworkGuards(page) {
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

  return {
    assertCleanBrowserSignals() {
      expect(consoleProblems, 'No console errors or page errors').toEqual([]);
      expect(failedRequests, 'No unexpected failed network requests').toEqual([]);
    },
    consoleProblems,
    failedRequests,
  };
}

async function markFirebaseLoginGateDismissed(page) {
  await page.evaluate((key) => {
    sessionStorage.setItem(key, 'true');
  }, FIREBASE_LOGIN_GATE_SESSION_KEY).catch(() => {});
}

async function closeFirebaseGateIfVisible(page, timeout = 3000) {
  await markFirebaseLoginGateDismissed(page);
  const gate = page.locator('#firebaseLoginGate');
  const visible = await gate.isVisible({ timeout }).catch(() => false);
  if (!visible) return false;

  await page.evaluate(() => {
    window.__TEMPERATURNA_LISTA_TEST_DISMISS_FIREBASE_LOGIN_GATE__?.();
  });
  await expect(gate).toBeHidden({ timeout: 5000 });
  return true;
}

async function openApp(page, path = './') {
  const browserSignals = await installConsoleAndNetworkGuards(page);
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), `App response should be OK, got ${response?.status()}`).toBe(true);
  await expect(page).toHaveTitle(/Temperaturna lista.*v\d+/);
  await expect(page.locator('h1', { hasText: 'Generator temperaturne liste' })).toBeVisible();
  await expect(page.locator('#page1Title')).toBeVisible();
  return browserSignals;
}

async function openAppWithoutFirebase(page, path = './') {
  const browserSignals = await openApp(page, path);
  await closeFirebaseGateIfVisible(page);
  return browserSignals;
}

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
      indexedDB: indexedDbRecords,
    });
  });
}

async function expectBrowserStorageNotToContain(page, forbiddenTerms) {
  const storageText = await getReadableBrowserStorageText(page);
  for (const term of forbiddenTerms) {
    expect(storageText, `Browser storage must not contain cleartext term: ${term}`).not.toContain(term);
  }
}

async function fillCorePatient(page, patient = {}) {
  await page.locator('#fullName').fill(patient.fullName || 'Quality Testic');
  await page.locator('#birthYear').fill(patient.birthYear || '1977');
  await page.locator('#admissionDate').fill(patient.admissionDate || '21.06.2026.');
  await page.locator('#diagnosis').fill(patient.diagnosis || 'Pneumonija quality test.');
  await page.locator('#therapy').fill(patient.therapy || 'ceftriakson 2 g i.v.');
  await page.locator('#allergies').fill(patient.allergies || 'penicilin');
}

module.exports = {
  FIREBASE_LOGIN_GATE_SESSION_KEY,
  closeFirebaseGateIfVisible,
  expectBrowserStorageNotToContain,
  fillCorePatient,
  getReadableBrowserStorageText,
  installConsoleAndNetworkGuards,
  openApp,
  openAppWithoutFirebase,
};
