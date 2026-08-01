// ============================================================
// MODULE: 15-therapy-favorites.js
// Explicitly managed therapy favorites. Patient text is never learned.
// ============================================================
  const THERAPY_FAVORITES_SCHEMA = 'temperaturna-lista-therapy-favorites-v1';
  const THERAPY_FAVORITES_BACKUP_SCHEMA = 'temperaturna-lista-therapy-favorites-backup-v1';
  const THERAPY_FAVORITES_SCHEMA_VERSION = 1;
  const THERAPY_FAVORITES_MAX_ITEMS = 250;
  const THERAPY_FAVORITES_REGIMENS = Object.freeze(['1,0,0', '0,1,0', '0,0,1', 'p.p.']);

  function normalizeTherapyFavoriteWhitespace(value, maxLength) {
    return String(value || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  function normalizeTherapyFavoriteName(value) {
    return capitalizeClinicalTextItem(normalizeTherapyFavoriteWhitespace(value, 100).toLocaleLowerCase('hr-HR'));
  }

  function normalizeTherapyFavoriteStrength(value) {
    return normalizeTherapyFavoriteWhitespace(value, 50)
      .replace(/\s*([,.])\s*/g, '$1')
      .replace(/\b(mg|mcg|ug|µg|g|ml|mmol|ij|iu)\b/gi, (unit) => unit.toLocaleLowerCase('hr-HR'));
  }

  function normalizeTherapyFavoriteForm(value) {
    return normalizeTherapyFavoriteWhitespace(value, 40).toLocaleLowerCase('hr-HR');
  }

  function normalizeTherapyFavoriteRegimen(value) {
    const text = normalizeTherapyFavoriteWhitespace(value, 30).toLocaleLowerCase('hr-HR');
    if (/^(?:1\s*[, -]\s*0\s*[, -]\s*0|ujutro)$/.test(text)) return '1,0,0';
    if (/^(?:0\s*[, -]\s*1\s*[, -]\s*0|podne)$/.test(text)) return '0,1,0';
    if (/^(?:0\s*[, -]\s*0\s*[, -]\s*1|nave(?:č|c)er)$/.test(text)) return '0,0,1';
    if (/^(?:p\s*\.?\s*p\s*\.?|po potrebi)$/.test(text)) return 'p.p.';
    return '';
  }

  function buildTherapyFavoriteIdentityKey(entry) {
    return [entry?.name, entry?.strength, entry?.form]
      .map((value) => therapyNormalizeText(value || '').replace(/\s+/g, ' ').trim())
      .join('|');
  }

  function buildTherapyFavoriteLine(entry) {
    return normalizeClinicalTherapyText([
      entry?.name,
      entry?.strength,
      entry?.regimen,
      entry?.form
    ].filter(Boolean).join(' '));
  }

  function createTherapyFavoriteId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `therapy-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeTherapyFavoriteEntry(value = {}, options = {}) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const name = normalizeTherapyFavoriteName(value.name);
    const strength = normalizeTherapyFavoriteStrength(value.strength);
    const form = normalizeTherapyFavoriteForm(value.form);
    const regimen = normalizeTherapyFavoriteRegimen(value.regimen || value.defaultRegimen);
    if (!name || !strength || !form || !regimen) return null;
    const nowIso = new Date().toISOString();
    return {
      id: normalizeTherapyFavoriteWhitespace(value.id, 100) || createTherapyFavoriteId(),
      name,
      strength,
      form,
      regimen,
      sortOrder: Number.isFinite(Number(value.sortOrder)) ? Math.max(0, Math.floor(Number(value.sortOrder))) : Number(options.sortOrder || 0),
      updatedAt: /^\d{4}-\d{2}-\d{2}T/.test(String(value.updatedAt || '')) ? String(value.updatedAt) : nowIso,
      updatedBy: normalizeTherapyFavoriteWhitespace(value.updatedBy || options.updatedBy || '', 120),
      schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION
    };
  }

  function normalizeTherapyFavoriteList(value, options = {}) {
    const list = Array.isArray(value) ? value : [];
    const seen = new Set();
    return list
      .map((entry, index) => normalizeTherapyFavoriteEntry(entry, { ...options, sortOrder: index }))
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((entry) => {
        const key = buildTherapyFavoriteIdentityKey(entry);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, THERAPY_FAVORITES_MAX_ITEMS)
      .map((entry, index) => ({ ...entry, sortOrder: index }));
  }

  function getTherapyFavoritesCacheKey(scope) {
    if (scope === 'shared') return STORAGE_KEYS.therapyFavoritesSharedCache;
    return getPersonalSuggestionsStorageKey(STORAGE_KEYS.therapyFavoritesPersonalCache);
  }

  function readTherapyFavoritesCache(scope) {
    try {
      const parsed = JSON.parse(safeLocalStorageGetItem(getTherapyFavoritesCacheKey(scope)) || '{}');
      if (parsed?.schema !== THERAPY_FAVORITES_SCHEMA || Number(parsed?.schemaVersion) !== THERAPY_FAVORITES_SCHEMA_VERSION) return [];
      return normalizeTherapyFavoriteList(parsed.items || []);
    } catch (error) {
      return [];
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

  function purgeLegacyTherapyAutocompleteStorage() {
    clearLocalStorageKeysWithPrefix(STORAGE_KEYS.legacyTherapyAutocompleteUsage);
    safeLocalStorageSetItem(STORAGE_KEYS.therapyFavoritesMigration, JSON.stringify({
      schema: 'temperaturna-lista-therapy-learning-purge-v1',
      migratedAt: new Date().toISOString()
    }));
  }

  function getTherapyFavoritesActorId() {
    const authContext = typeof getFirebaseAuthContext === 'function' ? getFirebaseAuthContext() : null;
    return normalizeTherapyFavoriteWhitespace(authContext?.uid || activePersonalSuggestionsStorageUserId || 'local-device', 120);
  }

  function getTherapyFavoritesSyncAdapter() {
    if (!isLocalQaRuntime()) return null;
    const adapter = window.__TEMPERATURNA_LISTA_THERAPY_FAVORITES_SYNC__;
    return adapter && typeof adapter === 'object' ? adapter : null;
  }

  function canEditSharedTherapyFavorites() {
    const adapter = getTherapyFavoritesSyncAdapter();
    const authContext = typeof getFirebaseAuthContext === 'function' ? getFirebaseAuthContext() : null;
    return Boolean(
      adapter?.available === true &&
      typeof isSuperAdmin === 'function' &&
      isSuperAdmin(authContext) &&
      adapter?.adminClaimVerified === true
    );
  }

  function loadTherapyFavoritesForCurrentUser() {
    state.therapyFavorites.personal = readTherapyFavoritesCache('personal');
    state.therapyFavorites.shared = readTherapyFavoritesCache('shared');
    state.therapyFavorites.editingPersonalId = '';
    state.therapyFavorites.editingSharedId = '';
    renderTherapyFavoritesSettings();
  }

  function getTherapyFavoriteFormElements(scope) {
    const personal = scope !== 'shared';
    return {
      form: personal ? els.personalTherapyFavoriteForm : els.sharedTherapyFavoriteForm,
      name: personal ? els.personalTherapyFavoriteName : els.sharedTherapyFavoriteName,
      strength: personal ? els.personalTherapyFavoriteStrength : els.sharedTherapyFavoriteStrength,
      formText: personal ? els.personalTherapyFavoriteFormText : els.sharedTherapyFavoriteFormText,
      regimen: personal ? els.personalTherapyFavoriteRegimen : els.sharedTherapyFavoriteRegimen,
      preview: personal ? els.personalTherapyFavoritePreview : els.sharedTherapyFavoritePreview,
      cancel: personal ? els.personalTherapyFavoriteCancelBtn : els.sharedTherapyFavoriteCancelBtn
    };
  }

  function getTherapyFavoriteDraftFromForm(scope) {
    const controls = getTherapyFavoriteFormElements(scope);
    return normalizeTherapyFavoriteEntry({
      name: controls.name?.value || '',
      strength: controls.strength?.value || '',
      form: controls.formText?.value || '',
      regimen: controls.regimen?.value || ''
    }, { updatedBy: getTherapyFavoritesActorId() });
  }

  function updateTherapyFavoritePreview(scope) {
    const controls = getTherapyFavoriteFormElements(scope);
    if (!controls.preview) return;
    const draft = getTherapyFavoriteDraftFromForm(scope);
    controls.preview.textContent = draft ? buildTherapyFavoriteLine(draft) : 'Ispuni sva četiri polja za pregled konačnog teksta.';
  }

  function resetTherapyFavoriteForm(scope) {
    const controls = getTherapyFavoriteFormElements(scope);
    controls.form?.reset();
    if (controls.regimen) controls.regimen.value = '1,0,0';
    const editingKey = scope === 'shared' ? 'editingSharedId' : 'editingPersonalId';
    state.therapyFavorites[editingKey] = '';
    controls.cancel?.classList.add('hidden');
    const submit = controls.form?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Spremi terapiju';
    updateTherapyFavoritePreview(scope);
  }

  function getTherapyFavoritesList(scope) {
    return scope === 'shared' ? state.therapyFavorites.shared : state.therapyFavorites.personal;
  }

  function saveTherapyFavoriteFromForm(scope) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) {
      setStatus('Zajedničke terapije nisu promijenjene: potreban je sigurni backend i potvrđena administratorska ovlast.', true);
      return false;
    }
    const draft = getTherapyFavoriteDraftFromForm(scope);
    if (!draft) {
      setStatus('Terapija nije spremljena. Upišite naziv, jačinu, oblik i valjani režim.', true);
      return false;
    }
    const editingKey = scope === 'shared' ? 'editingSharedId' : 'editingPersonalId';
    const editingId = state.therapyFavorites[editingKey] || '';
    const list = getTherapyFavoritesList(scope).slice();
    const duplicate = list.find((entry) => buildTherapyFavoriteIdentityKey(entry) === buildTherapyFavoriteIdentityKey(draft) && entry.id !== editingId);
    if (duplicate) {
      setStatus(`Ta terapija već postoji: ${buildTherapyFavoriteLine(duplicate)}. Uredite postojeći zapis.`, true);
      startEditingTherapyFavorite(scope, duplicate.id);
      return false;
    }
    const index = editingId ? list.findIndex((entry) => entry.id === editingId) : -1;
    const entry = { ...draft, id: index >= 0 ? list[index].id : createTherapyFavoriteId(), sortOrder: index >= 0 ? index : list.length };
    if (index >= 0) list[index] = entry;
    else list.push(entry);
    writeTherapyFavoritesCache(scope, list);
    resetTherapyFavoriteForm(scope);
    renderTherapyFavoritesSettings();
    hideTherapyAutocomplete();
    setStatus(`${scope === 'shared' ? 'Zajednička' : 'Osobna'} terapija je spremljena u kontroliranu listu.`);
    return true;
  }

  function startEditingTherapyFavorite(scope, id) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) return false;
    const entry = getTherapyFavoritesList(scope).find((item) => item.id === id);
    if (!entry) return false;
    const controls = getTherapyFavoriteFormElements(scope);
    if (controls.name) controls.name.value = entry.name;
    if (controls.strength) controls.strength.value = entry.strength;
    if (controls.formText) controls.formText.value = entry.form;
    if (controls.regimen) controls.regimen.value = entry.regimen;
    state.therapyFavorites[scope === 'shared' ? 'editingSharedId' : 'editingPersonalId'] = entry.id;
    controls.cancel?.classList.remove('hidden');
    const submit = controls.form?.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Spremi izmjene';
    updateTherapyFavoritePreview(scope);
    controls.name?.focus();
    return true;
  }

  function deleteTherapyFavorite(scope, id) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) return false;
    const list = getTherapyFavoritesList(scope);
    const entry = list.find((item) => item.id === id);
    if (!entry || !window.confirm(`Jeste li sigurni da želite obrisati terapiju?\n\n${buildTherapyFavoriteLine(entry)}`)) return false;
    writeTherapyFavoritesCache(scope, list.filter((item) => item.id !== id));
    resetTherapyFavoriteForm(scope);
    renderTherapyFavoritesSettings();
    setStatus('Terapija je obrisana iz kontrolirane liste.');
    return true;
  }

  function moveTherapyFavorite(scope, id, delta) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) return false;
    const list = getTherapyFavoritesList(scope).slice();
    const index = list.findIndex((entry) => entry.id === id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return false;
    [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
    const nowIso = new Date().toISOString();
    writeTherapyFavoritesCache(scope, list.map((entry, sortOrder) => ({
      ...entry,
      sortOrder,
      updatedAt: (sortOrder === index || sortOrder === nextIndex) ? nowIso : entry.updatedAt,
      updatedBy: (sortOrder === index || sortOrder === nextIndex) ? getTherapyFavoritesActorId() : entry.updatedBy
    })));
    renderTherapyFavoritesSettings();
    return true;
  }

  function renderTherapyFavoriteList(scope) {
    const container = scope === 'shared' ? els.sharedTherapyFavoritesList : els.personalTherapyFavoritesList;
    if (!container) return;
    const list = getTherapyFavoritesList(scope);
    const editable = scope !== 'shared' || canEditSharedTherapyFavorites();
    if (!list.length) {
      container.innerHTML = `<div class="therapy-favorite-empty">${scope === 'shared' ? 'Nema sinkroniziranih zajedničkih terapija.' : 'Još nema osobnih terapija.'}</div>`;
      return;
    }
    container.innerHTML = list.map((entry, index) => {
      const actions = editable
        ? `<div class="therapy-favorite-row-actions"><button type="button" class="secondary" data-therapy-favorite-action="up" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}" title="Pomakni gore" aria-label="Pomakni terapiju gore" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" class="secondary" data-therapy-favorite-action="down" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}" title="Pomakni dolje" aria-label="Pomakni terapiju dolje" ${index === list.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="secondary" data-therapy-favorite-action="edit" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}">Uredi</button><button type="button" class="secondary danger" data-therapy-favorite-action="delete" data-therapy-favorite-scope="${scope}" data-therapy-favorite-id="${therapyEscapeHtml(entry.id)}">Obriši</button></div>`
        : '';
      return `<div class="therapy-favorite-row"><div class="therapy-favorite-row-text">${therapyEscapeHtml(buildTherapyFavoriteLine(entry))}</div>${actions}</div>`;
    }).join('');
  }

  function renderTherapyFavoritesSettings() {
    if (!state.therapyFavorites) return;
    const sharedEditable = canEditSharedTherapyFavorites();
    if (els.therapyFavoritesSyncStatus) {
      els.therapyFavoritesSyncStatus.textContent = state.therapyFavorites.sync.available
        ? 'Terapijske postavke su sinkronizirane preko autentificiranog backenda.'
        : 'Terapijske postavke rade iz lokalne predmemorije ovog uređaja. Sinkronizacija među uređajima i uređivanje zajedničke liste nisu dostupni jer sigurni autentificirani backend nije konfiguriran.';
    }
    const sharedControls = getTherapyFavoriteFormElements('shared');
    [sharedControls.name, sharedControls.strength, sharedControls.formText, sharedControls.regimen]
      .filter(Boolean).forEach((control) => { control.disabled = !sharedEditable; });
    sharedControls.form?.setAttribute('aria-disabled', String(!sharedEditable));
    sharedControls.form?.querySelectorAll('button').forEach((button) => { button.disabled = !sharedEditable; });
    if (els.exportSharedTherapyFavoritesBtn) els.exportSharedTherapyFavoritesBtn.disabled = !sharedEditable;
    if (els.importSharedTherapyFavoritesBtn) els.importSharedTherapyFavoritesBtn.disabled = !sharedEditable;
    renderTherapyFavoriteList('personal');
    renderTherapyFavoriteList('shared');
    updateTherapyFavoritePreview('personal');
    updateTherapyFavoritePreview('shared');
  }

  function buildTherapyFavoritesBackup(scope) {
    return {
      schema: THERAPY_FAVORITES_BACKUP_SCHEMA,
      schemaVersion: THERAPY_FAVORITES_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      scope,
      items: normalizeTherapyFavoriteList(getTherapyFavoritesList(scope))
    };
  }

  function exportTherapyFavorites(scope) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) {
      setStatus('Zajedničke terapije može izvesti samo potvrđeni administrator preko sigurnog backenda.', true);
      return false;
    }
    const payload = buildTherapyFavoritesBackup(scope);
    const filename = `temperaturna-lista-${scope === 'shared' ? 'zajednicke' : 'moje'}-terapije.json`;
    downloadBlob(filename, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    setStatus(`Izvezena je zasebna sigurnosna kopija: ${filename}`);
    return true;
  }

  function sanitizeTherapyFavoritesBackup(parsed, requestedScope) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if (parsed.schema !== THERAPY_FAVORITES_BACKUP_SCHEMA || Number(parsed.schemaVersion) !== THERAPY_FAVORITES_SCHEMA_VERSION) return null;
    if (parsed.scope !== requestedScope) return null;
    return normalizeTherapyFavoriteList(parsed.items || [], { updatedBy: getTherapyFavoritesActorId() });
  }

  function importTherapyFavoritesFile(scope, file) {
    if (scope === 'shared' && !canEditSharedTherapyFavorites()) {
      setStatus('Uvoz zajedničkih terapija blokiran je bez potvrđene administratorske ovlasti.', true);
      return;
    }
    if (!file || file.size > 1024 * 1024) {
      setStatus('Datoteka terapijskih postavki nije valjana ili je prevelika.', true);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setStatus('Datoteku terapijskih postavki nije moguće pročitati.', true);
    reader.onload = () => {
      try {
        const items = sanitizeTherapyFavoritesBackup(JSON.parse(String(reader.result || '{}')), scope);
        if (!items) throw new Error('Nepodržana shema ili vrsta liste.');
        writeTherapyFavoritesCache(scope, items);
        resetTherapyFavoriteForm(scope);
        renderTherapyFavoritesSettings();
        setStatus(`Uvezeno je ${items.length} terapijskih postavki. Duplikati i nevaljani zapisi su odbačeni.`);
      } catch (error) {
        setStatus(`Uvoz terapijskih postavki nije uspio: ${error?.message || error}`, true);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function wireTherapyFavoritesSettings() {
    ['personal', 'shared'].forEach((scope) => {
      const controls = getTherapyFavoriteFormElements(scope);
      [controls.name, controls.strength, controls.formText, controls.regimen].filter(Boolean).forEach((control) => {
        control.addEventListener('input', () => updateTherapyFavoritePreview(scope));
        control.addEventListener('change', () => updateTherapyFavoritePreview(scope));
      });
      controls.form?.addEventListener('submit', (event) => {
        event.preventDefault();
        saveTherapyFavoriteFromForm(scope);
      });
      controls.cancel?.addEventListener('click', () => resetTherapyFavoriteForm(scope));
    });
    [els.personalTherapyFavoritesList, els.sharedTherapyFavoritesList].filter(Boolean).forEach((container) => {
      container.addEventListener('click', (event) => {
        const button = event.target.closest('[data-therapy-favorite-action]');
        if (!button) return;
        const scope = button.dataset.therapyFavoriteScope;
        const id = button.dataset.therapyFavoriteId;
        if (button.dataset.therapyFavoriteAction === 'edit') startEditingTherapyFavorite(scope, id);
        if (button.dataset.therapyFavoriteAction === 'delete') deleteTherapyFavorite(scope, id);
        if (button.dataset.therapyFavoriteAction === 'up') moveTherapyFavorite(scope, id, -1);
        if (button.dataset.therapyFavoriteAction === 'down') moveTherapyFavorite(scope, id, 1);
      });
    });
    els.exportPersonalTherapyFavoritesBtn?.addEventListener('click', () => exportTherapyFavorites('personal'));
    els.importPersonalTherapyFavoritesBtn?.addEventListener('click', () => els.personalTherapyFavoritesInput?.click());
    els.personalTherapyFavoritesInput?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) importTherapyFavoritesFile('personal', file);
      event.target.value = '';
    });
    els.exportSharedTherapyFavoritesBtn?.addEventListener('click', () => exportTherapyFavorites('shared'));
    els.importSharedTherapyFavoritesBtn?.addEventListener('click', () => els.sharedTherapyFavoritesInput?.click());
    els.sharedTherapyFavoritesInput?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      if (file) importTherapyFavoritesFile('shared', file);
      event.target.value = '';
    });
  }

  function initTherapyFavorites() {
    purgeLegacyTherapyAutocompleteStorage();
    loadTherapyFavoritesForCurrentUser();
    wireTherapyFavoritesSettings();
    state.therapyFavorites.initialized = true;
  }
