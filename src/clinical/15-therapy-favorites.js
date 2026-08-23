// ============================================================
// MODULE: 15-therapy-favorites.js
// Explicitly managed therapy templates and two-field patient editor.
// Patient text is never learned or uploaded.
// ============================================================
  const THERAPY_FAVORITES_SCHEMA = 'temperaturna-lista-therapy-favorites-v3';
  const THERAPY_FAVORITES_SCHEMA_VERSION = 3;
  const THERAPY_PATIENT_ENTRIES_MIGRATION_VERSION = 2;
  const THERAPY_FAVORITES_MAX_ITEMS = 250;
  const THERAPY_FAVORITES_FIREBASE_DOCUMENT_ID = 'sharedTherapyFavoritesV2';
  const THERAPY_FAVORITES_FIXED_CONTINUATIONS = Object.freeze([
    '1x1 tbl', '2x1 tbl', '3x1 tbl',
    '1,0,0 tbl', '0,1,0 tbl', '0,0,1 tbl', 'p.p. tbl',
    '1x1 g i.v.', '2x1 g i.v.', '3x1 g i.v.', '4x1 g i.v.'
  ]);
  const THERAPY_FAVORITES_X_REGIMENS = Object.freeze(['1x1', '2x1', '3x1', '4x1']);
  const THERAPY_FAVORITES_COMMA_REGIMENS_PAGE_UP = Object.freeze(['0,0,1', '0,1,0', '1,0,0']);
  const THERAPY_FAVORITES_SPLIT_PATTERN = /(?:^|\s)(?=(?:\d+\s*[x×X]\s*\d+|[01]\s*,\s*[01]\s*,\s*[01]|p\s*\.?\s*p\.?|kont\.?\s*inf\.?|svakih\s+\d+\s*h\b))/i;

  function normalizeTherapyFavoriteWhitespace(value, maxLength = 340) {
    return String(value || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function normalizeTherapyMedicationName(value) {
    const clean = normalizeTherapyFavoriteWhitespace(value, 160)
      .replace(/\b(mg|mcg|ug|µg|g|ml|mmol|ij|iu)\b/gi, (unit) => unit.toLocaleLowerCase('hr-HR'));
    return clean ? capitalizeClinicalTextItem(clean) : '';
  }

  function normalizeTherapyContinuation(value) {
    return normalizeTherapyFavoriteWhitespace(value, 180)
      .replace(/\b(\d+)\s*[x×X]\s*(\d+)\b/g, '$1x$2')
      .replace(/\b([01])\s*,\s*([01])\s*,\s*([01])\b/g, '$1,$2,$3')
      .replace(/\bp\s*\.?\s*p\.?\b/gi, 'p.p.')
      .replace(/\b(tbl|kaps|caps|inh|gtt|sir|amp|inj)\b/gi, (token) => token.toLocaleLowerCase('hr-HR'))
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildTherapyFavoriteLine(entry = {}) {
    return normalizeClinicalTherapyText([
      normalizeTherapyMedicationName(entry.medicationName || entry.name || ''),
      normalizeTherapyContinuation(entry.continuation || '')
    ].filter(Boolean).join(' '));
  }

  function splitTherapyLineIntoFields(value) {
    const original = normalizeClinicalTherapyText(normalizeTherapyFavoriteWhitespace(value, 340));
    if (!original) return { medicationName: '', continuation: '', original: '', confidentlySplit: false };
    const match = THERAPY_FAVORITES_SPLIT_PATTERN.exec(original);
    if (!match) {
      return {
        medicationName: normalizeTherapyMedicationName(original),
        continuation: '',
        original,
        confidentlySplit: false
      };
    }
    const splitAt = match.index + match[0].length;
    const medicationName = normalizeTherapyMedicationName(original.slice(0, splitAt));
    const continuation = normalizeTherapyContinuation(original.slice(splitAt));
    if (!medicationName || !continuation) {
      return {
        medicationName: normalizeTherapyMedicationName(original),
        continuation: '',
        original,
        confidentlySplit: false
      };
    }
    return { medicationName, continuation, original, confidentlySplit: true };
  }

  function buildTherapyFavoriteIdentityKey(entry = {}) {
    return therapyNormalizeText(buildTherapyFavoriteLine(entry)).replace(/\s+/g, ' ').trim();
  }

  function createTherapyFavoriteId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `therapy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeTherapyFavoriteEntry(value = {}, options = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    let medicationName = normalizeTherapyMedicationName(value.medicationName || '');
    let continuation = normalizeTherapyContinuation(value.continuation || '');

    // Legacy v1 entries are accepted only here and migrated without losing source text.
    if (!medicationName && value.name) {
      medicationName = normalizeTherapyMedicationName([value.name, value.strength].filter(Boolean).join(' '));
      continuation = normalizeTherapyContinuation([value.regimen || value.defaultRegimen, value.form].filter(Boolean).join(' '));
    }
    if (!medicationName && value.line) {
      const split = splitTherapyLineIntoFields(value.line);
      medicationName = split.medicationName;
      continuation = split.continuation;
    }
    if (!medicationName) return null;
    const nowIso = new Date().toISOString();
    const createdAt = /^\d{4}-\d{2}-\d{2}T/.test(String(value.createdAt || '')) ? String(value.createdAt) : nowIso;
    const updatedAt = /^\d{4}-\d{2}-\d{2}T/.test(String(value.updatedAt || '')) ? String(value.updatedAt) : createdAt;
    const createdBy = normalizeTherapyFavoriteWhitespace(value.createdBy || value.updatedBy || options.updatedBy || '', 120);
    return {
      id: normalizeTherapyFavoriteWhitespace(value.id, 100) || createTherapyFavoriteId(),
      medicationName,
      continuation,
      createdAt,
      createdBy,
      updatedAt,
      updatedBy: normalizeTherapyFavoriteWhitespace(value.updatedBy || options.updatedBy || '', 120),
      version: Math.max(1, Number.parseInt(value.version, 10) || 1),
      schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION
    };
  }

  function sortTherapyFavoriteList(list) {
    return list.slice().sort((a, b) => {
      const byName = a.medicationName.localeCompare(b.medicationName, 'hr', { sensitivity: 'base', numeric: true });
      if (byName) return byName;
      return a.continuation.localeCompare(b.continuation, 'hr', { sensitivity: 'base', numeric: true });
    });
  }

  function normalizeTherapyFavoriteList(value, options = {}) {
    const seen = new Set();
    const normalized = (Array.isArray(value) ? value : [])
      .map((entry) => normalizeTherapyFavoriteEntry(entry, options))
      .filter(Boolean)
      .filter((entry) => {
        const key = buildTherapyFavoriteIdentityKey(entry);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, THERAPY_FAVORITES_MAX_ITEMS);
    return sortTherapyFavoriteList(normalized);
  }

  function getTherapyFavoritesCacheKey(scope) {
    if (scope === 'shared') return STORAGE_KEYS.therapyFavoritesSharedCache;
    return getPersonalSuggestionsStorageKey(STORAGE_KEYS.therapyFavoritesPersonalCache);
  }

  function backupLegacyTherapyFavorites(scope, parsed) {
    if (!parsed || Number(parsed.schemaVersion) === THERAPY_FAVORITES_SCHEMA_VERSION) return;
    let backup = {};
    try {
      backup = JSON.parse(safeLocalStorageGetItem(STORAGE_KEYS.therapyFavoritesLegacyBackup) || '{}');
    } catch (error) {
      backup = {};
    }
    if (backup?.schema !== 'temperaturna-lista-therapy-favorites-legacy-backup-v2') {
      backup = {
        schema: 'temperaturna-lista-therapy-favorites-legacy-backup-v2',
        migrationVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        scopes: {}
      };
    }
    if (!backup.scopes?.[scope]) {
      backup.scopes[scope] = JSON.parse(JSON.stringify(parsed));
      safeLocalStorageSetItem(STORAGE_KEYS.therapyFavoritesLegacyBackup, JSON.stringify(backup));
    }
  }

  function writeTherapyFavoritesCache(scope, items) {
    const normalized = normalizeTherapyFavoriteList(items, { updatedBy: getTherapyFavoritesActorId() });
    const payload = {
      schema: THERAPY_FAVORITES_SCHEMA,
      schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
      scope,
      savedAt: new Date().toISOString(),
      items: normalized
    };
    const saved = safeLocalStorageSetItem(getTherapyFavoritesCacheKey(scope), JSON.stringify(payload));
    if (saved) state.therapyFavorites[scope === 'shared' ? 'shared' : 'personal'] = normalized;
    return saved;
  }

  function readTherapyFavoritesCache(scope) {
    try {
      const raw = safeLocalStorageGetItem(getTherapyFavoritesCacheKey(scope));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (parsed?.schema === THERAPY_FAVORITES_SCHEMA && Number(parsed.schemaVersion) === THERAPY_FAVORITES_SCHEMA_VERSION) {
        return normalizeTherapyFavoriteList(parsed.items || []);
      }
      const legacyItems = Array.isArray(parsed?.items) ? parsed.items : [];
      if (!legacyItems.length) return [];
      backupLegacyTherapyFavorites(scope, parsed);
      const migrated = normalizeTherapyFavoriteList(legacyItems, { updatedBy: getTherapyFavoritesActorId() });
      writeTherapyFavoritesCache(scope, migrated);
      return migrated;
    } catch (error) {
      return [];
    }
  }

  function purgeLegacyTherapyAutocompleteStorage() {
    clearLocalStorageKeysWithPrefix(STORAGE_KEYS.legacyTherapyAutocompleteUsage);
    const existing = safeLocalStorageGetItem(STORAGE_KEYS.therapyFavoritesMigration);
    if (!existing) {
      safeLocalStorageSetItem(STORAGE_KEYS.therapyFavoritesMigration, JSON.stringify({
        schema: 'temperaturna-lista-therapy-favorites-migration-v2',
        migrationVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
        migratedAt: new Date().toISOString()
      }));
    }
  }

  function getTherapyFavoritesActorId() {
    const user = state.therapyFavorites?.sync?.user;
    return normalizeTherapyFavoriteWhitespace(user?.uid || activePersonalSuggestionsStorageUserId || 'local-device', 120);
  }

  function getInjectedTherapyFavoritesSyncAdapter() {
    if (!isLocalQaRuntime()) return null;
    const adapter = window.__TEMPERATURNA_LISTA_THERAPY_FAVORITES_SYNC__;
    return adapter && typeof adapter === 'object' ? adapter : null;
  }

  async function getTherapyFavoritesFirebaseClient() {
    if (state.therapyFavorites.sync.client) return state.therapyFavorites.sync.client;
    const injected = getInjectedTherapyFavoritesSyncAdapter();
    if (injected) return injected;
    if (isLocalQaRuntime()) {
      const smoke = typeof getFirebasePatientsSmokeClient === 'function' ? getFirebasePatientsSmokeClient() : null;
      if (smoke) {
        state.therapyFavorites.sync.client = smoke;
        return smoke;
      }
      return null;
    }
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);
    const appName = 'temperaturna-lista-therapy-settings';
    const existingApp = appModule.getApps().find((app) => app.name === appName);
    const app = existingApp || appModule.initializeApp(FIREBASE_CONFIG, appName);
    const auth = authModule.getAuth(app);
    try {
      await authModule.setPersistence(auth, authModule.browserLocalPersistence);
    } catch (error) {
      console.warn('Perzistencija prijave za terapijske postavke nije dostupna.', error);
    }
    const provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const client = {
      auth,
      db: firestoreModule.getFirestore(app),
      provider,
      signInWithPopup: authModule.signInWithPopup,
      onAuthStateChanged: authModule.onAuthStateChanged,
      doc: firestoreModule.doc,
      getDoc: firestoreModule.getDoc,
      onSnapshot: firestoreModule.onSnapshot,
      runTransaction: firestoreModule.runTransaction
    };
    state.therapyFavorites.sync.client = client;
    return client;
  }

  function canEditSharedTherapyFavorites() {
    const injected = getInjectedTherapyFavoritesSyncAdapter();
    if (injected) return injected.available === true && (injected.authenticated === true || injected.adminClaimVerified === true);
    return Boolean(state.therapyFavorites.sync.available && state.therapyFavorites.sync.user);
  }

  function applySharedTherapyFavoritesPayload(payload = {}) {
    const items = normalizeTherapyFavoriteList(payload?.items || payload || []);
    writeTherapyFavoritesCache('shared', items);
    state.therapyFavorites.sync.documentVersion = Math.max(0, Number.parseInt(payload?.version, 10) || 0);
    state.therapyFavorites.sync.remoteSchema = String(payload?.schema || '');
    state.therapyFavorites.sync.available = true;
    state.therapyFavorites.sync.status = 'synced';
    state.therapyFavorites.sync.lastSyncedAt = String(payload?.updatedAt || new Date().toISOString());
    state.therapyFavorites.sync.lastError = '';
    renderTherapyFavoritesSettings();
    return items;
  }

  function makeTherapyFavoritesMutationError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function applyTherapyFavoritesMutation(currentPayload = {}, mutation = {}) {
    const items = normalizeTherapyFavoriteList(currentPayload?.items || []);
    const actor = normalizeTherapyFavoriteWhitespace(mutation.actor || getTherapyFavoritesActorId(), 120);
    const nowIso = new Date().toISOString();
    const type = String(mutation.type || '');
    if (type === 'merge') {
      const merged = normalizeTherapyFavoriteList([...items, ...(mutation.items || [])], { updatedBy: actor });
      return {
        schema: THERAPY_FAVORITES_SCHEMA,
        schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        version: Math.max(0, Number.parseInt(currentPayload?.version, 10) || 0) + 1,
        updatedAt: nowIso,
        updatedBy: actor,
        items: merged
      };
    }

    const entry = mutation.entry ? normalizeTherapyFavoriteEntry(mutation.entry, { updatedBy: actor }) : null;
    const targetId = normalizeTherapyFavoriteWhitespace(mutation.id || entry?.id || '', 100);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    const expectedVersion = Math.max(0, Number.parseInt(mutation.expectedVersion, 10) || 0);
    if (['update', 'delete'].includes(type)) {
      if (targetIndex < 0) throw makeTherapyFavoritesMutationError('not-found', 'Terapija više ne postoji u zajedničkoj memoriji.');
      if (expectedVersion && Number(items[targetIndex].version || 1) !== expectedVersion) {
        throw makeTherapyFavoritesMutationError('conflict', 'Terapiju je u međuvremenu izmijenio drugi korisnik. Osvježite popis i pokušajte ponovno.');
      }
    }
    if (['add', 'update'].includes(type)) {
      if (!entry?.medicationName || !entry?.continuation) {
        throw makeTherapyFavoritesMutationError('validation', 'Naziv lijeka i nastavak terapije su obavezni.');
      }
      const duplicate = items.find((item) => item.id !== targetId
        && buildTherapyFavoriteIdentityKey(item) === buildTherapyFavoriteIdentityKey(entry));
      if (duplicate) {
        const error = makeTherapyFavoritesMutationError('duplicate', `Ta terapija već postoji: ${buildTherapyFavoriteLine(duplicate)}.`);
        error.duplicateId = duplicate.id;
        throw error;
      }
    }

    if (type === 'add') {
      items.push({
        ...entry,
        id: entry.id || createTherapyFavoriteId(),
        createdAt: nowIso,
        createdBy: actor,
        updatedAt: nowIso,
        updatedBy: actor,
        version: 1
      });
    } else if (type === 'update') {
      const previous = items[targetIndex];
      items[targetIndex] = {
        ...entry,
        id: previous.id,
        createdAt: previous.createdAt,
        createdBy: previous.createdBy,
        updatedAt: nowIso,
        updatedBy: actor,
        version: Number(previous.version || 1) + 1
      };
    } else if (type === 'delete') {
      items.splice(targetIndex, 1);
    } else {
      throw makeTherapyFavoritesMutationError('validation', 'Nepodržana promjena memorije terapije.');
    }

    return {
      schema: THERAPY_FAVORITES_SCHEMA,
      schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      version: Math.max(0, Number.parseInt(currentPayload?.version, 10) || 0) + 1,
      updatedAt: nowIso,
      updatedBy: actor,
      items: sortTherapyFavoriteList(items).slice(0, THERAPY_FAVORITES_MAX_ITEMS)
    };
  }

  async function mutateSharedTherapyFavorites(mutation) {
    if (!canEditSharedTherapyFavorites()) throw new Error('Prijavite se kako biste uređivali zajedničku memoriju terapije.');
    const client = await getTherapyFavoritesFirebaseClient();
    const enriched = { ...mutation, actor: String(state.therapyFavorites.sync.user?.email || getTherapyFavoritesActorId()) };
    if (typeof client.mutateShared === 'function') {
      const payload = await client.mutateShared(enriched);
      applySharedTherapyFavoritesPayload(payload);
      return payload;
    }
    const ref = client.doc(client.db, FIREBASE_APP_CONFIG_COLLECTION, THERAPY_FAVORITES_FIREBASE_DOCUMENT_ID);
    const payload = await client.runTransaction(client.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const current = snapshot?.exists?.() ? (snapshot.data() || {}) : {};
      const next = applyTherapyFavoritesMutation(current, enriched);
      transaction.set(ref, next);
      return next;
    });
    applySharedTherapyFavoritesPayload(payload);
    return payload;
  }

  async function loadSharedTherapyFavoritesFromRemote(options = {}) {
    try {
      const client = await getTherapyFavoritesFirebaseClient();
      if (!client || !state.therapyFavorites.sync.user) return false;
      let payload = {};
      if (typeof client.loadShared === 'function') payload = await client.loadShared();
      else {
        const ref = client.doc(client.db, FIREBASE_APP_CONFIG_COLLECTION, THERAPY_FAVORITES_FIREBASE_DOCUMENT_ID);
        const snapshot = await client.getDoc(ref);
        payload = snapshot?.exists?.() ? (snapshot.data() || {}) : {};
      }
      applySharedTherapyFavoritesPayload(payload);
      if (!options.silent) setStatus('Zajednička memorija terapije je osvježena.');
      return true;
    } catch (error) {
      state.therapyFavorites.sync.status = 'offline-cache';
      state.therapyFavorites.sync.lastError = String(error?.message || error);
      renderTherapyFavoritesSettings();
      if (!options.silent) setStatus('Zajednička memorija trenutačno nije dostupna; prikazuje se zadnja lokalna kopija.', true);
      return false;
    }
  }

  async function signInForTherapyFavorites() {
    try {
      const client = await getTherapyFavoritesFirebaseClient();
      if (!client?.signInWithPopup) throw new Error('Prijava nije dostupna.');
      const result = await client.signInWithPopup(client.auth, client.provider);
      state.therapyFavorites.sync.user = result?.user || client.auth?.currentUser || null;
      await loadSharedTherapyFavoritesFromRemote({ silent: true });
      await migrateLegacyTherapyFavoritesToShared();
      subscribeToSharedTherapyFavorites();
      renderTherapyFavoritesSettings();
      setStatus('Prijava je uspjela. Možete koristiti i uređivati zajedničku memoriju terapije.');
    } catch (error) {
      setStatus(`Prijava za terapijske postavke nije uspjela: ${error?.message || error}`, true);
    }
  }

  function readTherapyFavoritesMigrationMarker() {
    try {
      return JSON.parse(safeLocalStorageGetItem(STORAGE_KEYS.therapyFavoritesMigration) || '{}');
    } catch (error) {
      return {};
    }
  }

  async function migrateLegacyTherapyFavoritesToShared() {
    if (!canEditSharedTherapyFavorites()) return false;
    const marker = readTherapyFavoritesMigrationMarker();
    if (Number(marker?.migrationVersion) >= THERAPY_FAVORITES_SCHEMA_VERSION && marker?.status === 'complete') return true;
    const legacyItems = normalizeTherapyFavoriteList(readTherapyFavoritesCache('personal'), { updatedBy: getTherapyFavoritesActorId() });
    const needsRemoteUpgrade = state.therapyFavorites.sync.remoteSchema !== THERAPY_FAVORITES_SCHEMA;
    try {
      if (legacyItems.length || needsRemoteUpgrade) await mutateSharedTherapyFavorites({ type: 'merge', items: legacyItems });
      writeTherapyFavoritesCache('personal', []);
      safeLocalStorageSetItem(STORAGE_KEYS.therapyFavoritesMigration, JSON.stringify({
        schema: 'temperaturna-lista-therapy-favorites-migration-v3',
        migrationVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
        status: 'complete',
        migratedAt: new Date().toISOString(),
        migratedItems: legacyItems.length
      }));
      return true;
    } catch (error) {
      state.therapyFavorites.sync.lastError = String(error?.message || error);
      safeLocalStorageSetItem(STORAGE_KEYS.therapyFavoritesMigration, JSON.stringify({
        schema: 'temperaturna-lista-therapy-favorites-migration-v3',
        migrationVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
        status: 'pending',
        attemptedAt: new Date().toISOString()
      }));
      renderTherapyFavoritesSettings();
      return false;
    }
  }

  function subscribeToSharedTherapyFavorites() {
    const sync = state.therapyFavorites.sync;
    if (!sync.user || sync.unsubscribe) return;
    const begin = async () => {
      const client = await getTherapyFavoritesFirebaseClient();
      const onPayload = (payload) => applySharedTherapyFavoritesPayload(payload?.data ? payload.data() : payload);
      const onError = (error) => {
        sync.status = 'offline-cache';
        sync.lastError = String(error?.message || error);
        renderTherapyFavoritesSettings();
      };
      if (typeof client.subscribeShared === 'function') {
        sync.unsubscribe = client.subscribeShared(onPayload, onError) || null;
      } else if (typeof client.onSnapshot === 'function') {
        const ref = client.doc(client.db, FIREBASE_APP_CONFIG_COLLECTION, THERAPY_FAVORITES_FIREBASE_DOCUMENT_ID);
        sync.unsubscribe = client.onSnapshot(ref, (snapshot) => {
          if (snapshot?.exists?.()) onPayload(snapshot);
        }, onError);
      }
    };
    void begin().catch((error) => {
      sync.status = 'offline-cache';
      sync.lastError = String(error?.message || error);
      renderTherapyFavoritesSettings();
    });
  }

  function stopSharedTherapyFavoritesSubscription() {
    const unsubscribe = state.therapyFavorites.sync.unsubscribe;
    if (typeof unsubscribe === 'function') unsubscribe();
    state.therapyFavorites.sync.unsubscribe = null;
  }

  function loadTherapyFavoritesForCurrentUser() {
    state.therapyFavorites.personal = readTherapyFavoritesCache('personal');
    state.therapyFavorites.shared = readTherapyFavoritesCache('shared');
    state.therapyFavorites.editingSharedId = '';
    state.therapyFavorites.editingSharedVersion = 0;
    renderTherapyFavoritesSettings();
  }

  function getTherapyFavoriteFormElements(scope) {
    return {
      form: els.sharedTherapyFavoriteForm,
      name: els.sharedTherapyFavoriteName,
      continuation: els.sharedTherapyFavoriteContinuation,
      preview: els.sharedTherapyFavoritePreview,
      cancel: els.sharedTherapyFavoriteCancelBtn
    };
  }

  function getTherapyFavoriteDraftFromForm(scope) {
    const controls = getTherapyFavoriteFormElements(scope);
    return normalizeTherapyFavoriteEntry({
      medicationName: controls.name?.value || '',
      continuation: controls.continuation?.value || ''
    }, { updatedBy: getTherapyFavoritesActorId() });
  }

  function updateTherapyFavoritePreview(scope) {
    const controls = getTherapyFavoriteFormElements(scope);
    if (!controls.preview) return;
    const draft = getTherapyFavoriteDraftFromForm(scope);
    controls.preview.textContent = draft?.medicationName && draft?.continuation
      ? buildTherapyFavoriteLine(draft)
      : 'Upiši oba polja.';
  }

  function resetTherapyFavoriteForm() {
    const controls = getTherapyFavoriteFormElements('shared');
    controls.form?.reset();
    state.therapyFavorites.editingSharedId = '';
    state.therapyFavorites.editingSharedVersion = 0;
    state.therapyFavorites.highlightedSharedId = '';
    controls.cancel?.classList.add('hidden');
    const submit = controls.form?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Dodaj u memoriju';
    hideTherapyMemoryNameSuggestions();
    updateTherapyFavoritePreview('shared');
    renderTherapyFavoriteList('shared');
  }

  function getTherapyFavoritesList(scope) {
    return scope === 'shared' ? state.therapyFavorites.shared : state.therapyFavorites.personal;
  }

  async function saveTherapyFavoriteFromForm() {
    if (!canEditSharedTherapyFavorites()) {
      setStatus('Memorija terapije nije promijenjena. Prijavite se i pokušajte ponovno.', true);
      return false;
    }
    if (state.therapyFavorites.sync.saving) return false;
    const draft = getTherapyFavoriteDraftFromForm('shared');
    if (!draft) {
      setStatus('Terapija nije spremljena. Upišite naziv lijeka.', true);
      els.sharedTherapyFavoriteName?.focus();
      return false;
    }
    if (!draft.continuation) {
      setStatus('Terapija nije spremljena. Upišite nastavak terapije.', true);
      els.sharedTherapyFavoriteContinuation?.focus();
      return false;
    }
    const editingId = state.therapyFavorites.editingSharedId || '';
    const list = getTherapyFavoritesList('shared');
    const duplicate = list.find((entry) => buildTherapyFavoriteIdentityKey(entry) === buildTherapyFavoriteIdentityKey(draft) && entry.id !== editingId);
    if (duplicate) {
      setStatus(`Ta terapija već postoji: ${buildTherapyFavoriteLine(duplicate)}.`, true);
      state.therapyFavorites.highlightedSharedId = duplicate.id;
      startEditingTherapyFavorite('shared', duplicate.id);
      return false;
    }
    state.therapyFavorites.sync.saving = true;
    renderTherapyFavoritesSettings();
    try {
      await mutateSharedTherapyFavorites({
        type: editingId ? 'update' : 'add',
        id: editingId,
        expectedVersion: state.therapyFavorites.editingSharedVersion,
        entry: { ...draft, id: editingId || createTherapyFavoriteId() }
      });
    } catch (error) {
      if (error?.duplicateId) {
        state.therapyFavorites.highlightedSharedId = error.duplicateId;
        startEditingTherapyFavorite('shared', error.duplicateId);
      }
      const isConflict = error?.code === 'conflict' || /drugi korisnik|međuvremenu/i.test(String(error?.message || error));
      if (isConflict && editingId) {
        await loadSharedTherapyFavoritesFromRemote({ silent: true });
        startEditingTherapyFavorite('shared', editingId);
      }
      setStatus(isConflict
        ? `Terapija nije spremljena jer ju je izmijenio drugi korisnik. Učitana je najnovija verzija. ${error?.message || error}`
        : `Terapija nije spremljena: ${error?.message || error}`, true);
      return false;
    } finally {
      state.therapyFavorites.sync.saving = false;
      renderTherapyFavoritesSettings();
    }
    resetTherapyFavoriteForm();
    renderTherapyFavoritesSettings();
    setStatus('Terapija je spremljena u zajedničku memoriju i dostupna je prijavljenim korisnicima.');
    return true;
  }

  function startEditingTherapyFavorite(scope, id) {
    if (!canEditSharedTherapyFavorites()) return false;
    const entry = getTherapyFavoritesList('shared').find((item) => item.id === id);
    if (!entry) return false;
    const controls = getTherapyFavoriteFormElements('shared');
    if (controls.name) controls.name.value = entry.medicationName;
    if (controls.continuation) controls.continuation.value = entry.continuation;
    state.therapyFavorites.editingSharedId = entry.id;
    state.therapyFavorites.editingSharedVersion = Number(entry.version || 1);
    controls.cancel?.classList.remove('hidden');
    const submit = controls.form?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Spremi izmjene';
    updateTherapyFavoritePreview(scope);
    renderTherapyFavoriteList('shared');
    window.requestAnimationFrame(() => {
      const row = els.sharedTherapyFavoritesList?.querySelector(`[data-therapy-favorite-row-id="${CSS.escape(entry.id)}"]`);
      row?.scrollIntoView({ block: 'nearest' });
    });
    controls.name?.focus();
    return true;
  }

  async function deleteTherapyFavorite(scope, id) {
    if (!canEditSharedTherapyFavorites() || state.therapyFavorites.sync.saving) return false;
    const list = getTherapyFavoritesList('shared');
    const entry = list.find((item) => item.id === id);
    if (!entry || !window.confirm(`Jeste li sigurni da želite obrisati terapiju?\n\n${buildTherapyFavoriteLine(entry)}`)) return false;
    state.therapyFavorites.sync.saving = true;
    renderTherapyFavoritesSettings();
    try {
      await mutateSharedTherapyFavorites({ type: 'delete', id, expectedVersion: Number(entry.version || 1) });
    } catch (error) {
      setStatus(`Brisanje nije uspjelo: ${error?.message || error}`, true);
      return false;
    } finally {
      state.therapyFavorites.sync.saving = false;
      renderTherapyFavoritesSettings();
    }
    resetTherapyFavoriteForm();
    renderTherapyFavoritesSettings();
    setStatus('Predložak je obrisan. Već unesena terapija pacijenta nije promijenjena.');
    return true;
  }

  function renderTherapyFavoriteList(scope) {
    const container = els.sharedTherapyFavoritesList;
    if (!container) return;
    const query = therapyNormalizeText(state.therapyFavorites.searchQuery || '');
    const list = getTherapyFavoritesList('shared').filter((entry) => !query
      || therapyNormalizeText(`${entry.medicationName} ${entry.continuation}`).includes(query));
    const editable = canEditSharedTherapyFavorites() && !state.therapyFavorites.sync.saving;
    if (!list.length) {
      container.innerHTML = `<div class="therapy-favorite-empty">${query ? 'Nema terapija koje odgovaraju pretraživanju.' : 'Memorija terapije je prazna.'}</div>`;
      return;
    }
    container.innerHTML = list.map((entry) => {
      const actions = editable
        ? `<div class="therapy-favorite-row-actions"><button type="button" class="secondary" data-therapy-favorite-action="edit" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}">Uredi</button><button type="button" class="secondary danger" data-therapy-favorite-action="delete" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}">Izbriši</button></div>`
        : '';
      const highlighted = entry.id === state.therapyFavorites.highlightedSharedId ? ' is-highlighted' : '';
      return `<div class="therapy-favorite-row${highlighted}" data-therapy-favorite-row-id="${therapyEscapeHtml(entry.id)}"><div class="therapy-favorite-row-text">${therapyEscapeHtml(buildTherapyFavoriteLine(entry))}</div>${actions}</div>`;
    }).join('');
  }

  function renderTherapyFavoritesSettings() {
    if (!state.therapyFavorites) return;
    const sharedEditable = canEditSharedTherapyFavorites() && !state.therapyFavorites.sync.saving;
    if (els.therapyFavoritesSyncStatus) {
      const sync = state.therapyFavorites.sync;
      const syncTime = sync.lastSyncedAt
        ? new Date(sync.lastSyncedAt).toLocaleString('hr-HR', { dateStyle: 'short', timeStyle: 'short' })
        : '';
      els.therapyFavoritesSyncStatus.textContent = sync.saving
        ? 'Spremam promjenu u zajedničku memoriju...'
        : sync.status === 'synced'
        ? `Memorija terapije sinkronizirana je među prijavljenim korisnicima${syncTime ? ` (${syncTime})` : ''}. Podatci pacijenata ne šalju se online.`
        : sync.status === 'offline-cache'
          ? 'Memorija terapije trenutačno nije dostupna; prikazuje se zadnja lokalna kopija samo za čitanje.'
          : sync.user ? 'Učitavam zajedničku memoriju terapije...' : 'Prijavite se kako biste koristili zajedničku memoriju terapije.';
    }
    const sharedControls = getTherapyFavoriteFormElements('shared');
    [sharedControls.name, sharedControls.continuation].filter(Boolean).forEach((control) => { control.disabled = !sharedEditable; });
    sharedControls.form?.setAttribute('aria-disabled', String(!sharedEditable));
    sharedControls.form?.querySelectorAll('button').forEach((button) => { button.disabled = !sharedEditable; });
    if (els.therapyFavoritesSignInBtn) {
      els.therapyFavoritesSignInBtn.hidden = Boolean(state.therapyFavorites.sync.user);
      els.therapyFavoritesSignInBtn.disabled = false;
    }
    renderTherapyFavoriteList('shared');
    updateTherapyFavoritePreview('shared');
  }

  function positionTherapyEntrySuggestions(box, input) {
    if (!box || !input || box.classList.contains('hidden')) return;
    const rect = input.getBoundingClientRect();
    const width = Math.max(220, Math.min(rect.width, window.innerWidth - 16));
    box.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    box.style.top = `${Math.min(window.innerHeight - 120, rect.bottom + 5)}px`;
    box.style.width = `${width}px`;
  }

  function hideTherapyEntrySuggestions(kind = 'all') {
    if ((kind === 'all' || kind === 'name') && els.therapyMedicationSuggestionsBox) {
      els.therapyMedicationSuggestionsBox.classList.add('hidden');
      els.therapyMedicationSuggestionsBox.innerHTML = '';
      els.therapyMedicationName?.removeAttribute('aria-activedescendant');
    }
    if ((kind === 'all' || kind === 'continuation') && els.therapyContinuationSuggestionsBox) {
      els.therapyContinuationSuggestionsBox.classList.add('hidden');
      els.therapyContinuationSuggestionsBox.innerHTML = '';
      els.therapyMedicationContinuation?.removeAttribute('aria-activedescendant');
    }
  }

  function getTherapyMedicationTemplateSuggestions(query) {
    const q = therapyNormalizeText(query);
    if (q.length < 1) return [];
    return getTherapyAutocompleteSuggestions(query)
      .map((item) => ({ ...item, split: item.favorite
        ? { medicationName: item.favorite.medicationName, continuation: item.favorite.continuation }
        : splitTherapyLineIntoFields(item.line) }))
      .filter((item) => item.split?.medicationName)
      .slice(0, 8);
  }

  function hideTherapyMemoryNameSuggestions() {
    if (!els.therapyMemoryNameSuggestionsBox) return;
    els.therapyMemoryNameSuggestionsBox.classList.add('hidden');
    els.therapyMemoryNameSuggestionsBox.innerHTML = '';
    els.sharedTherapyFavoriteName?.removeAttribute('aria-activedescendant');
  }

  function renderTherapyMemoryNameSuggestions() {
    const box = els.therapyMemoryNameSuggestionsBox;
    if (!box) return;
    const suggestions = getTherapyMedicationTemplateSuggestions(els.sharedTherapyFavoriteName?.value || '');
    state.therapyFavorites.memoryNameSuggestions = suggestions;
    if (!suggestions.length) {
      hideTherapyMemoryNameSuggestions();
      return;
    }
    const active = Math.max(0, Math.min(state.therapyFavorites.memoryNameSuggestionIndex || 0, suggestions.length - 1));
    state.therapyFavorites.memoryNameSuggestionIndex = active;
    box.innerHTML = suggestions.map((item, index) => `<div id="therapyMemoryNameSuggestion${index}" class="therapy-autocomplete-option${index === active ? ' is-active' : ''}" role="option" aria-selected="${index === active}" data-therapy-memory-suggestion-index="${index}"><div class="therapy-autocomplete-main">${therapyEscapeHtml(buildTherapyFavoriteLine(item.split))}</div></div>`).join('');
    box.classList.remove('hidden');
    els.sharedTherapyFavoriteName?.setAttribute('aria-activedescendant', `therapyMemoryNameSuggestion${active}`);
    positionTherapyEntrySuggestions(box, els.sharedTherapyFavoriteName);
  }

  function selectTherapyMemoryNameSuggestion(index) {
    const item = state.therapyFavorites.memoryNameSuggestions?.[index];
    if (!item?.split) return false;
    if (els.sharedTherapyFavoriteName) els.sharedTherapyFavoriteName.value = item.split.medicationName;
    if (els.sharedTherapyFavoriteContinuation) els.sharedTherapyFavoriteContinuation.value = item.split.continuation;
    updateTherapyFavoritePreview('shared');
    hideTherapyMemoryNameSuggestions();
    els.sharedTherapyFavoriteContinuation?.focus();
    return true;
  }

  function closeTherapyMemoryPanel() {
    if (els.therapyFavoritesSettings) els.therapyFavoritesSettings.open = false;
    resetTherapyFavoriteForm();
  }

  function renderTherapyMedicationSuggestions() {
    const box = els.therapyMedicationSuggestionsBox;
    if (!box) return;
    const suggestions = getTherapyMedicationTemplateSuggestions(els.therapyMedicationName?.value || '');
    state.therapyEntryEditor.medicationSuggestions = suggestions;
    if (!suggestions.length) {
      hideTherapyEntrySuggestions('name');
      return;
    }
    const active = Math.max(0, Math.min(state.therapyEntryEditor.activeSuggestionIndex || 0, suggestions.length - 1));
    state.therapyEntryEditor.activeSuggestionIndex = active;
    box.innerHTML = suggestions.map((item, index) => `<div id="therapyMedicationSuggestion${index}" class="therapy-autocomplete-option${index === active ? ' is-active' : ''}" role="option" aria-selected="${index === active}" data-therapy-medication-suggestion-index="${index}"><div class="therapy-autocomplete-main">${therapyEscapeHtml(buildTherapyFavoriteLine(item.split))}</div><div class="therapy-autocomplete-meta">${therapyEscapeHtml(item.meta || 'predložak')}</div></div>`).join('');
    box.classList.remove('hidden');
    els.therapyMedicationName?.setAttribute('aria-activedescendant', `therapyMedicationSuggestion${active}`);
    positionTherapyEntrySuggestions(box, els.therapyMedicationName);
  }

  function getFilteredTherapyContinuationSuggestions(query) {
    const q = therapyNormalizeText(normalizeTherapyContinuation(query));
    const all = new Set(THERAPY_FAVORITES_FIXED_CONTINUATIONS);
    [...state.therapyFavorites.personal, ...state.therapyFavorites.shared].forEach((entry) => {
      if (entry.continuation) all.add(entry.continuation);
    });
    return Array.from(all)
      .filter((item) => !q || therapyNormalizeText(item).includes(q))
      .sort((a, b) => a.localeCompare(b, 'hr', { numeric: true }))
      .slice(0, 12);
  }

  function renderTherapyContinuationSuggestions() {
    const box = els.therapyContinuationSuggestionsBox;
    if (!box) return;
    const suggestions = getFilteredTherapyContinuationSuggestions(els.therapyMedicationContinuation?.value || '');
    state.therapyEntryEditor.continuationSuggestions = suggestions;
    if (!suggestions.length) {
      hideTherapyEntrySuggestions('continuation');
      return;
    }
    const exactIndex = suggestions.findIndex((item) => therapyNormalizeText(item) === therapyNormalizeText(els.therapyMedicationContinuation?.value || ''));
    if (exactIndex >= 0) state.therapyEntryEditor.continuationSuggestionIndex = exactIndex;
    const active = Math.max(0, Math.min(state.therapyEntryEditor.continuationSuggestionIndex || 0, suggestions.length - 1));
    state.therapyEntryEditor.continuationSuggestionIndex = active;
    box.innerHTML = suggestions.map((item, index) => `<div id="therapyContinuationSuggestion${index}" class="therapy-autocomplete-option${index === active ? ' is-active' : ''}" role="option" aria-selected="${index === active}" data-therapy-continuation-suggestion-index="${index}"><div class="therapy-autocomplete-main">${therapyEscapeHtml(item)}</div></div>`).join('');
    box.classList.remove('hidden');
    els.therapyMedicationContinuation?.setAttribute('aria-activedescendant', `therapyContinuationSuggestion${active}`);
    positionTherapyEntrySuggestions(box, els.therapyMedicationContinuation);
  }

  function setTherapyEntryEditorStatus(message) {
    if (els.therapyEntryEditorStatus) els.therapyEntryEditorStatus.textContent = message;
  }

  function clearTherapyEntryEditor(options = {}) {
    state.therapyEntryEditor.lineStart = -1;
    state.therapyEntryEditor.lineEnd = -1;
    if (els.therapyMedicationName) els.therapyMedicationName.value = '';
    if (els.therapyMedicationContinuation) els.therapyMedicationContinuation.value = '';
    if (els.therapyEntryApplyBtn) els.therapyEntryApplyBtn.textContent = 'Dodaj u terapiju';
    hideTherapyEntrySuggestions();
    setTherapyEntryEditorStatus('Upiši lijek i nastavak ili odaberi spremljeni predložak.');
    if (options.focus !== false) els.therapyMedicationName?.focus();
  }

  function setTherapyEditorFromLine(line, lineStart = -1, lineEnd = -1) {
    const split = splitTherapyLineIntoFields(line);
    state.therapyEntryEditor.syncing = true;
    if (els.therapyMedicationName) els.therapyMedicationName.value = split.medicationName;
    if (els.therapyMedicationContinuation) els.therapyMedicationContinuation.value = split.continuation;
    state.therapyEntryEditor.lineStart = lineStart;
    state.therapyEntryEditor.lineEnd = lineEnd;
    if (els.therapyEntryApplyBtn) els.therapyEntryApplyBtn.textContent = lineStart >= 0 ? 'Ažuriraj terapiju' : 'Dodaj u terapiju';
    state.therapyEntryEditor.syncing = false;
    setTherapyEntryEditorStatus(lineStart >= 0 ? 'Uređuješ odabrani redak terapije pacijenta.' : 'Predložak je učitan; po potrebi ga uredi i dodaj.');
    return split;
  }

  function syncTherapyEntryEditorFromTextarea() {
    if (!els.therapy || document.activeElement !== els.therapy) return;
    const ctx = getTherapyAutocompleteCurrentLine(els.therapy);
    const line = String(ctx.fullLine || '').replace(THERAPY_BULLET_PREFIX_RE, '').trim();
    if (!line) return;
    setTherapyEditorFromLine(line, ctx.lineStart, ctx.lineEnd);
  }

  function replaceTherapyEditorBoundLine(options = {}) {
    if (state.therapyEntryEditor.syncing || state.therapyEntryEditor.lineStart < 0 || !els.therapy) return false;
    const medicationName = normalizeTherapyMedicationName(els.therapyMedicationName?.value || '');
    const continuation = normalizeTherapyContinuation(els.therapyMedicationContinuation?.value || '');
    const replacement = buildTherapyFavoriteLine({ medicationName, continuation });
    const value = String(els.therapy.value || '');
    const start = state.therapyEntryEditor.lineStart;
    const end = state.therapyEntryEditor.lineEnd;
    els.therapy.value = `${value.slice(0, start)}${replacement}${value.slice(end)}`;
    state.therapyEntryEditor.lineEnd = start + replacement.length;
    els.therapy.dispatchEvent(new Event('input', { bubbles: true }));
    if (!options.quiet) setTherapyEntryEditorStatus('Odabrani redak i živi pregled odmah su ažurirani.');
    return true;
  }

  function applyTherapyEntryEditor(options = {}) {
    const medicationName = normalizeTherapyMedicationName(els.therapyMedicationName?.value || '');
    const continuation = normalizeTherapyContinuation(els.therapyMedicationContinuation?.value || '');
    if (!medicationName) {
      setStatus('Upišite naziv lijeka.', true);
      els.therapyMedicationName?.focus();
      return false;
    }
    if (!continuation && !options.skipContinuationConfirmation
      && !window.confirm('Nastavak terapije nije upisan. Ipak spremiti/umetnuti?')) return false;
    const line = buildTherapyFavoriteLine({ medicationName, continuation });
    if (state.therapyEntryEditor.lineStart >= 0) {
      replaceTherapyEditorBoundLine();
    } else {
      const current = normalizeLineBreaks(els.therapy?.value || '').trimEnd();
      if (els.therapy) {
        els.therapy.value = current ? `${current}\n${line}` : line;
        els.therapy.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    setStatus(options.statusMessage
      || 'Terapija je unesena. Provjerite dozu, put primjene, bubrežnu funkciju i indikaciju prije ispisa.');
    clearTherapyEntryEditor({ focus: false });
    return true;
  }

  function selectTherapyMedicationSuggestion(index) {
    const item = state.therapyEntryEditor.medicationSuggestions?.[index];
    if (!item?.split) return false;
    const boundStart = state.therapyEntryEditor.lineStart;
    const boundEnd = state.therapyEntryEditor.lineEnd;
    setTherapyEditorFromLine(buildTherapyFavoriteLine(item.split), boundStart, boundEnd);
    if (boundStart >= 0) replaceTherapyEditorBoundLine();
    hideTherapyEntrySuggestions('name');
    els.therapyMedicationContinuation?.focus();
    renderTherapyContinuationSuggestions();
    return true;
  }

  function selectTherapyContinuationSuggestion(index) {
    const value = state.therapyEntryEditor.continuationSuggestions?.[index];
    if (!value || !els.therapyMedicationContinuation) return false;
    els.therapyMedicationContinuation.value = value;
    replaceTherapyEditorBoundLine();
    renderTherapyContinuationSuggestions();
    return true;
  }

  function cycleTherapyContinuationRegimen(value, direction) {
    const continuation = normalizeTherapyContinuation(value);
    if (!continuation) return null;
    const xMatch = /\b([1-4]x1)\b/i.exec(continuation);
    if (xMatch) {
      const current = xMatch[1].toLocaleLowerCase('hr-HR');
      const index = THERAPY_FAVORITES_X_REGIMENS.indexOf(current);
      const next = THERAPY_FAVORITES_X_REGIMENS[(index + direction + THERAPY_FAVORITES_X_REGIMENS.length) % THERAPY_FAVORITES_X_REGIMENS.length];
      return normalizeTherapyContinuation(`${continuation.slice(0, xMatch.index)}${next}${continuation.slice(xMatch.index + xMatch[0].length)}`);
    }
    const commaMatch = /\b([01]\s*,\s*[01]\s*,\s*[01])\b/.exec(continuation);
    if (commaMatch) {
      const current = normalizeTherapyContinuation(commaMatch[1]);
      const order = THERAPY_FAVORITES_COMMA_REGIMENS_PAGE_UP;
      const index = order.indexOf(current);
      if (index < 0) return null;
      const next = order[(index + direction + order.length) % order.length];
      return normalizeTherapyContinuation(`${continuation.slice(0, commaMatch.index)}${next}${continuation.slice(commaMatch.index + commaMatch[0].length)}`);
    }
    return null;
  }

  function handleTherapyContinuationPageKey(event) {
    if (event.target !== els.therapyMedicationContinuation || !['PageUp', 'PageDown'].includes(event.key)) return false;
    event.preventDefault();
    const direction = event.key === 'PageUp' ? 1 : -1;
    const next = cycleTherapyContinuationRegimen(els.therapyMedicationContinuation.value, direction);
    if (!next) return true;
    els.therapyMedicationContinuation.value = next;
    replaceTherapyEditorBoundLine();
    renderTherapyContinuationSuggestions();
    return true;
  }

  function migratePatientTherapyToStructuredEntries(data = {}) {
    if (Array.isArray(data.therapyEntries) && Number(data.therapyEntriesMigrationVersion) === THERAPY_PATIENT_ENTRIES_MIGRATION_VERSION) {
      return {
        entries: data.therapyEntries.map((entry) => normalizeTherapyFavoriteEntry(entry)).filter(Boolean),
        legacyBackup: Array.isArray(data.therapyEntriesLegacyBackup) ? data.therapyEntriesLegacyBackup.slice() : [],
        migrated: false
      };
    }
    const originals = normalizeLineBreaks(data.therapy || '').split('\n').map((line) => line.trim()).filter(Boolean);
    return {
      entries: originals.map((line) => {
        const split = splitTherapyLineIntoFields(line);
        return normalizeTherapyFavoriteEntry({ medicationName: split.medicationName, continuation: split.continuation });
      }).filter(Boolean),
      legacyBackup: originals,
      migrated: originals.length > 0
    };
  }

  function wireTherapyEntryEditor() {
    els.therapyEntryApplyBtn?.addEventListener('click', applyTherapyEntryEditor);
    els.therapyEntryClearBtn?.addEventListener('click', () => clearTherapyEntryEditor());
    els.therapy?.addEventListener('click', syncTherapyEntryEditorFromTextarea);
    els.therapy?.addEventListener('keyup', (event) => {
      if (!['PageUp', 'PageDown'].includes(event.key)) syncTherapyEntryEditorFromTextarea();
    });
    els.therapyMedicationName?.addEventListener('input', () => {
      state.therapyEntryEditor.activeSuggestionIndex = 0;
      renderTherapyMedicationSuggestions();
      replaceTherapyEditorBoundLine({ quiet: true });
    });
    els.therapyMedicationName?.addEventListener('focus', renderTherapyMedicationSuggestions);
    els.therapyMedicationName?.addEventListener('keydown', (event) => {
      const suggestions = state.therapyEntryEditor.medicationSuggestions || [];
      if (!suggestions.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        state.therapyEntryEditor.activeSuggestionIndex = (state.therapyEntryEditor.activeSuggestionIndex + delta + suggestions.length) % suggestions.length;
        renderTherapyMedicationSuggestions();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        selectTherapyMedicationSuggestion(state.therapyEntryEditor.activeSuggestionIndex);
      } else if (event.key === 'Escape') hideTherapyEntrySuggestions('name');
    });
    els.therapyMedicationContinuation?.addEventListener('input', () => {
      state.therapyEntryEditor.continuationSuggestionIndex = 0;
      renderTherapyContinuationSuggestions();
      replaceTherapyEditorBoundLine({ quiet: true });
    });
    els.therapyMedicationContinuation?.addEventListener('focus', renderTherapyContinuationSuggestions);
    els.therapyMedicationContinuation?.addEventListener('keydown', (event) => {
      if (handleTherapyContinuationPageKey(event)) return;
      const suggestions = state.therapyEntryEditor.continuationSuggestions || [];
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!suggestions.length) return;
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        state.therapyEntryEditor.continuationSuggestionIndex = (state.therapyEntryEditor.continuationSuggestionIndex + delta + suggestions.length) % suggestions.length;
        renderTherapyContinuationSuggestions();
      } else if (event.key === 'Enter') {
        if (suggestions.length && !els.therapyContinuationSuggestionsBox?.classList.contains('hidden')) {
          event.preventDefault();
          selectTherapyContinuationSuggestion(state.therapyEntryEditor.continuationSuggestionIndex);
        }
      } else if (event.key === 'Escape') hideTherapyEntrySuggestions('continuation');
    });
    els.therapyMedicationSuggestionsBox?.addEventListener('mousedown', (event) => {
      const option = event.target.closest('[data-therapy-medication-suggestion-index]');
      if (!option) return;
      event.preventDefault();
      selectTherapyMedicationSuggestion(Number(option.dataset.therapyMedicationSuggestionIndex || 0));
    });
    els.therapyContinuationSuggestionsBox?.addEventListener('mousedown', (event) => {
      const option = event.target.closest('[data-therapy-continuation-suggestion-index]');
      if (!option) return;
      event.preventDefault();
      selectTherapyContinuationSuggestion(Number(option.dataset.therapyContinuationSuggestionIndex || 0));
    });
    document.addEventListener('mousedown', (event) => {
      if (els.therapyEntryEditor?.contains(event.target)
        || els.therapyMedicationSuggestionsBox?.contains(event.target)
        || els.therapyContinuationSuggestionsBox?.contains(event.target)
        || els.sharedTherapyFavoriteForm?.contains(event.target)
        || els.therapyMemoryNameSuggestionsBox?.contains(event.target)) return;
      hideTherapyEntrySuggestions();
      hideTherapyMemoryNameSuggestions();
    });
    window.addEventListener('resize', () => {
      positionTherapyEntrySuggestions(els.therapyMedicationSuggestionsBox, els.therapyMedicationName);
      positionTherapyEntrySuggestions(els.therapyContinuationSuggestionsBox, els.therapyMedicationContinuation);
      positionTherapyEntrySuggestions(els.therapyMemoryNameSuggestionsBox, els.sharedTherapyFavoriteName);
    });
  }

  function wireTherapyFavoritesSettings() {
    const controls = getTherapyFavoriteFormElements('shared');
    els.therapyFavoritesSettings?.addEventListener('toggle', () => {
      els.therapyFavoritesSettings.querySelector(':scope > summary')
        ?.setAttribute('aria-expanded', String(els.therapyFavoritesSettings.open));
      if (!els.therapyFavoritesSettings.open) hideTherapyMemoryNameSuggestions();
    });
    [controls.name, controls.continuation].filter(Boolean).forEach((control) => {
      control.addEventListener('input', () => updateTherapyFavoritePreview('shared'));
      control.addEventListener('change', () => updateTherapyFavoritePreview('shared'));
    });
    controls.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      void saveTherapyFavoriteFromForm('shared');
    });
    controls.cancel?.addEventListener('click', () => resetTherapyFavoriteForm());
    els.sharedTherapyFavoritesList?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-therapy-favorite-action]');
      if (!button) return;
      const id = button.dataset.therapyFavoriteId;
      if (button.dataset.therapyFavoriteAction === 'edit') startEditingTherapyFavorite('shared', id);
      if (button.dataset.therapyFavoriteAction === 'delete') void deleteTherapyFavorite('shared', id);
    });
    els.therapyFavoritesSearch?.addEventListener('input', (event) => {
      state.therapyFavorites.searchQuery = event.target.value || '';
      renderTherapyFavoriteList('shared');
    });
    els.sharedTherapyFavoriteName?.addEventListener('input', () => {
      state.therapyFavorites.memoryNameSuggestionIndex = 0;
      renderTherapyMemoryNameSuggestions();
    });
    els.sharedTherapyFavoriteName?.addEventListener('focus', renderTherapyMemoryNameSuggestions);
    els.sharedTherapyFavoriteName?.addEventListener('keydown', (event) => {
      const suggestions = state.therapyFavorites.memoryNameSuggestions || [];
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (!suggestions.length) return;
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        state.therapyFavorites.memoryNameSuggestionIndex = (state.therapyFavorites.memoryNameSuggestionIndex + delta + suggestions.length) % suggestions.length;
        renderTherapyMemoryNameSuggestions();
      } else if (event.key === 'Enter' && suggestions.length && !els.therapyMemoryNameSuggestionsBox?.classList.contains('hidden')) {
        event.preventDefault();
        selectTherapyMemoryNameSuggestion(state.therapyFavorites.memoryNameSuggestionIndex);
      } else if (event.key === 'Escape') hideTherapyMemoryNameSuggestions();
    });
    els.therapyMemoryNameSuggestionsBox?.addEventListener('mousedown', (event) => {
      const option = event.target.closest('[data-therapy-memory-suggestion-index]');
      if (!option) return;
      event.preventDefault();
      selectTherapyMemoryNameSuggestion(Number(option.dataset.therapyMemorySuggestionIndex || 0));
    });
    els.therapyFavoritesSignInBtn?.addEventListener('click', () => void signInForTherapyFavorites());
    els.refreshSharedTherapyFavoritesBtn?.addEventListener('click', () => void loadSharedTherapyFavoritesFromRemote());
  }

  async function initTherapyFavoritesSync() {
    try {
      const client = await getTherapyFavoritesFirebaseClient();
      if (!client) {
        state.therapyFavorites.sync.status = 'offline-cache';
        renderTherapyFavoritesSettings();
        return;
      }
      if (typeof client.onAuthStateChanged === 'function') {
        client.onAuthStateChanged(client.auth, (user) => {
          stopSharedTherapyFavoritesSubscription();
          state.therapyFavorites.sync.user = user || null;
          state.therapyFavorites.sync.authResolved = true;
          renderTherapyFavoritesSettings();
          if (user) {
            void loadSharedTherapyFavoritesFromRemote({ silent: true }).then(async () => {
              await migrateLegacyTherapyFavoritesToShared();
              subscribeToSharedTherapyFavorites();
            });
          }
        });
      } else if (client.authenticated === true || client.adminClaimVerified === true) {
        state.therapyFavorites.sync.user = client.currentUser || { uid: 'qa-user', email: 'qa@example.test' };
        state.therapyFavorites.sync.authResolved = true;
        await loadSharedTherapyFavoritesFromRemote({ silent: true });
        await migrateLegacyTherapyFavoritesToShared();
        subscribeToSharedTherapyFavorites();
      }
    } catch (error) {
      state.therapyFavorites.sync.status = 'offline-cache';
      state.therapyFavorites.sync.lastError = String(error?.message || error);
      renderTherapyFavoritesSettings();
    }
  }

  function initTherapyFavorites() {
    purgeLegacyTherapyAutocompleteStorage();
    loadTherapyFavoritesForCurrentUser();
    wireTherapyFavoritesSettings();
    wireTherapyEntryEditor();
    if (els.therapyFavoritesSettings) els.therapyFavoritesSettings.open = false;
    state.therapyFavorites.initialized = true;
    void initTherapyFavoritesSync();
  }
