// ============================================================
  // MODULE: 40-rendering-ui.js
  // Source module; tools/build-offline-html.js inlines modules for offline use.
  // ============================================================
function drawPreviewErrorFallback(canvas, pageLabel, error) {
    try {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff7ed';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#7c2d12';
      ctx.font = '24px Arial, sans-serif';
      ctx.fillText(`Preview nije mogao nacrtati ${pageLabel}.`, 40, 70);
      ctx.font = '18px Arial, sans-serif';
      ctx.fillText('Aplikacija i parser nastavljaju raditi; pošalji ovu grešku ako se ponavlja.', 40, 105);
      const detail = String(error?.message || error || '').slice(0, 180);
      if (detail) ctx.fillText(detail, 40, 140);
    } catch (fallbackError) {
      console.error('Ne mogu nacrtati fallback preview.', fallbackError);
    }
  }

  function safeRenderPageToCanvas(canvas, layoutKey, model, pageNumber) {
    try {
      renderPageToCanvas(canvas, layoutKey, model, pageNumber, { showLabHighlights: true });
    } catch (error) {
      console.error(`Greška renderiranja previewa ${pageNumber}. stranice`, error);
      drawPreviewErrorFallback(canvas, `${pageNumber}. stranicu`, error);
      setStatus(`Greška u živom pregledu ${pageNumber}. stranice: ${error?.message || error}`, true);
    }
  }

  function updatePreviewPageControls(model) {
    const pairStart = normalizePreviewPagePairStart(model?.previewPagePairStart || state.previewPagePairStart);
    const [firstPageNumber, secondPageNumber] = getPreviewPairPageNumbers(pairStart);
    state.previewPagePairStart = pairStart;
    state.previewListIndex = pairStart;
    state.previewListCount = Math.max(state.previewListCount || 2, secondPageNumber);

    const slotButtons = [els.previewPageSlot1Btn, els.previewPageSlot2Btn];
    slotButtons.forEach((button, index) => {
      if (!button) return;
      const pageNumber = index === 0 ? firstPageNumber : secondPageNumber;
      const isActive = Number(state.previewActiveSlot || 1) === index + 1;
      button.textContent = `Stranica ${pageNumber}`;
      button.dataset.previewPageNumber = String(pageNumber);
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (els.previewPrevPagePairBtn) {
      els.previewPrevPagePairBtn.disabled = pairStart <= FIRST_PREVIEW_PAGE_PAIR_START;
    }
    if (els.previewNextPagePairBtn) {
      els.previewNextPagePairBtn.disabled = false;
    }
    document.body.classList.remove('preview-continuation-print-mode');
    els.shell1?.closest('.page-card')?.classList.add('is-preview-selected');
    els.shell2?.closest('.page-card')?.classList.add('is-preview-selected');
  }

  function scrollPreviewSlotIntoView(slot) {
    const targetCard = (Number(slot) === 2 ? els.shell2 : els.shell1)?.closest('.page-card');
    if (!targetCard) return;
    const controlsRow = els.previewPageControls?.closest('.preview-title-row');
    const controlsHeight = controlsRow ? Math.ceil(controlsRow.getBoundingClientRect().height) : 0;
    const scrollTop = targetCard.getBoundingClientRect().top + window.scrollY - controlsHeight - 12;
    window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'auto' });
  }

  function maybeAskToCarryTherapyForPair(pairStart) {
    const normalizedStart = normalizePreviewPagePairStart(pairStart);
    if (normalizedStart <= FIRST_PREVIEW_PAGE_PAIR_START) return;
    if (!((els.therapy?.value || '').trim())) return;
    if (Object.prototype.hasOwnProperty.call(state.previewTherapyCarryByPair, normalizedStart)) return;
    state.previewTherapyCarryByPair[normalizedStart] = window.confirm('Želite li povući terapiju s prethodne stranice liste?');
  }

  function selectPreviewPagePair(pairStart, options = {}) {
    const normalizedStart = normalizePreviewPagePairStart(pairStart);
    maybeAskToCarryTherapyForPair(normalizedStart);
    state.previewPagePairStart = normalizedStart;
    state.previewListIndex = normalizedStart;
    state.previewListCount = Math.max(state.previewListCount || 2, normalizedStart + 1);
    state.previewActiveSlot = Number(options.activeSlot || 1) === 2 ? 2 : 1;
    const model = renderAll();
    if (options.scroll) scrollPreviewSlotIntoView(state.previewActiveSlot);
    return model;
  }

  function wirePreviewPageControls() {
    els.previewPrevPagePairBtn?.addEventListener('click', () => {
      const previousStart = Math.max(FIRST_PREVIEW_PAGE_PAIR_START, getPreviewPagePairStart() - PREVIEW_PAGE_PAIR_SIZE);
      selectPreviewPagePair(previousStart, { scroll: true, activeSlot: 1 });
    });

    els.previewNextPagePairBtn?.addEventListener('click', () => {
      selectPreviewPagePair(getPreviewPagePairStart() + PREVIEW_PAGE_PAIR_SIZE, { scroll: true, activeSlot: 1 });
    });

    [els.previewPageSlot1Btn, els.previewPageSlot2Btn].forEach((button, index) => {
      button?.addEventListener('click', () => {
        state.previewActiveSlot = index + 1;
        updatePreviewPageControls(deriveDocumentModel(getFormData()));
        scrollPreviewSlotIntoView(index + 1);
      });
    });
  }

  function selectPreviewList(listIndex, options = {}) {
    return selectPreviewPagePair(listIndex, options);
  }

  function renderAll() {
    let model;
    try {
      model = deriveDocumentModel(getFormData());
    } catch (error) {
      console.error('Greška pripreme modela za preview.', error);
      drawPreviewErrorFallback(els.canvas1, '1. stranicu', error);
      drawPreviewErrorFallback(els.canvas2, '2. stranicu', error);
      setStatus(`Greška pripreme živog pregleda: ${error?.message || error}`, true);
      return null;
    }
    els.page1Title.textContent = model.previewPages?.[0]?.title || model.page1Title;
    els.page2Title.textContent = model.previewPages?.[1]?.title || model.page2Title;
    els.shell1.dataset.layout = model.page1LayoutKey;
    els.shell2.dataset.layout = model.page2LayoutKey;
    els.shell1.dataset.previewPage = String(model.previewPages?.[0]?.pageNumber || 1);
    els.shell2.dataset.previewPage = String(model.previewPages?.[1]?.pageNumber || 2);
    updatePreviewPageControls(model);
    safeRenderPageToCanvas(els.canvas1, model.page1LayoutKey, model, 1);
    safeRenderPageToCanvas(els.canvas2, model.page2LayoutKey, model, 2);
    try {
      updateTextOverflowWarningStatus(collectTextOverflowWarnings(model));
      updateFastFocusPanel(model);
      renderAdminOverlays();
      updateLabWarningStatus(model.labWarnings || []);
    } catch (error) {
      console.error('Greška pomoćnih preview panela.', error);
      setStatus(`Preview je nacrtan, ali pomoćni panel ima grešku: ${error?.message || error}`, true);
    }
    return model;
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function supportsNativeSavePicker() {
    return typeof window.showSaveFilePicker === 'function';
  }

  async function saveBlobWithNativePicker(blob, suggestedName, pickerOptions = {}) {
    if (!supportsNativeSavePicker()) return null;
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: pickerOptions.types || [
        {
          description: 'JSON datoteka',
          accept: { 'application/json': ['.json'] }
        }
      ],
      excludeAcceptAllOption: false
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return handle.name || suggestedName;
  }

  function sanitizeFilenamePart(name) {
    return String(name || '')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function ensureExtension(filename, extension) {
    const clean = sanitizeFilenamePart(filename);
    if (!clean) return '';
    const lower = clean.toLowerCase();
    return lower.endsWith(extension.toLowerCase()) ? clean : `${clean}${extension}`;
  }

  function getLocalIsoDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getPatientInitials(name) {
    const cleaned = String(name || '')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';

    const initials = cleaned
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();

    return sanitizeFilenamePart(initials).replace(/\s+/g, '');
  }

  function getSuggestedPatientFilenameBase(defaultFilename, extension, savedAt = new Date()) {
    const fallback = defaultFilename.replace(new RegExp(`${extension.replace('.', '\\.')}$`, 'i'), '');
    const fullName = els.fullName ? els.fullName.value : '';
    const initials = getPatientInitials(fullName);
    const saveDate = getLocalIsoDateString(savedAt);

    if (initials) return `TL_${initials}_${saveDate}`;
    return `TL_${saveDate}` || fallback;
  }

  function askFilename(defaultFilename, extension, label, suggestedBaseName) {
    const fallbackBase = defaultFilename.replace(new RegExp(`${extension.replace('.', '\\.')}$`, 'i'), '');
    const baseDefault = sanitizeFilenamePart(suggestedBaseName || '') || fallbackBase;
    const answer = window.prompt(`Unesite naziv datoteke za ${label}:`, baseDefault);
    if (answer === null) return null;
    const finalName = ensureExtension(answer, extension);
    if (!finalName) {
      setStatus('Naziv datoteke nije unesen.', true);
      return null;
    }
    return finalName;
  }

  function buildPatientDataEnvelope(exportedAt = new Date()) {
    return {
      version: 1,
      exportedAt: exportedAt.toISOString(),
      data: getFormData()
    };
  }

  function getBackupAuthContextSnapshot() {
    const authContext = typeof getFirebaseAuthContext === 'function'
      ? getFirebaseAuthContext()
      : {};
    return {
      uid: String(authContext.uid || ''),
      email: String(authContext.email || ''),
      organizationId: String(authContext.organizationId || ''),
      wardIds: Array.isArray(authContext.wardIds) ? authContext.wardIds.map(String) : [],
      activeWardId: String(authContext.activeWardId || ''),
      roles: Array.isArray(authContext.roles) ? authContext.roles.map(String) : [],
      hasValidClinicalContext: Boolean(authContext.hasValidClinicalContext)
    };
  }

  function buildDowntimeBackupEnvelope(exportedAt = new Date()) {
    return {
      schema: DOWNTIME_BACKUP_SCHEMA,
      version: 1,
      appVersion: APP_VERSION,
      exportedAt: exportedAt.toISOString(),
      containsPatientData: true,
      authorizedUseOnly: true,
      retentionPolicy: RETENTION_POLICY,
      availability: { ...state.appAvailability },
      authContext: getBackupAuthContextSnapshot(),
      data: getFormData()
    };
  }

  function formatPatientDraftSavedAt(value) {
    if (!value) return 'nepoznato vrijeme';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'nepoznato vrijeme';
    return date.toLocaleString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function setPatientDraftStatus(message, tone = 'neutral', details = {}) {
    [els.patientDraftStatus, els.patientDraftAdvancedStatus].filter(Boolean).forEach((element) => {
      element.textContent = message || '';
      element.classList.toggle('ok', tone === 'ok');
      element.classList.toggle('warn', tone === 'warn');
      element.classList.toggle('error', tone === 'error');
      element.dataset.draftState = details.state || tone || 'neutral';
      element.dataset.savedAt = details.savedAt || '';
      element.dataset.appVersion = details.appVersion || '';
    });
  }

  function getPatientDraftExpiry(savedAt = new Date()) {
    const base = savedAt instanceof Date ? savedAt : new Date(savedAt);
    const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
    return new Date(safeBase.getTime() + PATIENT_DRAFT_TTL_MS).toISOString();
  }

  function isPatientDraftExpired(expiresAt, now = new Date()) {
    const date = new Date(expiresAt || '');
    return !expiresAt || Number.isNaN(date.getTime()) || date.getTime() <= now.getTime();
  }

  function hasPatientDraftCryptoSupport() {
    return Boolean(window.crypto?.subtle && typeof window.crypto.getRandomValues === 'function' && window.TextEncoder && window.TextDecoder);
  }

  function bytesToBase64(bytes) {
    const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    let binary = '';
    for (let index = 0; index < array.length; index += 0x8000) {
      binary += String.fromCharCode.apply(null, array.subarray(index, index + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  async function derivePatientDraftKey(passphrase, saltBytes) {
    if (!hasPatientDraftCryptoSupport()) throw new Error('Web Crypto API nije dostupan.');
    const encodedPassphrase = new TextEncoder().encode(String(passphrase || ''));
    const baseKey = await crypto.subtle.importKey(
      'raw',
      encodedPassphrase,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: PATIENT_DRAFT_PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function getPatientDraftDataSignature(data) {
    try {
      return JSON.stringify(data || {});
    } catch (error) {
      return '';
    }
  }

  function shouldMarkPatientDraftForStartupRecovery(data) {
    if (!isPatientDataDifferentFromEmpty(data)) return false;
    const currentSignature = getPatientDraftDataSignature(data);
    const savedFirebaseSignature = state.firebasePatients.currentRecordId
      ? state.firebasePatients.lastAutoSaveSignature
      : '';
    return Boolean(!savedFirebaseSignature || currentSignature !== savedFirebaseSignature);
  }

  function buildPatientDraftPayload(savedAt = new Date(), options = {}) {
    const data = getFormData();
    const startupRecovery = typeof options.startupRecovery === 'boolean'
      ? options.startupRecovery
      : shouldMarkPatientDraftForStartupRecovery(data);
    return {
      version: PATIENT_DRAFT_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      savedAt: savedAt.toISOString(),
      startupRecovery,
      recoveryReason: startupRecovery
        ? String(options.recoveryReason || 'unsaved-patient').slice(0, 80)
        : '',
      data
    };
  }

  const PatientDraftStorage = Object.freeze({
    readEncryptedMetadata() {
      const raw = safeLocalStorageGetItem(STORAGE_KEYS.patientDraft);
      if (!raw) return null;
      if (raw.length > PATIENT_JSON_SCHEMA.maxFileSizeBytes * 3) {
        safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
        return { kind: 'invalid' };
      }
      try {
        const parsed = JSON.parse(raw);
        if (!isPlainJsonObject(parsed) || parsed.schema !== PATIENT_DRAFT_ENCRYPTION_SCHEMA) {
          safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
          return { kind: 'invalid' };
        }
        const metadata = {
          kind: 'encrypted',
          version: Number(parsed.version || 0),
          appVersion: String(parsed.appVersion || ''),
          savedAt: String(parsed.savedAt || ''),
          expiresAt: String(parsed.expiresAt || ''),
          envelope: parsed
        };
        if (!metadata.savedAt || isPatientDraftExpired(metadata.expiresAt)) {
          safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
          return { ...metadata, kind: 'expired' };
        }
        return metadata;
      } catch (error) {
        safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
        return { kind: 'invalid' };
      }
    },

    readLegacyMetadata() {
      const raw = safeLocalStorageGetItem(STORAGE_KEYS.legacyPatientDraft);
      if (!raw) return null;
      if (raw.length > PATIENT_JSON_SCHEMA.maxFileSizeBytes) {
        return { kind: 'legacy', savedAt: '', appVersion: '', canMigrate: false };
      }
      try {
        const parsed = JSON.parse(raw);
        const data = isPlainJsonObject(parsed) && isPlainJsonObject(parsed.data) ? parsed.data : parsed;
        const validated = validatePatientDataObject(data);
        return {
          kind: 'legacy',
          savedAt: String(parsed?.savedAt || ''),
          appVersion: String(parsed?.appVersion || ''),
          canMigrate: Boolean(validated.ok)
        };
      } catch (error) {
        return { kind: 'legacy', savedAt: '', appVersion: '', canMigrate: false };
      }
    },

    readMetadata() {
      const legacy = this.readLegacyMetadata();
      if (legacy) return legacy;
      return this.readEncryptedMetadata();
    },

    readLegacyDraft() {
      const raw = safeLocalStorageGetItem(STORAGE_KEYS.legacyPatientDraft);
      if (!raw || raw.length > PATIENT_JSON_SCHEMA.maxFileSizeBytes) return null;
      try {
        const parsed = JSON.parse(raw);
        const data = isPlainJsonObject(parsed) && isPlainJsonObject(parsed.data) ? parsed.data : parsed;
        const validated = validatePatientDataObject(data);
        if (!validated.ok) return null;
        return {
          version: Number(parsed.version || 0),
          appVersion: String(parsed.appVersion || ''),
          savedAt: String(parsed.savedAt || ''),
          startupRecovery: Boolean(parsed.startupRecovery),
          recoveryReason: String(parsed.recoveryReason || 'legacy-cleartext'),
          data: validated.data
        };
      } catch (error) {
        return null;
      }
    },

    async writeEncrypted(draftPayload, passphrase) {
      if (!hasPatientDraftCryptoSupport()) return { ok: false, reason: 'crypto-unavailable' };
      if (!passphrase) return { ok: false, reason: 'missing-passphrase' };
      const savedAt = String(draftPayload.savedAt || new Date().toISOString());
      const expiresAt = getPatientDraftExpiry(savedAt);
      const saltBytes = new Uint8Array(16);
      const ivBytes = new Uint8Array(12);
      crypto.getRandomValues(saltBytes);
      crypto.getRandomValues(ivBytes);
      const key = await derivePatientDraftKey(passphrase, saltBytes);
      const encryptedPayload = {
        ...draftPayload,
        expiresAt
      };
      const encodedPayload = new TextEncoder().encode(JSON.stringify(encryptedPayload));
      const cipherBytes = new Uint8Array(await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivBytes },
        key,
        encodedPayload
      ));
      const envelope = {
        schema: PATIENT_DRAFT_ENCRYPTION_SCHEMA,
        version: PATIENT_DRAFT_SCHEMA_VERSION,
        appVersion: APP_VERSION,
        savedAt,
        expiresAt,
        salt: bytesToBase64(saltBytes),
        iv: bytesToBase64(ivBytes),
        payload: bytesToBase64(cipherBytes)
      };
      const saved = safeLocalStorageSetItem(STORAGE_KEYS.patientDraft, JSON.stringify(envelope));
      if (!saved) return { ok: false, reason: 'storage-unavailable' };
      return {
        ok: true,
        metadata: {
          kind: 'encrypted',
          version: PATIENT_DRAFT_SCHEMA_VERSION,
          appVersion: APP_VERSION,
          savedAt,
          expiresAt,
          envelope
        }
      };
    },

    async decryptEncrypted(envelope, passphrase) {
      if (!hasPatientDraftCryptoSupport()) return { ok: false, reason: 'crypto-unavailable' };
      if (!isPlainJsonObject(envelope) || envelope.schema !== PATIENT_DRAFT_ENCRYPTION_SCHEMA) return { ok: false, reason: 'invalid-envelope' };
      if (isPatientDraftExpired(envelope.expiresAt)) {
        safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
        return { ok: false, reason: 'expired' };
      }
      try {
        const saltBytes = base64ToBytes(envelope.salt);
        const ivBytes = base64ToBytes(envelope.iv);
        const cipherBytes = base64ToBytes(envelope.payload);
        const key = await derivePatientDraftKey(passphrase, saltBytes);
        const plainBytes = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBytes },
          key,
          cipherBytes
        );
        const parsed = JSON.parse(new TextDecoder().decode(plainBytes));
        const data = isPlainJsonObject(parsed) && isPlainJsonObject(parsed.data) ? parsed.data : null;
        const validated = validatePatientDataObject(data);
        if (!validated.ok) return { ok: false, reason: 'invalid-payload' };
        return {
          ok: true,
          draft: {
            version: Number(parsed.version || 0),
            appVersion: String(parsed.appVersion || envelope.appVersion || ''),
            savedAt: String(parsed.savedAt || envelope.savedAt || ''),
            expiresAt: String(parsed.expiresAt || envelope.expiresAt || ''),
            startupRecovery: Boolean(parsed.startupRecovery),
            recoveryReason: String(parsed.recoveryReason || ''),
            data: validated.data
          }
        };
      } catch (error) {
        return { ok: false, reason: 'wrong-passphrase' };
      }
    },

    clearAll() {
      safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);
      safeLocalStorageRemoveItem(STORAGE_KEYS.legacyPatientDraft);
    }
  });

  function readPatientDraftFromStorage() {
    return PatientDraftStorage.readMetadata();
  }

  function resetPatientDraftSession() {
    patientDraftSessionPassphrase = '';
    state.patientDraft.mode = PATIENT_DRAFT_STORAGE_MODES.DISABLED;
    state.patientDraft.cryptoKey = null;
    state.patientDraft.expiresAt = '';
  }

  function setEncryptedPatientDraftSession(passphrase, expiresAt) {
    patientDraftSessionPassphrase = String(passphrase || '');
    state.patientDraft.mode = patientDraftSessionPassphrase
      ? PATIENT_DRAFT_STORAGE_MODES.ENCRYPTED_LOCAL
      : PATIENT_DRAFT_STORAGE_MODES.DISABLED;
    state.patientDraft.cryptoKey = null;
    state.patientDraft.expiresAt = String(expiresAt || getPatientDraftExpiry());
  }

  function requestPatientDraftPassphrase(actionLabel) {
    const label = actionLabel || 'šifrirani lokalni oporavak';
    const passphrase = window.prompt(`Unesite passphrase za ${label}. Passphrase se ne sprema u preglednik:`, '');
    if (passphrase === null) return null;
    if (String(passphrase).length < 8) {
      setPatientDraftStatus('Passphrase mora imati najmanje 8 znakova.', 'error', { state: 'error' });
      setStatus('Passphrase za šifrirani lokalni oporavak mora imati najmanje 8 znakova.', true);
      return null;
    }
    return String(passphrase);
  }

  function updatePatientDraftControls(draft = readPatientDraftFromStorage(), options = {}) {
    const metadata = draft || null;
    const hasStoredDraft = Boolean(metadata && ['encrypted', 'legacy'].includes(metadata.kind));
    const encryptedSessionActive = state.patientDraft.mode === PATIENT_DRAFT_STORAGE_MODES.ENCRYPTED_LOCAL && Boolean(patientDraftSessionPassphrase);
    if (els.enableEncryptedPatientDraftBtn) {
      els.enableEncryptedPatientDraftBtn.disabled = !hasPatientDraftCryptoSupport();
      els.enableEncryptedPatientDraftBtn.textContent = encryptedSessionActive ? 'Promijeni passphrase' : 'Uključi šifrirani oporavak';
    }
    if (els.restorePatientDraftBtn) {
      els.restorePatientDraftBtn.disabled = !hasStoredDraft;
      els.restorePatientDraftBtn.textContent = metadata?.kind === 'legacy'
        ? 'Migriraj stari draft'
        : 'Vrati šifrirani draft';
    }
    if (els.clearPatientDraftBtn) {
      els.clearPatientDraftBtn.disabled = !hasStoredDraft && !encryptedSessionActive;
      els.clearPatientDraftBtn.textContent = metadata?.kind === 'legacy'
        ? 'Trajno obriši lokalni draft'
        : 'Obriši lokalni draft';
    }
    if (els.downloadPatientBackupBtn) els.downloadPatientBackupBtn.disabled = !isPatientDataDifferentFromEmpty(getFormData());
    if (options.preserveStatus) return;
    if (!hasPatientDraftCryptoSupport()) {
      setPatientDraftStatus('Lokalni auto-save pacijentnih podataka je isključen. Preglednik ne podržava Web Crypto oporavak.', 'warn', { state: 'crypto-unavailable' });
      return;
    }
    if (metadata?.kind === 'legacy') {
      const suffix = metadata.canMigrate ? 'Možeš ga trajno obrisati ili jednokratno otvoriti i migrirati u šifrirani draft.' : 'Format nije čitljiv; preporuka je trajno brisanje.';
      setPatientDraftStatus(`Pronađen je stari nešifrirani lokalni draft. Neće se automatski otvoriti. ${suffix}`, 'warn', {
        state: 'legacy',
        savedAt: metadata.savedAt,
        appVersion: metadata.appVersion
      });
      return;
    }
    if (metadata?.kind === 'expired') {
      resetPatientDraftSession();
      setPatientDraftStatus('Šifrirani lokalni draft je istekao i obrisan.', 'warn', { state: 'expired' });
      return;
    }
    if (encryptedSessionActive) {
      setPatientDraftStatus(`Šifrirani lokalni oporavak je uključen do ${formatPatientDraftSavedAt(state.patientDraft.expiresAt)}.`, 'ok', {
        state: 'encrypted-local',
        savedAt: state.patientDraft.lastSavedAt,
        appVersion: APP_VERSION
      });
      return;
    }
    if (metadata?.kind === 'encrypted') {
      setPatientDraftStatus(`Šifrirani lokalni draft je pronađen. Za vraćanje unesite passphrase. Vrijedi do ${formatPatientDraftSavedAt(metadata.expiresAt)}.`, 'warn', {
        state: 'encrypted-waiting',
        savedAt: metadata.savedAt,
        appVersion: metadata.appVersion
      });
      return;
    }
    setPatientDraftStatus('Lokalni auto-save pacijentnih podataka je isključen.', 'neutral', { state: 'disabled' });
  }

  async function savePatientDraftNow(options = {}) {
    if (state.patientDraft.suppressSave) return false;
    const data = getFormData();
    if (!isPatientDataDifferentFromEmpty(data)) {
      clearPatientDraft({ quiet: true });
      updatePatientDraftControls(null);
      return true;
    }
    if (state.patientDraft.mode !== PATIENT_DRAFT_STORAGE_MODES.ENCRYPTED_LOCAL || !patientDraftSessionPassphrase) {
      updatePatientDraftControls(undefined, { preserveStatus: true });
      return false;
    }
    const payload = buildPatientDraftPayload(new Date(), options);
    state.patientDraft.saveInFlight = true;
    let result;
    try {
      result = await PatientDraftStorage.writeEncrypted(payload, patientDraftSessionPassphrase);
    } catch (error) {
      console.warn('Šifrirani lokalni oporavak nije uspio.', error);
      result = { ok: false, reason: 'crypto-error' };
    } finally {
      state.patientDraft.saveInFlight = false;
    }
    if (!result.ok) {
      const message = result.reason === 'crypto-unavailable'
        ? 'Šifrirani lokalni oporavak nije dostupan u ovom pregledniku.'
        : 'Šifrirani lokalni oporavak nije uspio: lokalna pohrana preglednika nije dostupna ili je puna.';
      setPatientDraftStatus(message, 'error', { state: 'error' });
      return false;
    }
    state.patientDraft.lastSavedAt = payload.savedAt;
    state.patientDraft.expiresAt = result.metadata.expiresAt;
    safeLocalStorageRemoveItem(STORAGE_KEYS.legacyPatientDraft);
    if (!/^firebase-/i.test(String(options.recoveryReason || '')) && !isCurrentPatientSyncedForPrint()) {
      setPatientSyncState({
        status: 'localOnly',
        lastSavedAt: payload.savedAt,
        lastSaveTarget: 'encrypted-local',
        lastError: '',
        currentPatientDocId: state.firebasePatients.currentRecordId || state.patientSyncState.currentPatientDocId || '',
        currentPatientVersion: getPatientSyncVersion(data),
        hasUnsavedChanges: true
      });
    }
    if (!options.quiet) {
      setPatientDraftStatus(`Šifrirani lokalni oporavak je uključen do ${formatPatientDraftSavedAt(result.metadata.expiresAt)}.`, 'ok', {
        state: 'encrypted-local',
        savedAt: payload.savedAt,
        appVersion: APP_VERSION
      });
    }
    updatePatientDraftControls(result.metadata, { preserveStatus: Boolean(options.quiet) });
    return true;
  }

  function schedulePatientDraftSave() {
    if (state.patientDraft.suppressSave) return;
    window.clearTimeout(state.patientDraft.saveTimer);
    state.patientDraft.saveTimer = window.setTimeout(() => savePatientDraftNow(), PATIENT_DRAFT_SAVE_DEBOUNCE_MS);
  }

  function clearPatientDraft(options = {}) {
    window.clearTimeout(state.patientDraft.saveTimer);
    state.patientDraft.saveTimer = null;
    state.patientDraft.lastSavedAt = '';
    PatientDraftStorage.clearAll();
    resetPatientDraftSession();
    if (!options.quiet) {
      setPatientDraftStatus('Lokalni draft pacijenta je obrisan za ovaj preglednik.', 'warn', { state: 'cleared' });
    }
    updatePatientDraftControls(null, { preserveStatus: !options.quiet });
  }

  function restorePatientDraft(draft, options = {}) {
    if (!draft) return false;
    state.patientDraft.suppressSave = true;
    state.firebasePatients.suppressAutoSave = true;
    try {
      resetCurrentFirebasePatientContext();
      setFormData(draft.data);
      renderAll();
      setPatientSyncState({
        status: 'localOnly',
        lastSavedAt: draft.savedAt || '',
        lastSaveTarget: 'encrypted-local',
        lastError: '',
        currentPatientDocId: '',
        currentPatientVersion: getPatientSyncVersion(draft.data),
        hasUnsavedChanges: true
      });
      setPatientDraftStatus(`Lokalni draft vraćen: ${formatPatientDraftSavedAt(draft.savedAt)}.`, 'ok', {
        state: 'restored',
        savedAt: draft.savedAt,
        appVersion: draft.appVersion
      });
      if (!options.quiet) setStatus('Vraćen je zadnji lokalni draft pacijenta.');
      return true;
    } finally {
      state.patientDraft.suppressSave = false;
      state.firebasePatients.suppressAutoSave = false;
      scheduleFirebasePatientAutoSave({ force: true });
      updatePatientDraftControls(undefined, { preserveStatus: true });
    }
  }

  async function migrateLegacyPatientDraft(options = {}) {
    const metadata = PatientDraftStorage.readLegacyMetadata();
    if (!metadata) return false;
    if (!metadata.canMigrate) {
      setPatientDraftStatus('Stari lokalni draft nije čitljiv. Možeš ga trajno obrisati.', 'error', { state: 'legacy-invalid' });
      return false;
    }
    const confirmed = window.confirm('Pronađen je stari nešifrirani lokalni draft. Neće se automatski otvoriti.\n\nŽelite li ga jednokratno otvoriti i odmah migrirati u šifrirani lokalni draft?');
    if (!confirmed) return false;
    const passphrase = requestPatientDraftPassphrase('migraciju starog lokalnog drafta');
    if (!passphrase) return false;
    const legacyDraft = PatientDraftStorage.readLegacyDraft();
    if (!legacyDraft || !isPatientDataDifferentFromEmpty(legacyDraft.data)) {
      setPatientDraftStatus('Stari lokalni draft nije čitljiv. Možeš ga trajno obrisati.', 'error', { state: 'legacy-invalid' });
      return false;
    }
    if (!options.skipConfirm && isPatientDataDifferentFromEmpty(getFormData())) {
      const replaceConfirmed = window.confirm('Vratiti stari lokalni draft i prepisati trenutno unesene podatke?');
      if (!replaceConfirmed) return false;
    }
    setEncryptedPatientDraftSession(passphrase, getPatientDraftExpiry());
    const restored = restorePatientDraft(legacyDraft, { ...options, quiet: true, skipConfirm: true });
    const saved = restored
      ? await savePatientDraftNow({ quiet: true, startupRecovery: true, recoveryReason: 'legacy-cleartext-migration' })
      : false;
    if (saved) {
      safeLocalStorageRemoveItem(STORAGE_KEYS.legacyPatientDraft);
      updatePatientDraftControls(undefined);
      setStatus('Stari nešifrirani lokalni draft je otvoren i migriran u šifrirani lokalni oporavak.');
    }
    return Boolean(restored && saved);
  }

  async function restorePatientDraftFromStorage(options = {}) {
    const metadata = readPatientDraftFromStorage();
    if (!metadata || !['encrypted', 'legacy'].includes(metadata.kind)) {
      setPatientDraftStatus('Lokalni draft nije pronađen za ovaj preglednik.', 'warn', { state: 'missing' });
      return false;
    }
    if (metadata.kind === 'legacy') {
      return migrateLegacyPatientDraft(options);
    }
    if (!options.skipConfirm && isPatientDataDifferentFromEmpty(getFormData())) {
      const confirmed = window.confirm('Vratiti šifrirani lokalni draft i prepisati trenutno unesene podatke?');
      if (!confirmed) return false;
    }
    const passphrase = patientDraftSessionPassphrase || requestPatientDraftPassphrase('vraćanje šifriranog lokalnog drafta');
    if (!passphrase) return false;
    const result = await PatientDraftStorage.decryptEncrypted(metadata.envelope, passphrase);
    if (!result.ok) {
      if (result.reason === 'expired') {
        resetPatientDraftSession();
        updatePatientDraftControls(undefined);
        setPatientDraftStatus('Šifrirani lokalni draft je istekao i obrisan.', 'warn', { state: 'expired' });
      } else {
        setPatientDraftStatus('Passphrase nije ispravan ili šifrirani lokalni draft nije čitljiv.', 'error', { state: 'decrypt-failed' });
        setStatus('Vraćanje šifriranog lokalnog drafta nije uspjelo.', true);
      }
      return false;
    }
    setEncryptedPatientDraftSession(passphrase, result.draft.expiresAt || metadata.expiresAt);
    return restorePatientDraft(result.draft, options);
  }

  function restorePatientDraftOnStartup() {
    const metadata = readPatientDraftFromStorage();
    updatePatientDraftControls(metadata);
    if (metadata?.kind === 'legacy') {
      setStatus('Pronađen je stari nešifrirani lokalni draft. Nije automatski otvoren.');
      return false;
    }
    if (metadata?.kind === 'encrypted') {
      setStatus('Pronađen je šifrirani lokalni draft. Za vraćanje treba unijeti passphrase.');
      return false;
    }
    return false;
  }

  async function enableEncryptedPatientDraftRecovery() {
    if (!hasPatientDraftCryptoSupport()) {
      setPatientDraftStatus('Preglednik ne podržava Web Crypto API, pa šifrirani lokalni oporavak nije dostupan.', 'error', { state: 'crypto-unavailable' });
      return false;
    }
    const passphrase = requestPatientDraftPassphrase('šifrirani lokalni oporavak');
    if (!passphrase) return false;
    setEncryptedPatientDraftSession(passphrase, getPatientDraftExpiry());
    const hasData = isPatientDataDifferentFromEmpty(getFormData());
    if (hasData) {
      const saved = await savePatientDraftNow({ quiet: false, recoveryReason: 'encrypted-local-enabled' });
      if (!saved) return false;
    } else {
      updatePatientDraftControls(null);
    }
    setStatus('Šifrirani lokalni oporavak je uključen samo za ovaj preglednik i ovu sesiju.');
    return true;
  }

  function downloadPatientBackupData() {
    const savedAt = new Date();
    const currentData = getFormData();
    if (!isPatientDataDifferentFromEmpty(currentData)) {
      setStatus('Nema unesenih podataka pacijenta za backup.', true);
      return;
    }
    savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'manual-backup' });
    const suggestedBase = getSuggestedPatientFilenameBase(PAGE.fileNames.patientData, '.json', savedAt).replace(/^TL_/, 'TL_BACKUP_');
    const filename = ensureExtension(suggestedBase || `TL_BACKUP_${getLocalIsoDateString(savedAt)}`, '.json');
    const blob = new Blob([JSON.stringify(buildPatientDataEnvelope(savedAt), null, 2)], { type: 'application/json' });
    downloadBlob(filename, blob);
    setStatus(`Backup pacijenta preuzet je kao JSON datoteka: ${filename}`);
  }

  function downloadDowntimeBackupData() {
    const savedAt = new Date();
    const currentData = getFormData();
    if (!isPatientDataDifferentFromEmpty(currentData)) {
      setDowntimeBackupStatus('Downtime backup nije preuzet jer nema unesenog pacijenta.', 'error');
      setStatus('Nema unesenih podataka pacijenta za downtime backup.', true);
      return;
    }
    savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'downtime-backup' });
    const suggestedBase = getSuggestedPatientFilenameBase(PAGE.fileNames.patientData, '.json', savedAt)
      .replace(/^TL_/, 'TL_DOWNTIME_BACKUP_');
    const filename = ensureExtension(suggestedBase || `TL_DOWNTIME_BACKUP_${getLocalIsoDateString(savedAt)}`, '.json');
    const blob = new Blob([JSON.stringify(buildDowntimeBackupEnvelope(savedAt), null, 2)], { type: 'application/json' });
    downloadBlob(filename, blob);
    setDowntimeBackupStatus(`Downtime backup preuzet: ${filename}. Datoteka sadrži kliničke podatke; čuvati samo na odobrenoj bolničkoj lokaciji.`, 'warn');
    setStatus(`Downtime backup preuzet je kao JSON datoteka: ${filename}`);
  }

  async function savePatientData() {
    const savedAt = new Date();
    const suggestedFilename = ensureExtension(
      getSuggestedPatientFilenameBase(PAGE.fileNames.patientData, '.json', savedAt) || PAGE.fileNames.patientData,
      '.json'
    );
    savePatientDraftNow({ quiet: true });
    const payload = buildPatientDataEnvelope(savedAt);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

    if (supportsNativeSavePicker()) {
      try {
        const savedName = await saveBlobWithNativePicker(blob, suggestedFilename, {
          types: [
            {
              description: 'JSON podatci pacijenta',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        if (!savedName) return;
        savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'manual-json-save' });
        setStatus(`Podaci pacijenta spremljeni su u JSON datoteku: ${savedName}`);
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          setStatus('Spremanje podataka je otkazano.');
          return;
        }
        console.warn('Save picker nije uspio, koristi se standardno preuzimanje.', error);
        setStatus('Preglednik nije dopustio odabir mjesta spremanja. Koristi se standardno preuzimanje.', true);
      }
    }

    const filename = askFilename(
      PAGE.fileNames.patientData,
      '.json',
      'spremanje podataka',
      suggestedFilename.replace(/\.json$/i, '')
    );
    if (!filename) return;
    downloadBlob(filename, blob);
    savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'manual-json-save' });
    setStatus(`Podaci pacijenta spremljeni su u JSON datoteku: ${filename}`);
  }

  const PATIENT_JSON_SCHEMA = Object.freeze({
    maxFileSizeBytes: 256 * 1024,
    maxTextLength: Object.freeze({
      patientMode: 20,
      fullName: 120,
      birthYear: 4,
      diagnosis: 5000,
      allergies: 1000,
      patientOrigin: 500,
      therapy: 8000,
      ohbpTherapy: 4000,
      vitalSigns: 500,
      followUpControlDate: 10,
      followUpControl: 1000,
      labRaw: 12000,
      radiologyRaw: 12000,
      admissionDate: 10
    }),
    allowedPatientKeys: Object.freeze(['patientMode', 'fullName', 'birthYear', 'diagnosis', 'allergies', 'patientOrigin', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControlDate', 'followUpControl', 'microHemocultures', 'microUrineCulture', 'microStoolBacteriology', 'microStoolCdiff', 'microStoolVirology', 'labRaw', 'radiologyRaw', 'admissionDate', 'showTherapyMonday2', 'showDiagnosisOnList', 'showAllergiesOnList', 'showPatientOriginOnList', 'showTherapyOnList', 'showOhbpTherapyOnList', 'showVitalSignsOnList', 'showFollowUpControlOnList', 'showLabsOnList', 'showRadiologyOnList']),
    stringFields: Object.freeze(['patientMode', 'fullName', 'birthYear', 'diagnosis', 'allergies', 'patientOrigin', 'therapy', 'ohbpTherapy', 'vitalSigns', 'followUpControlDate', 'followUpControl', 'labRaw', 'radiologyRaw', 'admissionDate']),
    booleanFields: Object.freeze(['microHemocultures', 'microUrineCulture', 'microStoolBacteriology', 'microStoolCdiff', 'microStoolVirology', 'showTherapyMonday2', 'showDiagnosisOnList', 'showAllergiesOnList', 'showPatientOriginOnList', 'showTherapyOnList', 'showOhbpTherapyOnList', 'showVitalSignsOnList', 'showFollowUpControlOnList', 'showLabsOnList', 'showRadiologyOnList']),
    allowedEnvelopeKeys: Object.freeze(['version', 'exportedAt', 'data']),
    allowedDowntimeBackupKeys: Object.freeze(['schema', 'version', 'appVersion', 'exportedAt', 'containsPatientData', 'authorizedUseOnly', 'retentionPolicy', 'availability', 'authContext', 'data'])
  });

  function isPlainJsonObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function hasOwnKey(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return 'nepoznata veličina';
    if (bytes < 1024) return `${bytes} B`;
    return `${Math.round(bytes / 1024)} kB`;
  }

  function getUnknownKeys(object, allowedKeys) {
    const allowed = new Set(allowedKeys);
    return Object.keys(object || {}).filter(key => !allowed.has(key));
  }

  function isValidIsoDateOnly(value) {
    if (value === '') return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [yearStr, monthStr, dayStr] = value.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) return false;
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    if (!Number.isInteger(day) || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function validatePatientDataObject(candidate) {
    const errors = [];
    const sanitized = {
      patientMode: DEFAULT_PATIENT_MODE,
      fullName: '',
      birthYear: '',
      diagnosis: '',
      allergies: '',
      patientOrigin: '',
      therapy: '',
      ohbpTherapy: '',
      vitalSigns: '',
      followUpControlDate: '',
      followUpControl: '',
      microHemocultures: false,
      microUrineCulture: false,
      microStoolBacteriology: false,
      microStoolCdiff: false,
      microStoolVirology: false,
      labRaw: '',
      radiologyRaw: '',
      admissionDate: '',
      showTherapyMonday2: false,
      showDiagnosisOnList: true,
      showAllergiesOnList: true,
      showPatientOriginOnList: true,
      showTherapyOnList: true,
      showOhbpTherapyOnList: true,
      showVitalSignsOnList: true,
      showFollowUpControlOnList: true,
      showLabsOnList: true,
      showRadiologyOnList: true
    };

    if (!isPlainJsonObject(candidate)) {
      return { ok: false, errors: ['Podaci pacijenta moraju biti JSON objekt.'] };
    }

    const unknownKeys = getUnknownKeys(candidate, PATIENT_JSON_SCHEMA.allowedPatientKeys);
    if (unknownKeys.length) {
      errors.push(`JSON sadrži neočekivana polja: ${unknownKeys.slice(0, 5).join(', ')}.`);
    }

    const containsPatientKey = PATIENT_JSON_SCHEMA.allowedPatientKeys.some(key => hasOwnKey(candidate, key));
    if (!containsPatientKey) {
      errors.push('JSON ne sadrži nijedno očekivano polje podataka pacijenta.');
    }

    PATIENT_JSON_SCHEMA.stringFields.forEach((key) => {
      if (!hasOwnKey(candidate, key)) return;
      const value = candidate[key];
      if (typeof value !== 'string') {
        errors.push(`Polje "${key}" mora biti tekst.`);
        return;
      }
      const maxLength = PATIENT_JSON_SCHEMA.maxTextLength[key];
      if (value.length > maxLength) {
        errors.push(`Polje "${key}" je predugo (${value.length}/${maxLength} znakova).`);
        return;
      }
      sanitized[key] = normalizeLineBreaks(value);
    });

    PATIENT_JSON_SCHEMA.booleanFields.forEach((key) => {
      if (!hasOwnKey(candidate, key)) return;
      if (typeof candidate[key] !== 'boolean') {
        errors.push(`Polje "${key}" mora biti true/false.`);
        return;
      }
      sanitized[key] = candidate[key];
    });

    if (hasOwnKey(candidate, 'patientMode')) {
      const mode = normalizePatientMode(sanitized.patientMode);
      if (sanitized.patientMode && sanitized.patientMode !== mode) {
        errors.push('Polje "patientMode" mora biti "outpatient" ili "ward".');
      }
      sanitized.patientMode = mode;
    } else {
      sanitized.patientMode = DEFAULT_PATIENT_MODE;
    }

    if (hasOwnKey(candidate, 'birthYear')) {
      const birthYear = sanitized.birthYear.trim();
      if (birthYear && !/^(?:18|19|20)\d{2}$/.test(birthYear)) {
        errors.push('Polje "birthYear" mora biti prazno ili godina u obliku YYYY.');
      }
    }

    if (hasOwnKey(candidate, 'admissionDate') && !isValidIsoDateOnly(sanitized.admissionDate)) {
      errors.push('Polje "admissionDate" mora biti prazno ili datum u obliku YYYY-MM-DD.');
    }
    if (hasOwnKey(candidate, 'followUpControlDate') && !isValidIsoDateOnly(sanitized.followUpControlDate)) {
      errors.push('Polje "followUpControlDate" mora biti prazno ili datum u obliku YYYY-MM-DD.');
    }

    return { ok: errors.length === 0, data: sanitized, errors };
  }

  function validatePatientJsonPayload(parsed) {
    if (!isPlainJsonObject(parsed)) {
      return { ok: false, message: 'JSON podataka pacijenta mora biti objekt, a ne lista ili druga vrijednost.' };
    }

    if (hasOwnKey(parsed, 'calibration')) {
      return { ok: false, message: 'Ovo izgleda kao JSON kalibracije, a ne JSON podataka pacijenta.' };
    }

    if (parsed.schema === DOWNTIME_BACKUP_SCHEMA) {
      const unknownBackupKeys = getUnknownKeys(parsed, PATIENT_JSON_SCHEMA.allowedDowntimeBackupKeys);
      if (unknownBackupKeys.length) {
        return { ok: false, message: `Downtime backup sadrži neočekivana polja: ${unknownBackupKeys.slice(0, 5).join(', ')}.` };
      }
      if (parsed.authorizedUseOnly !== true || parsed.containsPatientData !== true) {
        return { ok: false, message: 'Downtime backup mora biti označen kao ovlaštena datoteka s pacijentnim podacima.' };
      }
      const validated = validatePatientDataObject(parsed.data);
      if (!validated.ok) {
        return { ok: false, message: `Downtime backup ne sadrži valjane podatke pacijenta: ${validated.errors.join(' ')}` };
      }
      return {
        ok: true,
        data: validated.data,
        source: 'downtime-backup',
        exportedAt: String(parsed.exportedAt || ''),
        appVersion: String(parsed.appVersion || '')
      };
    }

    const hasEnvelope = hasOwnKey(parsed, 'data');
    if (hasEnvelope) {
      const unknownEnvelopeKeys = getUnknownKeys(parsed, PATIENT_JSON_SCHEMA.allowedEnvelopeKeys);
      if (unknownEnvelopeKeys.length) {
        return { ok: false, message: `JSON omotnica sadrži neočekivana polja: ${unknownEnvelopeKeys.slice(0, 5).join(', ')}.` };
      }
      if (hasOwnKey(parsed, 'version') && (!Number.isInteger(parsed.version) || parsed.version < 1 || parsed.version > 99)) {
        return { ok: false, message: 'Polje "version" mora biti cijeli broj.' };
      }
      if (hasOwnKey(parsed, 'exportedAt') && typeof parsed.exportedAt !== 'string') {
        return { ok: false, message: 'Polje "exportedAt" mora biti tekstualni ISO datum.' };
      }
      if (hasOwnKey(parsed, 'exportedAt') && parsed.exportedAt.length > 40) {
        return { ok: false, message: 'Polje "exportedAt" je predugo.' };
      }
      const validated = validatePatientDataObject(parsed.data);
      if (!validated.ok) {
        return { ok: false, message: `JSON podataka pacijenta nije valjan: ${validated.errors.join(' ')}` };
      }
      return { ok: true, data: validated.data };
    }

    const validated = validatePatientDataObject(parsed);
    if (!validated.ok) {
      return { ok: false, message: `JSON ne sadrži valjanu shemu podataka pacijenta: ${validated.errors.join(' ')}` };
    }
    return { ok: true, data: validated.data };
  }

  function loadPatientDataFromFile(file, options = {}) {
    if (!file) return;
    if (!isJsonFile(file)) {
      setStatus('Odabrana datoteka nije JSON datoteka.', true);
      return;
    }
    if (file.size > PATIENT_JSON_SCHEMA.maxFileSizeBytes) {
      setStatus(`JSON datoteka je sumnjivo velika (${formatBytes(file.size)}). Najveća dopuštena veličina je ${formatBytes(PATIENT_JSON_SCHEMA.maxFileSizeBytes)}.`, true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result || '');
        if (raw.length > PATIENT_JSON_SCHEMA.maxFileSizeBytes) {
          setStatus('JSON datoteka je prevelika za učitavanje podataka pacijenta.', true);
          return;
        }
        const parsed = JSON.parse(raw || '{}');
        const validation = validatePatientJsonPayload(parsed);
        if (!validation.ok) {
          setStatus(validation.message, true);
          return;
        }
        setFormData(validation.data);
        renderAll();
        updateDowntimeBackupControls();
        savePatientDraftNow({ quiet: true });
        resetCurrentFirebasePatientContext();
        markPatientSyncDirty({ data: validation.data, lastSaveTarget: 'none', currentPatientDocId: '' });
        scheduleFirebasePatientAutoSave({ force: true });
        const sourceText = options.fromDrop ? 'povlačenjem u aplikaciju' : 'iz JSON datoteke';
        if (validation.source === 'downtime-backup') {
          setDowntimeBackupStatus(`Downtime backup učitan: ${file.name || 'JSON datoteka'}. Provjeri pacijenta prije spremanja u Firebase.`, 'warn');
          setStatus(`Podaci pacijenta vraćeni su iz downtime backupa: ${file.name || 'JSON datoteka'}.`);
        } else {
          setStatus(`Podaci pacijenta učitani su ${sourceText}: ${file.name || 'JSON datoteka'}.`);
        }
      } catch (error) {
        setStatus('Ne mogu učitati JSON podataka pacijenta: datoteka nije valjan JSON ili ne odgovara shemi.', true);
      }
    };
    reader.onerror = () => {
      setStatus('Ne mogu pročitati JSON datoteku podataka pacijenta.', true);
    };
    reader.readAsText(file, 'utf-8');
  }

  function isJsonFile(file) {
    if (!file) return false;
    return file.type === 'application/json' || /\.json$/i.test(file.name || '');
  }

  function setFirebasePatientStatus(message, tone = '') {
    [els.firebasePatientAuthStatus, els.firebasePatientQuickStatus, els.firebaseUserPanelStatus].filter(Boolean).forEach((element) => {
      element.textContent = message || '';
      element.title = message || '';
      element.classList.toggle('ok', tone === 'ok');
      element.classList.toggle('warn', tone === 'warn');
      element.classList.toggle('error', tone === 'error');
    });
    renderFirebaseUserPanel();
  }

  function getFirebaseUserPanelMeta(user = state.firebasePatients.user, profile = state.firebasePatients.userProfile) {
    if (!user) return 'Firebase spremanje nije dostupno dok se ne prijavite.';
    const email = normalizeFirebaseProfileEmail(profile?.email || user.email || '');
    const department = normalizeFirebaseProfileText(profile?.department || '', 100);
    const authContext = getFirebaseAuthContext();
    if (department && email) return `${department} · ${email}`;
    if (department) return department;
    if (email) return `${email} · dovršite korisnički profil`;
    if (!authContext.hasValidClinicalContext) return 'Dovršite korisnički profil i odjel.';
    return 'Prijavljen korisnik';
  }

  function setFirebaseUserPanelExpanded(expanded) {
    const isExpanded = Boolean(expanded);
    if (els.firebaseUserPanel) els.firebaseUserPanel.classList.toggle('is-expanded', isExpanded);
    if (els.firebaseUserPanelToggleBtn) {
      els.firebaseUserPanelToggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      const displayName = els.firebaseUserPanelName?.textContent?.trim() || 'Korisnik';
      els.firebaseUserPanelToggleBtn.setAttribute(
        'aria-label',
        `${displayName}. ${isExpanded ? 'Zatvori' : 'Otvori'} korisnički panel.`
      );
    }
    if (els.firebaseUserPanelBody) els.firebaseUserPanelBody.hidden = !isExpanded;
  }

  function toggleFirebaseUserPanel() {
    const isExpanded = els.firebaseUserPanelToggleBtn?.getAttribute('aria-expanded') === 'true';
    setFirebaseUserPanelExpanded(!isExpanded);
  }

  function renderFirebaseUserPanel() {
    if (!els.firebaseUserPanel) return;
    const user = state.firebasePatients.user;
    const profile = state.firebasePatients.userProfile;
    const hasUser = Boolean(user);
    const displayName = hasUser ? getFirebaseUserDisplayName(user, profile) : 'Nije prijavljeno';
    if (els.firebaseUserAvatar) {
      els.firebaseUserAvatar.textContent = hasUser ? getFirebaseUserInitials(user, profile) : '?';
      els.firebaseUserAvatar.classList.toggle('is-signed-in', hasUser);
    }
    if (els.firebaseUserPanelName) els.firebaseUserPanelName.textContent = displayName;
    if (els.firebaseUserPanelMeta) els.firebaseUserPanelMeta.textContent = getFirebaseUserPanelMeta(user, profile);
    if (els.firebaseUserPanelToggleBtn) {
      const isExpanded = els.firebaseUserPanelToggleBtn.getAttribute('aria-expanded') === 'true';
      els.firebaseUserPanelToggleBtn.setAttribute(
        'aria-label',
        `${displayName}. ${isExpanded ? 'Zatvori' : 'Otvori'} korisnički panel.`
      );
    }
  }

  function setFirebaseLoginGateStatus(message, isError = false) {
    if (!els.firebaseLoginGateStatus) return;
    els.firebaseLoginGateStatus.textContent = message || '';
    els.firebaseLoginGateStatus.title = message || '';
    els.firebaseLoginGateStatus.classList.toggle('error', Boolean(isError));
  }

  function setFirebasePatientDialogStatus(message, isError = false) {
    if (!els.firebasePatientDialogStatus) return;
    els.firebasePatientDialogStatus.textContent = message || '';
    els.firebasePatientDialogStatus.title = message || '';
    els.firebasePatientDialogStatus.classList.toggle('error', Boolean(isError));
  }

  function getAppAvailabilityTone(availability = state.appAvailability) {
    if (availability.appShellStatus === 'degraded' || availability.firebaseStatus === 'unavailable') return 'error';
    if (availability.networkStatus === 'offline' || availability.firebaseStatus === 'unknown') return 'warn';
    return 'ok';
  }

  function getAppAvailabilityMessage(availability = state.appAvailability) {
    const lastCheck = availability.lastSuccessfulFirebaseCheckAt
      ? ` Zadnja Firebase provjera: ${formatPatientDraftSavedAt(availability.lastSuccessfulFirebaseCheckAt)}.`
      : '';
    if (availability.appShellStatus === 'degraded') {
      return `Dostupnost: aplikacija je učitana u ograničenom načinu. ${availability.lastError || 'Provjeri mrežu i osvježi stranicu.'}`;
    }
    if (availability.networkStatus === 'offline') {
      return 'Dostupnost: offline način. Firebase spremanje i otvaranje pacijenata nisu dostupni; lokalni nekriptirani auto-save ostaje isključen.';
    }
    if (availability.firebaseStatus === 'available') {
      return `Dostupnost: mreža je online, Firebase je dostupan.${lastCheck}`;
    }
    if (availability.firebaseStatus === 'unavailable') {
      return `Dostupnost: mreža je online, ali Firebase trenutno nije dostupan. ${availability.lastError || 'Pokušaj ponovno kasnije ili preuzmi downtime backup za ovlaštenu pohranu.'}`;
    }
    return 'Dostupnost: aplikacija je učitana, Firebase status se provjerava.';
  }

  function renderAppAvailabilityState() {
    const element = els.appAvailabilityStatus;
    if (!element) return;
    const availability = state.appAvailability;
    const tone = getAppAvailabilityTone(availability);
    const message = getAppAvailabilityMessage(availability);
    element.textContent = message;
    element.title = message;
    element.dataset.networkStatus = availability.networkStatus;
    element.dataset.firebaseStatus = availability.firebaseStatus;
    element.dataset.appShellStatus = availability.appShellStatus;
    element.classList.toggle('ok', tone === 'ok');
    element.classList.toggle('warn', tone === 'warn');
    element.classList.toggle('error', tone === 'error');
    window.__TEMPERATURNA_LISTA_AVAILABILITY_STATE__ = { ...availability };
  }

  function setAppAvailabilityState(patch = {}) {
    state.appAvailability = {
      ...state.appAvailability,
      ...patch
    };
    renderAppAvailabilityState();
  }

  function markFirebaseAvailabilityAvailable() {
    setAppAvailabilityState({
      networkStatus: navigator.onLine === false ? 'offline' : 'online',
      firebaseStatus: 'available',
      appShellStatus: 'loaded',
      lastSuccessfulFirebaseCheckAt: new Date().toISOString(),
      lastError: ''
    });
  }

  function markFirebaseAvailabilityUnavailable(errorOrMessage = '') {
    const message = typeof errorOrMessage === 'string'
      ? errorOrMessage
      : getFirebaseAuthErrorMessage(errorOrMessage);
    setAppAvailabilityState({
      networkStatus: navigator.onLine === false ? 'offline' : 'online',
      firebaseStatus: 'unavailable',
      lastError: String(message || 'Firebase nije dostupan.').slice(0, 240)
    });
  }

  function handleNetworkAvailabilityChange() {
    const isOnline = navigator.onLine !== false;
    setAppAvailabilityState({
      networkStatus: isOnline ? 'online' : 'offline',
      firebaseStatus: isOnline ? state.appAvailability.firebaseStatus : 'unavailable',
      lastError: isOnline ? '' : 'Preglednik je prijavio da nema mrežne veze.'
    });
    if (!isOnline && isPatientDataDifferentFromEmpty(getFormData())) {
      markPatientSyncFailed('Preglednik je offline.', { status: 'offline', lastSaveTarget: 'none' });
    }
  }

  function initAppAvailabilityMonitoring() {
    renderAppAvailabilityState();
    window.addEventListener('online', handleNetworkAvailabilityChange);
    window.addEventListener('offline', handleNetworkAvailabilityChange);
  }

  function setDowntimeBackupStatus(message, tone = 'neutral') {
    if (!els.downtimeBackupStatus) return;
    els.downtimeBackupStatus.textContent = message || '';
    els.downtimeBackupStatus.classList.toggle('ok', tone === 'ok');
    els.downtimeBackupStatus.classList.toggle('warn', tone === 'warn');
    els.downtimeBackupStatus.classList.toggle('error', tone === 'error');
    els.downtimeBackupStatus.dataset.backupState = tone || 'neutral';
  }

  function updateDowntimeBackupControls() {
    const hasData = isPatientDataDifferentFromEmpty(getFormData());
    if (els.downloadDowntimeBackupBtn) els.downloadDowntimeBackupBtn.disabled = !hasData;
    setDowntimeBackupStatus(hasData
      ? 'Downtime backup: spreman za ručno preuzimanje. Datoteka sadrži kliničke podatke i mora se čuvati prema bolničkim pravilima.'
      : 'Downtime backup: nema unesenog pacijenta za export.',
      hasData ? 'warn' : 'neutral');
  }

  function getPatientSyncVersion(data = getFormData()) {
    if (!isPatientDataDifferentFromEmpty(data)) return '';
    return getFirebasePatientDataSignature(data);
  }

  function getPatientSyncStatusTone(status) {
    if (status === 'synced') return 'ok';
    if (status === 'failed' || status === 'offline') return 'error';
    if (status === 'dirty' || status === 'saving' || status === 'localOnly') return 'warn';
    return 'neutral';
  }

  function getPatientSyncTargetLabel(target) {
    if (target === 'firebase') return 'Firebase';
    if (target === 'encrypted-local') return 'šifrirani lokalni oporavak';
    return 'nije spremljeno';
  }

  function getPatientSyncStatusMessage(syncState = state.patientSyncState) {
    const savedAt = syncState.lastSavedAt ? formatPatientDraftSavedAt(syncState.lastSavedAt) : '';
    if (syncState.status === 'empty') return 'Sinkronizacija: nema unesenog pacijenta.';
    if (syncState.status === 'saving') return 'Sinkronizacija: spremam pacijenta u Firebase...';
    if (syncState.status === 'synced') return `Sinkronizacija: spremljeno u ${getPatientSyncTargetLabel(syncState.lastSaveTarget)}${savedAt ? ` (${savedAt})` : ''}.`;
    if (syncState.status === 'failed') return `Sinkronizacija: spremanje nije uspjelo${syncState.lastError ? ` — ${syncState.lastError}` : ''}.`;
    if (syncState.status === 'offline') return 'Sinkronizacija: pacijent nije spremljen jer Firebase prijava ili klinički kontekst nisu dostupni.';
    if (syncState.status === 'localOnly') return `Sinkronizacija: pacijent je spremljen samo lokalno u šifrirani oporavak${savedAt ? ` (${savedAt})` : ''}. Prije ispisa treba Firebase spremanje ili izričita potvrda.`;
    return 'Sinkronizacija: postoje nespremljene promjene.';
  }

  function renderPatientSyncState() {
    if (!els.patientSyncStatus) return;
    const syncState = state.patientSyncState;
    const tone = getPatientSyncStatusTone(syncState.status);
    const message = getPatientSyncStatusMessage(syncState);
    els.patientSyncStatus.textContent = message;
    els.patientSyncStatus.title = message;
    els.patientSyncStatus.dataset.syncState = syncState.status;
    els.patientSyncStatus.dataset.lastSaveTarget = syncState.lastSaveTarget || 'none';
    els.patientSyncStatus.dataset.currentPatientDocId = syncState.currentPatientDocId || '';
    els.patientSyncStatus.classList.toggle('ok', tone === 'ok');
    els.patientSyncStatus.classList.toggle('warn', tone === 'warn');
    els.patientSyncStatus.classList.toggle('error', tone === 'error');
  }

  function setPatientSyncState(patch = {}) {
    state.patientSyncState = {
      ...state.patientSyncState,
      ...patch
    };
    renderPatientSyncState();
  }

  function resetPatientSyncState(status = 'empty', options = {}) {
    const data = options.data || getFormData();
    setPatientSyncState({
      status,
      lastSavedAt: options.lastSavedAt || '',
      lastSaveTarget: options.lastSaveTarget || 'none',
      lastError: options.lastError || '',
      currentPatientDocId: options.currentPatientDocId || '',
      currentPatientVersion: options.currentPatientVersion || getPatientSyncVersion(data),
      hasUnsavedChanges: Boolean(options.hasUnsavedChanges)
    });
  }

  function markPatientSyncDirty(options = {}) {
    const data = options.data || getFormData();
    if (!isPatientDataDifferentFromEmpty(data)) {
      resetPatientSyncState('empty', { data });
      return;
    }
    setPatientSyncState({
      status: options.status || 'dirty',
      lastSaveTarget: options.lastSaveTarget || state.patientSyncState.lastSaveTarget || 'none',
      lastError: options.lastError || '',
      currentPatientDocId: options.currentPatientDocId ?? state.firebasePatients.currentRecordId ?? state.patientSyncState.currentPatientDocId,
      currentPatientVersion: getPatientSyncVersion(data),
      hasUnsavedChanges: true
    });
  }

  function markPatientSyncSaving(target = 'firebase') {
    const data = getFormData();
    setPatientSyncState({
      status: 'saving',
      lastSaveTarget: target,
      lastError: '',
      currentPatientDocId: state.firebasePatients.currentRecordId || state.patientSyncState.currentPatientDocId || '',
      currentPatientVersion: getPatientSyncVersion(data),
      hasUnsavedChanges: true
    });
  }

  function markPatientSyncSynced(options = {}) {
    const data = options.data || getFormData();
    const docId = String(options.currentPatientDocId || state.firebasePatients.currentRecordId || '');
    setPatientSyncState({
      status: 'synced',
      lastSavedAt: options.lastSavedAt || new Date().toISOString(),
      lastSaveTarget: options.lastSaveTarget || 'firebase',
      lastError: '',
      currentPatientDocId: docId,
      currentPatientVersion: options.currentPatientVersion || getPatientSyncVersion(data),
      hasUnsavedChanges: false
    });
  }

  function markPatientSyncFailed(errorMessage, options = {}) {
    const data = options.data || getFormData();
    if (!isPatientDataDifferentFromEmpty(data)) {
      resetPatientSyncState('empty', { data });
      return;
    }
    setPatientSyncState({
      status: options.status || 'failed',
      lastSaveTarget: options.lastSaveTarget || state.patientSyncState.lastSaveTarget || 'none',
      lastError: String(errorMessage || '').slice(0, 240),
      currentPatientDocId: options.currentPatientDocId ?? state.firebasePatients.currentRecordId ?? state.patientSyncState.currentPatientDocId,
      currentPatientVersion: getPatientSyncVersion(data),
      hasUnsavedChanges: true
    });
  }

  function updatePatientSyncStateForCurrentForm() {
    const data = getFormData();
    if (!isPatientDataDifferentFromEmpty(data)) {
      resetPatientSyncState('empty', { data });
      return;
    }
    const currentVersion = getPatientSyncVersion(data);
    if (
      state.patientSyncState.status === 'synced' &&
      state.patientSyncState.currentPatientDocId &&
      state.patientSyncState.currentPatientVersion === currentVersion
    ) {
      renderPatientSyncState();
      return;
    }
    markPatientSyncDirty({ data });
  }

  function isCurrentPatientSyncedForPrint() {
    const data = getFormData();
    if (!isPatientDataDifferentFromEmpty(data)) return true;
    const currentVersion = getPatientSyncVersion(data);
    return Boolean(
      state.patientSyncState.status === 'synced' &&
      state.patientSyncState.lastSaveTarget === 'firebase' &&
      state.patientSyncState.currentPatientDocId &&
      state.patientSyncState.currentPatientVersion === currentVersion &&
      !state.patientSyncState.hasUnsavedChanges
    );
  }

  function normalizeFirebaseProfileText(value, maxLength = 80) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  function normalizeFirebaseProfileEmail(value) {
    return String(value || '').replace(/\s+/g, '').trim().toLowerCase().slice(0, 160);
  }

  function getFirebaseProfileDisplayName(profile = {}) {
    const full = `${profile.firstName || ''} ${profile.lastName || ''}`.replace(/\s+/g, ' ').trim();
    return full || profile.email || 'Korisnik';
  }

  function getFirebaseUserDisplayName(user = state.firebasePatients.user, profile = state.firebasePatients.userProfile) {
    const profileName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.replace(/\s+/g, ' ').trim();
    return profileName || profile?.displayName || profile?.email || user?.displayName || user?.email || 'Korisnik';
  }

  function getFirebaseUserInitials(user = state.firebasePatients.user, profile = state.firebasePatients.userProfile) {
    const source = getFirebaseUserDisplayName(user, profile);
    const parts = String(source || '')
      .replace(/@.*/, '')
      .split(/\s+/)
      .filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
    return initials || '?';
  }

  function normalizeClinicalContextId(value, maxLength = 80) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, maxLength);
  }

  function normalizeClinicalRoleList(value) {
    const source = Array.isArray(value)
      ? value
      : String(value || '').split(/[,\s]+/);
    return Array.from(new Set(source
      .map(item => normalizeClinicalContextId(item, 40))
      .filter(Boolean)));
  }

  function normalizeClinicalWardList(value, fallbackWardId = '') {
    const source = Array.isArray(value) ? value : String(value || '').split(/[,\s]+/);
    const wardIds = Array.from(new Set(source
      .map(item => normalizeClinicalContextId(item, 80))
      .filter(Boolean)));
    const fallback = normalizeClinicalContextId(fallbackWardId, 80);
    if (!wardIds.length && fallback) wardIds.push(fallback);
    return wardIds;
  }

  function hasClinicalPatientAccessRole(roles = []) {
    const normalized = normalizeClinicalRoleList(roles);
    return normalized.some(role => CLINICAL_PATIENT_ACCESS_ROLES.includes(role));
  }

  function hasClinicalArchiveManagerRole(roles = []) {
    const normalized = normalizeClinicalRoleList(roles);
    return normalized.some(role => CLINICAL_ARCHIVE_MANAGER_ROLES.includes(role));
  }

  function canManageArchivedFirebasePatients(authContext = getFirebaseAuthContext()) {
    return Boolean(authContext?.hasValidClinicalContext && hasClinicalArchiveManagerRole(authContext.roles));
  }

  function createEmptyAuthContext() {
    return {
      uid: '',
      email: '',
      displayName: '',
      organizationId: '',
      wardIds: [],
      activeWardId: '',
      roles: [],
      isAuthenticated: false,
      hasValidClinicalContext: false
    };
  }

  function buildClinicalProfileContext(profile = {}) {
    const department = normalizeFirebaseProfileText(profile.department || '', 100);
    const fallbackWardId = normalizeClinicalContextId(department, 80);
    const organizationId = normalizeClinicalContextId(profile.organizationId || '', 80);
    const wardIds = normalizeClinicalWardList(profile.wardIds, fallbackWardId);
    const activeWardId = normalizeClinicalContextId(profile.activeWardId || wardIds[0] || fallbackWardId, 80);
    const roles = normalizeClinicalRoleList(profile.roles || profile.role);
    return {
      organizationId,
      wardIds,
      activeWardId,
      roles
    };
  }

  function buildAuthContext(user = null, profile = null) {
    if (!user?.uid) return createEmptyAuthContext();
    const clinical = buildClinicalProfileContext(profile || {});
    const hasValidClinicalContext = Boolean(
      clinical.organizationId &&
      clinical.activeWardId &&
      clinical.wardIds.includes(clinical.activeWardId) &&
      hasClinicalPatientAccessRole(clinical.roles)
    );
    return {
      uid: String(user.uid || ''),
      email: normalizeFirebaseProfileEmail(profile?.email || user.email || ''),
      displayName: getFirebaseProfileDisplayName(profile || { email: user.email || '', displayName: user.displayName || '' }),
      organizationId: clinical.organizationId,
      wardIds: clinical.wardIds,
      activeWardId: clinical.activeWardId,
      roles: clinical.roles,
      isAuthenticated: true,
      hasValidClinicalContext
    };
  }

  function refreshFirebaseAuthContext() {
    const context = buildAuthContext(state.firebasePatients.user, state.firebasePatients.userProfile);
    state.firebasePatients.authContext = context;
    updateAdminAccessVisibility();
    return context;
  }

  function getFirebaseAuthContext() {
    return state.firebasePatients.authContext || refreshFirebaseAuthContext();
  }

  function isSuperAdmin(authContext = getFirebaseAuthContext()) {
    if (!authContext?.isAuthenticated) return false;
    const email = normalizeFirebaseProfileEmail(authContext.email || state.firebasePatients.user?.email || '');
    if (!SUPER_ADMIN_EMAILS.includes(email)) return false;
    return normalizeClinicalRoleList(authContext.roles || []).includes('admin');
  }

  function getAdminAccessMessage(authContext = getFirebaseAuthContext()) {
    if (isSuperAdmin(authContext)) {
      return `Admin pristup potvrđen: ${authContext.displayName || authContext.email}.`;
    }
    if (!authContext?.isAuthenticated) {
      return 'Admin dashboard je zaključan. Potrebna je Lukina Firebase prijava s admin ulogom.';
    }
    return 'Admin dashboard je zaključan. Samo Luka Jerković s admin ulogom može otvoriti administraciju.';
  }

  function updateAdminAccessVisibility() {
    const authContext = state.firebasePatients.authContext || createEmptyAuthContext();
    const allowed = isSuperAdmin(authContext);
    const hasAuthenticatedUser = Boolean(authContext.isAuthenticated);
    const canShowAdvancedSection = allowed || !hasAuthenticatedUser;

    if (els.dataAdminAdvancedSection) {
      els.dataAdminAdvancedSection.classList.toggle('hidden', !canShowAdvancedSection);
      els.dataAdminAdvancedSection.setAttribute('aria-hidden', canShowAdvancedSection ? 'false' : 'true');
      if (!canShowAdvancedSection) els.dataAdminAdvancedSection.open = false;
    }
    if (els.dataAdminAdvancedTitle) {
      els.dataAdminAdvancedTitle.textContent = allowed
        ? 'Napredno: podatci i administracija'
        : 'Napredno: sigurnosni alati i backup';
    }
    if (els.adminToggleBtn) {
      els.adminToggleBtn.hidden = !allowed;
      els.adminToggleBtn.disabled = !allowed;
    }
    if (els.adminAccessStatus) {
      const message = getAdminAccessMessage(authContext);
      els.adminAccessStatus.textContent = message;
      els.adminAccessStatus.classList.toggle('ok', allowed);
      els.adminAccessStatus.classList.toggle('error', !allowed);
    }
    if (els.adminServiceBanner) {
      els.adminServiceBanner.classList.toggle('admin-locked', !allowed);
    }
    if (!allowed && state.admin.enabled) {
      setAdminMode(false);
    }
    window.__TEMPERATURNA_LISTA_ADMIN_CONTEXT__ = {
      isSuperAdmin: allowed,
      email: authContext.email || '',
      roles: Array.isArray(authContext.roles) ? authContext.roles.slice() : []
    };
    return allowed;
  }

  function requireSuperAdminForAdminMode(options = {}) {
    const allowed = updateAdminAccessVisibility();
    if (allowed) return true;
    if (!options.silent) {
      setStatus(getAdminAccessMessage(), true);
    }
    return false;
  }

  function getClinicalPartitionKey(authContext = getFirebaseAuthContext()) {
    if (!authContext?.hasValidClinicalContext) return '';
    return `${CLINICAL_PARTITION_PREFIX}|${authContext.organizationId}|${authContext.activeWardId}`;
  }

  function canAuthContextAccessClinicalPayload(payload = {}, authContext = getFirebaseAuthContext()) {
    if (!authContext?.hasValidClinicalContext || !isPlainJsonObject(payload)) return false;
    return String(payload.organizationId || '') === authContext.organizationId &&
      String(payload.wardId || '') === authContext.activeWardId &&
      String(payload.clinicalPartitionKey || '') === getClinicalPartitionKey(authContext);
  }

  function canRecoverLegacyOwnedFirebasePatientPayload(payload = {}, user = state.firebasePatients.user) {
    if (!user?.uid || !isPlainJsonObject(payload)) return false;
    if (payload.schema !== 'temperaturna-lista-patient-v1') return false;
    const ownerUidMatches = Boolean(payload.ownerUid && String(payload.ownerUid || '') === String(user.uid || ''));
    const userEmail = normalizeFirebaseProfileEmail(user.email || state.firebasePatients.userProfile?.email || '');
    const ownerEmail = normalizeFirebaseProfileEmail(payload.ownerEmail || '');
    const ownerEmailMatches = Boolean(userEmail && ownerEmail && ownerEmail === userEmail);
    if (!ownerUidMatches && !ownerEmailMatches) return false;
    return String(payload.accessModel || '') !== CLINICAL_ACCESS_MODEL_VERSION ||
      !String(payload.organizationId || '') ||
      !String(payload.wardId || '') ||
      !String(payload.clinicalPartitionKey || '');
  }

  function getFirebaseClinicalContextErrorMessage() {
    return 'Firebase pristup pacijentima čeka valjan klinički kontekst: ustanova, odjel i uloga korisnika.';
  }

  function getFirebaseRegistrationFormProfile() {
    const department = normalizeFirebaseProfileText(els.firebaseRegisterDepartment?.value || '', 100);
    const activeWardId = normalizeClinicalContextId(department, 80);
    return {
      firstName: normalizeFirebaseProfileText(els.firebaseRegisterFirstName?.value || '', 60),
      lastName: normalizeFirebaseProfileText(els.firebaseRegisterLastName?.value || '', 80),
      department,
      email: normalizeFirebaseProfileEmail(els.firebaseRegisterEmail?.value || ''),
      organizationId: DEFAULT_CLINICAL_ORGANIZATION_ID,
      wardIds: activeWardId ? [activeWardId] : [],
      activeWardId,
      roles: [DEFAULT_CLINICAL_ROLE]
    };
  }

  function validateFirebaseUserProfile(profile = {}) {
    const errors = [];
    if (!profile.firstName) errors.push('upiši ime');
    if (!profile.lastName) errors.push('upiši prezime');
    if (!profile.department) errors.push('upiši odjel');
    if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.push('upiši ispravan Gmail');
    if (profile.email && !/@gmail\.com$/i.test(profile.email)) errors.push('Gmail adresa mora završavati na @gmail.com');
    const clinical = buildClinicalProfileContext({
      ...profile,
      organizationId: profile.organizationId || DEFAULT_CLINICAL_ORGANIZATION_ID,
      roles: profile.roles?.length ? profile.roles : [DEFAULT_CLINICAL_ROLE]
    });
    if (!clinical.organizationId) errors.push('nedostaje ustanova');
    if (!clinical.activeWardId || !clinical.wardIds.includes(clinical.activeWardId)) errors.push('nedostaje odjelni kontekst');
    if (!hasClinicalPatientAccessRole(clinical.roles)) errors.push('nedostaje korisnička uloga');
    return { ok: errors.length === 0, errors };
  }

  function setFirebaseRegistrationMode(active, options = {}) {
    const isActive = Boolean(active);
    state.firebasePatients.loginGateMode = isActive ? 'register' : 'signin';
    if (els.firebaseRegistrationForm) els.firebaseRegistrationForm.classList.toggle('hidden', !isActive);
    if (els.firebaseLoginGateNewUserBtn) {
      els.firebaseLoginGateNewUserBtn.classList.toggle('primary', !isActive);
      els.firebaseLoginGateNewUserBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }
    if (isActive && options.focus !== false) {
      window.setTimeout(() => {
        (els.firebaseRegisterFirstName?.value ? els.firebaseRegisterLastName : els.firebaseRegisterFirstName)?.focus?.();
      }, 0);
    }
  }

  function fillFirebaseRegistrationFormFromProfile(profile = {}, options = {}) {
    if (els.firebaseRegisterFirstName && (options.force || !els.firebaseRegisterFirstName.value)) {
      els.firebaseRegisterFirstName.value = profile.firstName || '';
    }
    if (els.firebaseRegisterLastName && (options.force || !els.firebaseRegisterLastName.value)) {
      els.firebaseRegisterLastName.value = profile.lastName || '';
    }
    if (els.firebaseRegisterDepartment && (options.force || !els.firebaseRegisterDepartment.value)) {
      els.firebaseRegisterDepartment.value = profile.department || '';
    }
    if (els.firebaseRegisterEmail && (options.force || !els.firebaseRegisterEmail.value)) {
      els.firebaseRegisterEmail.value = profile.email || '';
    }
  }

  function buildProfileSeedFromFirebaseUser(user) {
    const displayName = String(user?.displayName || '').replace(/\s+/g, ' ').trim();
    const parts = displayName.split(' ').filter(Boolean);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      department: '',
      email: normalizeFirebaseProfileEmail(user?.email || ''),
      organizationId: DEFAULT_CLINICAL_ORGANIZATION_ID,
      wardIds: [],
      activeWardId: '',
      roles: [DEFAULT_CLINICAL_ROLE]
    };
  }

  function switchPersonalSuggestionsToUser(userId) {
    const nextUserId = normalizePersonalStorageUserId(userId || 'local');
    if (activePersonalSuggestionsStorageUserId === nextUserId) return;
    activePersonalSuggestionsStorageUserId = nextUserId;
    state.therapyAutocomplete.usage = loadTherapyAutocompleteUsageFromStorage();
    state.diagnosisAutocomplete.usage = loadDiagnosisAutocompleteUsageFromStorage();
    state.diagnosisAutocomplete.recordedKeys = new Set(Object.keys(state.diagnosisAutocomplete.usage || {}));
    hideTherapyAutocomplete();
    hideDiagnosisAutocomplete();
  }

  function normalizeFirebaseUserProfilePayload(payload = {}, user = null) {
    if (!isPlainJsonObject(payload)) return null;
    const email = normalizeFirebaseProfileEmail(payload.email || user?.email || '');
    const department = normalizeFirebaseProfileText(payload.department || '', 100);
    const clinical = buildClinicalProfileContext({
      ...payload,
      department
    });
    const profile = {
      uid: String(payload.uid || user?.uid || ''),
      firstName: normalizeFirebaseProfileText(payload.firstName || '', 60),
      lastName: normalizeFirebaseProfileText(payload.lastName || '', 80),
      department,
      email,
      displayName: normalizeFirebaseProfileText(payload.displayName || '', 160),
      role: clinical.roles[0] || '',
      roles: clinical.roles,
      organizationId: clinical.organizationId,
      wardIds: clinical.wardIds,
      activeWardId: clinical.activeWardId,
      createdAt: String(payload.createdAt || ''),
      updatedAt: String(payload.updatedAt || '')
    };
    if (!profile.displayName) profile.displayName = getFirebaseProfileDisplayName(profile);
    return profile.uid && profile.email ? profile : null;
  }

  function isFirebaseUserProfileComplete(profile) {
    const clinical = buildClinicalProfileContext(profile || {});
    return Boolean(
      profile?.firstName &&
      profile?.lastName &&
      profile?.department &&
      profile?.email &&
      clinical.organizationId &&
      clinical.activeWardId &&
      clinical.wardIds.includes(clinical.activeWardId) &&
      hasClinicalPatientAccessRole(clinical.roles)
    );
  }

  async function loadFirebaseUserProfile(user) {
    if (!user?.uid) return null;
    const client = await getFirebasePatientsClient();
    const docSnap = await client.getDoc(client.doc(client.db, FIREBASE_USER_PROFILES_COLLECTION, user.uid));
    if (!docSnap.exists()) return null;
    return normalizeFirebaseUserProfilePayload(docSnap.data(), user);
  }

  async function saveFirebaseUserProfile(profileInput, user = state.firebasePatients.user) {
    if (!user?.uid) {
      setFirebaseLoginGateStatus('Za spremanje profila prvo se prijavi Google računom.', true);
      return null;
    }
    const profile = {
      ...profileInput,
      email: normalizeFirebaseProfileEmail(profileInput.email || user.email || '')
    };
    const validation = validateFirebaseUserProfile(profile);
    if (!validation.ok) {
      setFirebaseLoginGateStatus(`Profil nije potpun: ${validation.errors.join(', ')}.`, true);
      return null;
    }
    const authEmail = normalizeFirebaseProfileEmail(user.email || '');
    if (authEmail && profile.email !== authEmail) {
      setFirebaseLoginGateStatus('Upisani Gmail mora biti isti kao Google račun kojim se prijavljuješ.', true);
      return null;
    }

    const client = await getFirebasePatientsClient();
    const nowIso = new Date().toISOString();
    const clinical = buildClinicalProfileContext({
      ...profile,
      organizationId: profile.organizationId || DEFAULT_CLINICAL_ORGANIZATION_ID,
      roles: profile.roles?.length ? profile.roles : [DEFAULT_CLINICAL_ROLE]
    });
    const payload = {
      schema: 'temperaturna-lista-user-profile-v1',
      appVersion: APP_VERSION,
      uid: user.uid,
      firstName: profile.firstName,
      lastName: profile.lastName,
      department: profile.department,
      email: profile.email,
      displayName: getFirebaseProfileDisplayName(profile),
      organizationId: clinical.organizationId,
      wardIds: clinical.wardIds,
      activeWardId: clinical.activeWardId,
      roles: clinical.roles,
      role: clinical.roles[0] || DEFAULT_CLINICAL_ROLE,
      updatedAt: nowIso,
      serverUpdatedAt: client.serverTimestamp()
    };
    if (!state.firebasePatients.userProfile?.createdAt) {
      payload.createdAt = nowIso;
      payload.serverCreatedAt = client.serverTimestamp();
    }
    await client.setDoc(client.doc(client.db, FIREBASE_USER_PROFILES_COLLECTION, user.uid), payload, { merge: true });
    const savedProfile = normalizeFirebaseUserProfilePayload(payload, user);
    state.firebasePatients.userProfile = savedProfile;
    refreshFirebaseAuthContext();
    state.firebasePatients.pendingRegistrationProfile = null;
    switchPersonalSuggestionsToUser(user.uid);
    hideFirebaseLoginGate();
    setFirebasePatientStatus(`Prijavljeno: ${getFirebaseProfileDisplayName(savedProfile)} - ${savedProfile.department}`, 'ok');
    setFirebaseLoginGateStatus(`Profil spremljen: ${getFirebaseProfileDisplayName(savedProfile)}.`);
    return savedProfile;
  }

  function mountFirebaseLoginGateOnBody() {
    if (!els.firebaseLoginGate || els.firebaseLoginGate.parentElement === document.body) return;
    document.body.appendChild(els.firebaseLoginGate);
  }

  function mountFirebasePatientDialogOnBody() {
    if (!els.firebasePatientDialog || els.firebasePatientDialog.parentElement === document.body) return;
    document.body.appendChild(els.firebasePatientDialog);
  }

  function setFirebaseLoginGateBackgroundInert(isInert) {
    const appRoot = document.getElementById('appRoot');
    if (!appRoot) return;
    if (isInert) {
      appRoot.setAttribute('aria-hidden', 'true');
      if ('inert' in appRoot) appRoot.inert = true;
      return;
    }
    appRoot.removeAttribute('aria-hidden');
    if ('inert' in appRoot) appRoot.inert = false;
  }

  function hasDismissedFirebaseLoginGateThisSession() {
    return state.firebasePatients.loginGateDismissed || safeSessionStorageGetItem(FIREBASE_LOGIN_GATE_SESSION_KEY) === 'true';
  }

  function dismissFirebaseLoginGateForSession() {
    state.firebasePatients.loginGateDismissed = true;
    safeSessionStorageSetItem(FIREBASE_LOGIN_GATE_SESSION_KEY, 'true');
    hideFirebaseLoginGate();
  }

  function resetFirebaseLoginGateDismissal() {
    state.firebasePatients.loginGateDismissed = false;
    safeSessionStorageRemoveItem(FIREBASE_LOGIN_GATE_SESSION_KEY);
  }

  window.__TEMPERATURNA_LISTA_TEST_DISMISS_FIREBASE_LOGIN_GATE__ = () => {
    dismissFirebaseLoginGateForSession();
    return true;
  };

  function showFirebaseLoginGate(message = '') {
    if (!els.firebaseLoginGate) return;
    mountFirebaseLoginGateOnBody();
    els.firebaseLoginGate.classList.remove('hidden');
    els.firebaseLoginGate.setAttribute('aria-hidden', 'false');
    setFirebaseLoginGateBackgroundInert(true);
    if (message) setFirebaseLoginGateStatus(message);
    window.setTimeout(() => {
      if (!els.firebaseLoginGate || els.firebaseLoginGate.classList.contains('hidden')) return;
      const focusTarget = state.firebasePatients.loginGateMode === 'register'
        ? (els.firebaseRegisterFirstName?.value ? els.firebaseRegisterLastName : els.firebaseRegisterFirstName)
        : els.firebaseLoginGateSignInBtn;
      focusTarget?.focus?.();
    }, 0);
  }

  function hideFirebaseLoginGate() {
    if (!els.firebaseLoginGate) return;
    els.firebaseLoginGate.classList.add('hidden');
    els.firebaseLoginGate.setAttribute('aria-hidden', 'true');
    setFirebaseLoginGateBackgroundInert(false);
  }

  function getFirebaseLoginGateFocusableElements() {
    if (!els.firebaseLoginGate || els.firebaseLoginGate.classList.contains('hidden')) return [];
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(els.firebaseLoginGate.querySelectorAll(selectors))
      .filter((element) => {
        if (element.getAttribute('aria-hidden') === 'true') return false;
        const rects = element.getClientRects();
        return rects && rects.length > 0;
      });
  }

  function handleFirebaseLoginGateKeyDown(event) {
    if (event.key !== 'Tab' || !els.firebaseLoginGate || els.firebaseLoginGate.classList.contains('hidden')) return;
    const focusable = getFirebaseLoginGateFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      els.firebaseLoginGate.focus?.();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!els.firebaseLoginGate.contains(active)) {
      event.preventDefault();
      first.focus();
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function syncFirebaseLoginGateState(message = '') {
    const needsProfile = Boolean(
      state.firebasePatients.user &&
      !isFirebaseUserProfileComplete(state.firebasePatients.userProfile)
    );
    const shouldShow = state.firebasePatients.authResolved &&
      (!state.firebasePatients.user || needsProfile) &&
      !hasDismissedFirebaseLoginGateThisSession();
    if (shouldShow) {
      if (needsProfile) {
        setFirebaseRegistrationMode(true, { focus: false });
      } else {
        setFirebaseRegistrationMode(false, { focus: false });
      }
      showFirebaseLoginGate(message || (needsProfile ? 'Dovrši korisnički profil.' : 'Prijavi se za Firebase spremanje.'));
    } else {
      hideFirebaseLoginGate();
    }
  }

  function showFirebaseNewUserProfileForm() {
    resetFirebaseLoginGateDismissal();
    state.firebasePatients.pendingRegistrationProfile = null;
    fillFirebaseRegistrationFormFromProfile(
      state.firebasePatients.userProfile || buildProfileSeedFromFirebaseUser(state.firebasePatients.user),
      { force: true }
    );
    setFirebaseRegistrationMode(true, { focus: false });
    showFirebaseLoginGate(state.firebasePatients.user
      ? 'Uredi ili dovrši korisnički profil. Za potpuno drugi Google račun odaberi Promijeni račun.'
      : 'Upiši podatke novog korisnika, zatim potvrdi Google račun.');
  }

  function isFirebasePatientDialogVisible() {
    return Boolean(els.firebasePatientDialog && !els.firebasePatientDialog.classList.contains('hidden'));
  }

  function getFirebasePatientDialogPanel() {
    return els.firebasePatientDialog?.querySelector('.firebase-patient-dialog') || null;
  }

  function getFirebasePatientDialogFocusableElements() {
    if (!isFirebasePatientDialogVisible()) return [];
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(els.firebasePatientDialog.querySelectorAll(selectors))
      .filter((element) => {
        if (element.getAttribute('aria-hidden') === 'true') return false;
        const rects = element.getClientRects();
        return rects && rects.length > 0;
      });
  }

  function focusInsideFirebasePatientDialog(preferredElement = null) {
    const focusable = getFirebasePatientDialogFocusableElements();
    const target = preferredElement && !preferredElement.disabled
      ? preferredElement
      : (focusable[0] || getFirebasePatientDialogPanel() || els.firebasePatientDialog);
    target?.focus?.({ preventScroll: true });
  }

  async function showFirebasePatientDialog() {
    if (!els.firebasePatientDialog) return;
    mountFirebasePatientDialogOnBody();
    setFirebasePatientDialogMode(getCurrentPatientMode(), { render: false });
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body && !els.firebasePatientDialog.contains(activeElement)) {
      state.firebasePatients.dialogReturnFocusTo = activeElement;
    }
    els.firebasePatientDialog.classList.remove('hidden');
    els.firebasePatientDialog.setAttribute('aria-hidden', 'false');
    renderFirebasePatientDialogList();
    updateFirebasePatientControls();
    window.setTimeout(() => {
      const preferred = state.firebasePatients.user ? els.firebasePatientSearchInput : els.firebasePatientDialogSignInBtn;
      focusInsideFirebasePatientDialog(preferred);
    }, 0);

    const authContext = getFirebaseAuthContext();
    if (isFirebaseUserProfileComplete(state.firebasePatients.userProfile) && authContext.hasValidClinicalContext) {
      if (!state.firebasePatients.records.length) {
        await refreshFirebasePatients({ silent: true });
      } else {
        const modeRecords = getFirebasePatientRecordsForDialogMode();
        setFirebasePatientDialogStatus(`Prikazano ${modeRecords.length} zapisa: ${formatFirebasePatientModeShortLabel(getFirebasePatientDialogMode())}.`);
      }
    } else if (state.firebasePatients.user) {
      setFirebasePatientDialogStatus(getFirebaseClinicalContextErrorMessage(), true);
    } else {
      setFirebasePatientDialogStatus('Za popis pacijenata prvo se prijavi u Firebase.');
    }
  }

  function hideFirebasePatientDialog(options = {}) {
    if (!els.firebasePatientDialog) return;
    const wasVisible = isFirebasePatientDialogVisible();
    els.firebasePatientDialog.classList.add('hidden');
    els.firebasePatientDialog.setAttribute('aria-hidden', 'true');
    if (wasVisible && options.restoreFocus !== false) {
      const returnFocusTo = state.firebasePatients.dialogReturnFocusTo || els.openFirebasePatientDialogBtn;
      if (returnFocusTo && document.contains(returnFocusTo) && typeof returnFocusTo.focus === 'function') {
        returnFocusTo.focus({ preventScroll: true });
      }
    }
  }

  function handleFirebasePatientDialogKeyDown(event) {
    if (!isFirebasePatientDialogVisible()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hideFirebasePatientDialog();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFirebasePatientDialogFocusableElements();
    if (!focusable.length) {
      event.preventDefault();
      focusInsideFirebasePatientDialog();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!els.firebasePatientDialog.contains(active)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  function getFirebasePatientSearchQuery() {
    return String(els.firebasePatientSearchInput?.value || '').trim();
  }

  function normalizeFirebasePatientSearchText(value) {
    return String(value || '')
      .toLocaleLowerCase('hr-HR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getFirebasePatientRecordSearchText(record) {
    return normalizeFirebasePatientSearchText([
      record?.label,
      record?.data?.fullName,
      record?.data?.birthYear,
      formatIsoDateToCroatian(record?.data?.admissionDate || ''),
      record?.data?.diagnosis
    ].join(' '));
  }

  function getFirebasePatientRecordMode(record) {
    return normalizePatientMode(record?.patientMode || record?.data?.patientMode);
  }

  function isFirebasePatientRecordArchived(record) {
    return record?.status === FIREBASE_PATIENT_STATUSES.DELETED;
  }

  function shouldShowArchivedFirebasePatients() {
    return Boolean(state.firebasePatients.showArchived && canManageArchivedFirebasePatients());
  }

  function getFirebasePatientRecordsForMode(mode, options = {}) {
    const normalizedMode = normalizePatientMode(mode);
    const includeArchived = Boolean(options.includeArchived);
    return state.firebasePatients.records.filter(record => {
      if (getFirebasePatientRecordMode(record) !== normalizedMode) return false;
      return includeArchived || !isFirebasePatientRecordArchived(record);
    });
  }

  function getFirebasePatientRecordsForCurrentMode() {
    return getFirebasePatientRecordsForMode(getCurrentPatientMode());
  }

  function getFirebasePatientRecordsForDialogMode() {
    return getFirebasePatientRecordsForMode(getFirebasePatientDialogMode(), {
      includeArchived: shouldShowArchivedFirebasePatients()
    });
  }

  function formatFirebasePatientModeShortLabel(mode) {
    return normalizePatientMode(mode) === PATIENT_MODES.OUTPATIENT ? 'Ambulantni' : 'Odjelni';
  }

  function getFilteredFirebasePatientRecords() {
    const query = normalizeFirebasePatientSearchText(getFirebasePatientSearchQuery());
    const records = getFirebasePatientRecordsForDialogMode();
    if (!query) return records;
    return records.filter(record => getFirebasePatientRecordSearchText(record).includes(query));
  }

  function isLegacyFirebasePatientRecord(record) {
    return Boolean(record?.needsClinicalMigration || record?.legacyAccess);
  }

  function formatFirebasePatientDialogMeta(record) {
    const data = record?.data || {};
    const parts = [formatFirebasePatientModeShortLabel(getFirebasePatientRecordMode(record))];
    if (isLegacyFirebasePatientRecord(record)) parts.push('stari zapis - otvori i spremi za migraciju');
    if (data.birthYear) parts.push(`Godište ${data.birthYear}`);
    if (data.admissionDate) parts.push(`Prijem ${formatIsoDateToCroatian(data.admissionDate)}`);
    const stored = formatFirebasePatientStoredDate(record?.updatedAt || record?.createdAt || record?.serverUpdatedAt || record?.serverCreatedAt);
    if (stored) parts.push(`Spremljeno ${stored}`);
    const expires = formatFirebasePatientStoredDate(record?.expiresAt);
    if (isFirebasePatientRecordArchived(record)) {
      const deleted = formatFirebasePatientStoredDate(record?.deletedAt);
      parts.push(deleted ? `Arhivirano ${deleted}` : 'Arhivirano');
    } else if (expires) {
      parts.push(`Arhivira se nakon ${expires}`);
    }
    return parts.join(' | ');
  }

  function renderFirebasePatientDialogList() {
    const list = els.firebasePatientDialogList;
    if (!list) return;
    list.textContent = '';

    if (!state.firebasePatients.user) {
      const empty = document.createElement('div');
      empty.className = 'firebase-patient-dialog-empty';
      empty.textContent = 'Nisi prijavljen u Firebase. Klikni Prijava za prikaz spremljenih pacijenata.';
      list.appendChild(empty);
      setFirebasePatientDialogStatus('Za otvaranje pacijenta potrebna je Firebase prijava.');
      return;
    }

    if (!isFirebaseUserProfileComplete(state.firebasePatients.userProfile) || !getFirebaseAuthContext().hasValidClinicalContext) {
      const empty = document.createElement('div');
      empty.className = 'firebase-patient-dialog-empty';
      empty.textContent = getFirebaseClinicalContextErrorMessage();
      list.appendChild(empty);
      setFirebasePatientDialogStatus(getFirebaseClinicalContextErrorMessage(), true);
      return;
    }

    if (state.firebasePatients.loading && !state.firebasePatients.records.length) {
      const empty = document.createElement('div');
      empty.className = 'firebase-patient-dialog-empty';
      empty.textContent = 'Učitavam spremljene pacijente...';
      list.appendChild(empty);
      setFirebasePatientDialogStatus('Učitavam Firebase popis...');
      return;
    }

    const records = getFilteredFirebasePatientRecords();
    const modeRecords = getFirebasePatientRecordsForDialogMode();
    const modeLabel = formatFirebasePatientModeShortLabel(getFirebasePatientDialogMode()).toLowerCase();
    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'firebase-patient-dialog-empty';
      empty.textContent = getFirebasePatientSearchQuery()
        ? 'Nema pacijenta koji odgovara pretrazi.'
        : `Nema spremljenih Firebase pacijenata za mod: ${modeLabel}.`;
      list.appendChild(empty);
      setFirebasePatientDialogStatus(getFirebasePatientSearchQuery()
        ? 'Nema rezultata za upisanu pretragu.'
        : `Nema spremljenih pacijenata za mod: ${modeLabel}.`);
      return;
    }

    records.forEach((record) => {
      const row = document.createElement('div');
      row.className = 'firebase-patient-row';
      if (isFirebasePatientRecordArchived(record)) row.classList.add('is-archived');
      if (isLegacyFirebasePatientRecord(record)) row.classList.add('is-legacy');
      row.dataset.firebasePatientId = record.id;
      row.dataset.firebasePatientStatus = record.status || FIREBASE_PATIENT_STATUSES.ACTIVE;
      row.setAttribute('role', 'listitem');
      if (record.id === state.firebasePatients.currentRecordId) {
        row.setAttribute('aria-current', 'true');
      }

      const archived = isFirebasePatientRecordArchived(record);
      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'firebase-patient-row-open';
      openButton.dataset.firebasePatientAction = 'open';
      openButton.dataset.firebasePatientId = record.id;
      openButton.disabled = Boolean(state.firebasePatients.loading || archived);
      openButton.setAttribute('aria-label', archived
        ? `Arhivirani pacijent ${record.label || 'bez imena'} se prvo mora vratiti`
        : `Otvori pacijenta ${record.label || 'bez imena'}`);

      const icon = document.createElement('span');
      icon.className = 'firebase-patient-row-icon';
      icon.setAttribute('aria-hidden', 'true');

      const main = document.createElement('span');
      main.className = 'firebase-patient-row-main';
      const name = document.createElement('span');
      name.className = 'firebase-patient-row-name';
      name.textContent = record.label || 'Pacijent bez imena';
      const meta = document.createElement('span');
      meta.className = 'firebase-patient-row-meta';
      meta.textContent = formatFirebasePatientDialogMeta(record) || 'Spremljeni Firebase pacijent';
      main.append(name, meta);

      const date = document.createElement('span');
      date.className = 'firebase-patient-row-date';
      date.textContent = formatFirebasePatientStoredDate(record.updatedAt || record.createdAt || record.serverUpdatedAt || record.serverCreatedAt);

      openButton.append(icon, main, date);

      const actions = document.createElement('span');
      actions.className = 'firebase-patient-row-actions';
      const rowActions = archived
        ? (canManageArchivedFirebasePatients()
          ? [['restore', 'Vrati', `Vrati arhiviranog pacijenta ${record.label || 'bez imena'}`, 'restore']]
          : [])
        : [
          ['rename', 'Preimenuj', `Preimenuj pacijenta ${record.label || 'bez imena'}`, ''],
          ['archive', 'Arhiviraj', `Arhiviraj pacijenta ${record.label || 'bez imena'}`, 'danger']
        ];
      rowActions.forEach(([action, text, ariaLabel, extraClass]) => {
        const actionButton = document.createElement('button');
        actionButton.type = 'button';
        actionButton.className = `firebase-patient-row-action${extraClass ? ` ${extraClass}` : ''}`;
        actionButton.dataset.firebasePatientAction = action;
        actionButton.dataset.firebasePatientId = record.id;
        actionButton.disabled = Boolean(state.firebasePatients.loading);
        actionButton.textContent = text;
        actionButton.setAttribute('aria-label', ariaLabel);
        actions.appendChild(actionButton);
      });

      row.append(openButton, actions);
      list.appendChild(row);
    });

    const archivedSuffix = shouldShowArchivedFirebasePatients() ? ' uključujući arhivirane' : '';
    const legacyCount = records.filter(isLegacyFirebasePatientRecord).length;
    const legacySuffix = legacyCount ? `, od toga starih za migraciju: ${legacyCount}` : '';
    setFirebasePatientDialogStatus(`Prikazano ${records.length} od ${modeRecords.length} spremljenih pacijenata (${modeLabel})${legacySuffix}${archivedSuffix}.`);
  }

  function getFirebasePatientSelectedId() {
    return String(els.firebasePatientSelect?.value || '');
  }

  function getSelectedFirebasePatientRecord() {
    const selectedId = getFirebasePatientSelectedId();
    if (!selectedId) return null;
    return state.firebasePatients.records.find(record => record.id === selectedId) || null;
  }

  function getFirebasePatientRecordById(id) {
    const recordId = String(id || '');
    if (!recordId) return null;
    return state.firebasePatients.records.find(record => record.id === recordId) || null;
  }

  function addDaysToDate(date, days) {
    const source = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
    return new Date(source.getTime() + (Number(days || 0) * 24 * 60 * 60 * 1000));
  }

  function getFirebasePatientExpiresAtIso(baseDate = new Date()) {
    return addDaysToDate(baseDate, FIREBASE_PATIENT_RETENTION_DAYS).toISOString();
  }

  function getParserTestCaseExpiresAtIso(baseDate = new Date()) {
    return addDaysToDate(baseDate, RETENTION_POLICY.parserTestDays).toISOString();
  }

  function isFirebasePatientExpired(record, now = new Date()) {
    const expiresAt = firebaseTimestampToDate(record?.expiresAt);
    return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
  }

  async function deleteExpiredFirebasePatientRecords(records) {
    const expired = records.filter(record => !isFirebasePatientRecordArchived(record) && isFirebasePatientExpired(record));
    if (!expired.length || !state.firebasePatients.user) return records;
    try {
      const client = await getFirebasePatientsClient();
      const nowIso = new Date().toISOString();
      const user = state.firebasePatients.user;
      const authContext = getFirebaseAuthContext();
      const clinicalPartitionKey = getClinicalPartitionKey(authContext);
      const archivePayloads = expired.map(record => ({
        record,
        payload: {
          schema: 'temperaturna-lista-patient-v1',
          appVersion: APP_VERSION,
          updatedAt: nowIso,
          lastSaveTrigger: 'retention-expired',
          status: FIREBASE_PATIENT_STATUSES.DELETED,
          deletedAt: nowIso,
          deletedByUid: user.uid,
          deletedByEmail: user.email || '',
          deleteReason: 'Automatsko arhiviranje nakon isteka roka čuvanja.',
          accessModel: CLINICAL_ACCESS_MODEL_VERSION,
          organizationId: authContext.organizationId,
          wardId: authContext.activeWardId,
          wardIds: authContext.wardIds,
          roles: authContext.roles,
          clinicalPartitionKey,
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          ownerDepartment: state.firebasePatients.userProfile?.department || '',
          ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
          label: record.label,
          patientKey: record.patientKey,
          patientMode: record.patientMode,
          data: record.data,
          serverUpdatedAt: client.serverTimestamp()
        }
      }));
      await Promise.all(archivePayloads.map(({ record, payload }) =>
        client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id), payload, { merge: true })
      ));
      await Promise.all(archivePayloads.map(({ record, payload }) =>
        writePatientAuditEvent('patient.softDelete', {
          client,
          patientDocId: record.id,
          patientKey: record.patientKey,
          previousRecord: record,
          newRecord: { ...record, ...payload },
          trigger: 'retention-expired',
          changeSummary: 'Pacijent je automatski arhiviran nakon isteka roka čuvanja.',
          changedFields: ['status', 'deletedAt', 'deletedByUid', 'deletedByEmail', 'deleteReason'],
          metadata: { retentionDays: FIREBASE_PATIENT_RETENTION_DAYS }
        })
      ));
      if (expired.some(record => record.id === state.firebasePatients.currentRecordId)) {
        resetCurrentFirebasePatientContext();
      }
      markFirebaseAvailabilityAvailable();
      setFirebasePatientStatus(`Arhivirano isteklih pacijenata: ${expired.length}`, 'ok');
      return records.map((record) => {
        const archived = archivePayloads.find(item => item.record.id === record.id);
        return archived ? { ...record, ...archived.payload, serverUpdatedAt: null } : record;
      });
    } catch (error) {
      console.warn('Arhiviranje isteklih Firebase pacijenata nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientStatus('Arhiviranje isteklih pacijenata nije uspjelo.', 'error');
      return records;
    }
  }

  function getFirebasePatientDataSignature(data) {
    try {
      return JSON.stringify(data || {});
    } catch (error) {
      return '';
    }
  }

  function getStableAuditJson(value) {
    const normalize = (input) => {
      if (input === null || typeof input !== 'object') return input;
      if (Array.isArray(input)) return input.map(normalize);
      return Object.keys(input)
        .sort()
        .reduce((result, key) => {
          const item = input[key];
          if (typeof item === 'function' || typeof item === 'undefined') return result;
          result[key] = normalize(item);
          return result;
        }, {});
    };
    try {
      return JSON.stringify(normalize(value ?? null));
    } catch (error) {
      return '';
    }
  }

  async function getPatientAuditHash(value) {
    const stableJson = getStableAuditJson(value);
    if (!stableJson || !window.crypto?.subtle || typeof TextEncoder === 'undefined') return '';
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson));
      return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.warn('Izračun audit hasha nije uspio.', error);
      return '';
    }
  }

  function getChangedPatientDataFields(previousData = {}, nextData = {}) {
    const previousObject = isPlainJsonObject(previousData) ? previousData : {};
    const nextObject = isPlainJsonObject(nextData) ? nextData : {};
    const fields = new Set([...Object.keys(previousObject), ...Object.keys(nextObject)]);
    return Array.from(fields)
      .filter((field) => getStableAuditJson(previousObject[field]) !== getStableAuditJson(nextObject[field]))
      .sort();
  }

  function getPatientAuditActorRole(authContext = getFirebaseAuthContext()) {
    const roles = normalizeClinicalRoleList(authContext?.roles || []);
    return roles.includes('admin') ? 'admin' : (roles[0] || DEFAULT_CLINICAL_ROLE);
  }

  function getPatientAuditDataFromRecord(record) {
    if (!record) return null;
    return {
      id: record.id || '',
      patientKey: record.patientKey || '',
      patientMode: record.patientMode || '',
      status: record.status || FIREBASE_PATIENT_STATUSES.ACTIVE,
      data: record.data || null
    };
  }

  async function writePatientAuditEvent(eventType, options = {}) {
    const authContext = refreshFirebaseAuthContext();
    if (!state.firebasePatients.user || !authContext.hasValidClinicalContext) return false;
    try {
      const client = options.client || await getFirebasePatientsClient();
      const nowIso = options.createdAt || new Date().toISOString();
      const previousData = Object.prototype.hasOwnProperty.call(options, 'previousData')
        ? options.previousData
        : getPatientAuditDataFromRecord(options.previousRecord);
      const newData = Object.prototype.hasOwnProperty.call(options, 'newData')
        ? options.newData
        : getPatientAuditDataFromRecord(options.newRecord);
      const previousHash = options.previousHash || (previousData == null ? '' : await getPatientAuditHash(previousData));
      const newHash = options.newHash || (newData == null ? '' : await getPatientAuditHash(newData));
      const user = state.firebasePatients.user;
      const patientKey = String(options.patientKey || options.newRecord?.patientKey || options.previousRecord?.patientKey || '');
      const patientDocId = String(options.patientDocId || options.newRecord?.id || options.previousRecord?.id || '');
      const eventPayload = {
        schema: FIREBASE_PATIENT_AUDIT_SCHEMA,
        eventType: String(eventType || ''),
        patientDocId,
        patientKey,
        accessModel: CLINICAL_ACCESS_MODEL_VERSION,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        clinicalPartitionKey: getClinicalPartitionKey(authContext),
        actorUid: user.uid,
        actorEmail: user.email || authContext.email || '',
        actorRole: getPatientAuditActorRole(authContext),
        appVersion: APP_VERSION,
        createdAt: nowIso,
        serverCreatedAt: client.serverTimestamp(),
        source: 'client',
        trigger: String(options.trigger || ''),
        changeSummary: String(options.changeSummary || '').slice(0, 300),
        changedFields: Array.isArray(options.changedFields) ? options.changedFields.map(String).slice(0, 80) : [],
        previousHash,
        newHash,
        metadata: isPlainJsonObject(options.metadata) ? options.metadata : {}
      };
      await client.addDoc(client.collection(client.db, FIREBASE_PATIENT_AUDIT_EVENTS_COLLECTION), eventPayload);
      return true;
    } catch (error) {
      console.warn('Upis audit eventa nije uspio.', error);
      return false;
    }
  }

  function resetCurrentFirebasePatientContext() {
    state.firebasePatients.currentRecordId = '';
    state.firebasePatients.currentRecordVersion = 0;
    state.firebasePatients.currentRecordUpdatedAt = '';
    state.firebasePatients.currentRecordDataHash = '';
    state.firebasePatients.currentRecordBaseData = null;
    state.firebasePatients.lastAutoSaveSignature = '';
    window.clearTimeout(state.firebasePatients.autoSaveTimer);
    state.firebasePatients.autoSaveTimer = null;
    state.firebasePatients.autoSavePending = false;
    const data = getFormData();
    if (isPatientDataDifferentFromEmpty(data)) {
      setPatientSyncState({
        status: 'dirty',
        lastSaveTarget: 'none',
        lastError: '',
        currentPatientDocId: '',
        currentPatientVersion: getPatientSyncVersion(data),
        hasUnsavedChanges: true
      });
    } else {
      resetPatientSyncState('empty', { data });
    }
  }

  function rememberCurrentFirebasePatient(record) {
    if (!record) {
      resetCurrentFirebasePatientContext();
      return;
    }
    const dataSignature = getFirebasePatientDataSignature(record.data);
    state.firebasePatients.currentRecordId = record.id;
    state.firebasePatients.currentRecordVersion = Number(record.version || 0);
    state.firebasePatients.currentRecordUpdatedAt = String(record.updatedAt || '');
    state.firebasePatients.currentRecordDataHash = String(record.dataHash || dataSignature || '');
    state.firebasePatients.currentRecordBaseData = clonePatientDataForConflict(record.data || {});
    state.firebasePatients.lastAutoSaveSignature = dataSignature;
    markPatientSyncSynced({
      data: record.data,
      currentPatientDocId: record.id,
      currentPatientVersion: dataSignature,
      lastSavedAt: record.updatedAt || record.createdAt || new Date().toISOString(),
      lastSaveTarget: 'firebase'
    });
  }

  function clonePatientDataForConflict(data = {}) {
    try {
      return JSON.parse(JSON.stringify(data || {}));
    } catch (error) {
      return { ...(data || {}) };
    }
  }

  function getFirebasePatientRecordVersion(record) {
    return Number(record?.version || 0);
  }

  function getFirebasePatientRecordHash(record) {
    return String(record?.dataHash || getFirebasePatientDataSignature(record?.data || {}) || '');
  }

  async function fetchFirebasePatientRecordById(client, recordId, options = {}) {
    if (!client || !recordId) return null;
    const docSnap = await client.getDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, recordId));
    if (!docSnap.exists()) return null;
    return normalizeFirebasePatientRecord(docSnap, options);
  }

  function getLocalFirebasePatientBaseForConflict(previousRecord) {
    return {
      version: Number(state.firebasePatients.currentRecordVersion || previousRecord?.version || 0),
      updatedAt: String(state.firebasePatients.currentRecordUpdatedAt || previousRecord?.updatedAt || ''),
      dataHash: String(state.firebasePatients.currentRecordDataHash || getFirebasePatientRecordHash(previousRecord)),
      data: clonePatientDataForConflict(state.firebasePatients.currentRecordBaseData || previousRecord?.data || {})
    };
  }

  function hasFirebasePatientSaveConflict(remoteRecord, baseRecord, localData) {
    if (!remoteRecord || !baseRecord) return false;
    const remoteVersion = getFirebasePatientRecordVersion(remoteRecord);
    const baseVersion = Number(baseRecord.version || 0);
    const remoteHash = getFirebasePatientRecordHash(remoteRecord);
    const baseHash = String(baseRecord.dataHash || '');
    const localHash = getFirebasePatientDataSignature(localData || {});
    if (remoteVersion && baseVersion && remoteVersion > baseVersion) return true;
    if (remoteRecord.updatedAt && baseRecord.updatedAt && String(remoteRecord.updatedAt) !== String(baseRecord.updatedAt) && remoteHash !== localHash) return true;
    return Boolean(remoteHash && baseHash && remoteHash !== baseHash && remoteHash !== localHash);
  }

  function normalizePatientConflictChoice(value) {
    const text = String(value || '').trim().toLowerCase();
    if (['1', 'load', 'load-remote', 'remote', 'ucitaj', 'učitaj'].includes(text)) return 'load-remote';
    if (['2', 'copy', 'save-copy', 'spremi-kopiju', 'kopija'].includes(text)) return 'save-copy';
    if (['3', 'merge', 'spoji'].includes(text)) return 'merge';
    return 'cancel';
  }

  function choosePatientConflictResolution(remoteRecord, options = {}) {
    const injected = window.__TEMPERATURNA_LISTA_CONFLICT_RESOLUTION__;
    if (typeof injected === 'function') {
      return normalizePatientConflictChoice(injected({ remoteRecord, options }));
    }
    if (typeof injected === 'string') return normalizePatientConflictChoice(injected);
    if (options.automatic) return 'cancel';
    const updatedBy = [remoteRecord?.updatedByEmail || remoteRecord?.ownerEmail || '', remoteRecord?.updatedAt || ''].filter(Boolean).join(', ');
    const message = [
      'Otkrivena je novija verzija pacijenta.',
      updatedBy ? `Zadnje spremanje: ${updatedBy}` : '',
      '',
      'Odaberite:',
      '1 - Učitaj noviju verziju i odbaci moje lokalne promjene',
      '2 - Spremi moju verziju kao novu kopiju',
      '3 - Pokušaj spojiti nepreklapajuće promjene',
      '4 - Odustani i ostavi moje promjene lokalno'
    ].filter(Boolean).join('\n');
    return normalizePatientConflictChoice(window.prompt(message, '4'));
  }

  function mergePatientDataWithoutOverlappingConflicts(baseData = {}, remoteData = {}, localData = {}) {
    const merged = clonePatientDataForConflict(remoteData);
    const conflicts = [];
    const fields = Array.from(new Set([
      ...Object.keys(getEmptyPatientData()),
      ...Object.keys(baseData || {}),
      ...Object.keys(remoteData || {}),
      ...Object.keys(localData || {})
    ]));
    fields.forEach((field) => {
      const baseValue = JSON.stringify(baseData?.[field] ?? '');
      const remoteValue = JSON.stringify(remoteData?.[field] ?? '');
      const localValue = JSON.stringify(localData?.[field] ?? '');
      const changedRemote = remoteValue !== baseValue;
      const changedLocal = localValue !== baseValue;
      if (changedLocal && !changedRemote) {
        merged[field] = localData[field];
      } else if (changedLocal && changedRemote && localValue !== remoteValue) {
        conflicts.push(field);
      }
    });
    const validation = validatePatientDataObject(merged);
    return {
      ok: validation.ok && conflicts.length === 0,
      data: validation.data || merged,
      conflicts,
      errors: validation.errors || []
    };
  }

  async function resolveFirebasePatientSaveConflict({ client, recordId, patientKey, previousRecord, remoteRecord, localData, baseRecord, saveTrigger, automatic, fromPrint, patientMode }) {
    await writePatientAuditEvent(FIREBASE_PATIENT_CONFLICT_EVENTS.DETECTED, {
      client,
      patientDocId: recordId,
      patientKey,
      previousRecord,
      newRecord: remoteRecord,
      trigger: saveTrigger,
      changeSummary: 'Otkrivena je novija verzija pacijenta prije spremanja.',
      changedFields: getChangedPatientDataFields(baseRecord?.data || {}, remoteRecord?.data || {}),
      metadata: {
        automatic,
        fromPrint,
        patientMode,
        localBaseVersion: baseRecord?.version || 0,
        remoteVersion: remoteRecord?.version || 0
      }
    });

    const choice = choosePatientConflictResolution(remoteRecord, { automatic, fromPrint });
    if (choice === 'load-remote') {
      state.firebasePatients.suppressAutoSave = true;
      try {
        setFormData(remoteRecord.data);
        renderAll();
        savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'firebase-conflict-loaded-remote' });
      } finally {
        state.firebasePatients.suppressAutoSave = false;
      }
      rememberCurrentFirebasePatient(remoteRecord);
      setFirebasePatientStatus('Učitana je novija Firebase verzija pacijenta.', 'ok');
      setStatus('Učitana je novija verzija pacijenta. Lokalne promjene su odbačene prema potvrdi korisnika.');
      return { shouldContinue: false, action: choice };
    }
    if (choice === 'save-copy') {
      setFirebasePatientStatus('Konflikt: spremam lokalnu verziju kao novu kopiju.', 'warn');
      return { shouldContinue: true, action: choice };
    }
    if (choice === 'merge') {
      const mergeResult = mergePatientDataWithoutOverlappingConflicts(baseRecord?.data || {}, remoteRecord?.data || {}, localData || {});
      if (!mergeResult.ok) {
        const fields = mergeResult.conflicts.length ? mergeResult.conflicts.join(', ') : mergeResult.errors.join(' ');
        const message = `Automatsko spajanje nije sigurno. Konfliktna polja: ${fields || 'nepoznato'}.`;
        markPatientSyncFailed(message, { data: localData, status: 'dirty', lastSaveTarget: 'firebase' });
        setFirebasePatientStatus(message, 'error');
        setStatus(message, true);
        return { shouldContinue: false, action: choice };
      }
      setFirebasePatientStatus('Konflikt je spojen jer se promjene ne preklapaju.', 'warn');
      return { shouldContinue: true, action: choice, data: mergeResult.data, mergedFields: getChangedPatientDataFields(remoteRecord.data, mergeResult.data) };
    }

    const message = automatic
      ? 'Firebase auto-save je zaustavljen jer postoji novija verzija pacijenta.'
      : 'Spremanje je zaustavljeno jer postoji novija verzija pacijenta.';
    markPatientSyncFailed(message, { data: localData, status: 'dirty', lastSaveTarget: 'firebase' });
    setFirebasePatientStatus(message, 'error');
    setStatus(message, true);
    return { shouldContinue: false, action: 'cancel' };
  }

  function upsertFirebasePatientRecord(record) {
    if (!record?.id) return;
    const existingIndex = state.firebasePatients.records.findIndex(item => item.id === record.id);
    if (existingIndex >= 0) {
      state.firebasePatients.records.splice(existingIndex, 1, { ...state.firebasePatients.records[existingIndex], ...record });
    } else {
      state.firebasePatients.records.unshift(record);
    }
    state.firebasePatients.records.sort((a, b) => {
      const bTime = firebaseTimestampToMillis(b.serverUpdatedAt) || firebaseTimestampToMillis(b.updatedAt);
      const aTime = firebaseTimestampToMillis(a.serverUpdatedAt) || firebaseTimestampToMillis(a.updatedAt);
      return bTime - aTime;
    });
    renderFirebasePatientList(record.id);
  }

  function updateFirebasePatientControls() {
    const hasClient = Boolean(state.firebasePatients.client);
    const hasUser = Boolean(state.firebasePatients.user);
    const hasProfile = isFirebaseUserProfileComplete(state.firebasePatients.userProfile);
    const hasClinicalContext = Boolean(getFirebaseAuthContext().hasValidClinicalContext);
    const hasClinicalAccess = hasProfile && hasClinicalContext;
    const loading = Boolean(state.firebasePatients.loading);
    const profileLoading = Boolean(state.firebasePatients.profileLoading);
    const busy = loading || profileLoading;
    const hasRecords = getFirebasePatientRecordsForCurrentMode().length > 0;
    const hasSelection = Boolean(getFirebasePatientSelectedId());
    const legacyRecordCount = state.firebasePatients.records.filter(isLegacyFirebasePatientRecord).length;

    if (els.openFirebasePatientDialogBtn) els.openFirebasePatientDialogBtn.disabled = busy || !hasClient || !hasUser || !hasClinicalAccess;
    if (els.savePatientTopBtn) els.savePatientTopBtn.disabled = busy || state.firebasePatients.autoSaveInFlight || !hasClient || !hasUser || !hasClinicalAccess;
    if (els.newPatientEntryBtn) els.newPatientEntryBtn.disabled = busy || state.firebasePatients.autoSaveInFlight;
    if (els.firebasePatientSignInBtn) els.firebasePatientSignInBtn.disabled = busy || !hasClient || hasUser;
    if (els.firebasePatientSignOutBtn) els.firebasePatientSignOutBtn.disabled = busy || !hasClient || !hasUser;
    if (els.firebaseUserSwitchBtn) {
      els.firebaseUserSwitchBtn.disabled = busy || !hasClient;
      els.firebaseUserSwitchBtn.textContent = hasUser ? 'Promijeni račun' : 'Prijava';
    }
    if (els.firebaseUserNewBtn) {
      els.firebaseUserNewBtn.disabled = busy || !hasClient;
      els.firebaseUserNewBtn.textContent = hasUser && !hasProfile ? 'Dovrši profil' : 'Novi korisnik';
    }
    if (els.firebaseUserSignOutBtn) els.firebaseUserSignOutBtn.disabled = busy || !hasClient || !hasUser;
    if (els.firebaseUserMigrateLegacyPatientsBtn) {
      els.firebaseUserMigrateLegacyPatientsBtn.disabled = busy || !hasClient || !hasUser || !hasClinicalAccess || !legacyRecordCount;
      els.firebaseUserMigrateLegacyPatientsBtn.hidden = !legacyRecordCount;
      els.firebaseUserMigrateLegacyPatientsBtn.textContent = legacyRecordCount
        ? `Prebaci stare pacijente (${legacyRecordCount})`
        : 'Nema starih pacijenata';
    }
    if (els.savePatientToFirebaseBtn) els.savePatientToFirebaseBtn.disabled = busy || state.firebasePatients.autoSaveInFlight || !hasClient || !hasUser || !hasClinicalAccess;
    if (els.refreshFirebasePatientsBtn) els.refreshFirebasePatientsBtn.disabled = busy || !hasClient || !hasUser || !hasClinicalAccess;
    if (els.firebasePatientSelect) els.firebasePatientSelect.disabled = busy || !hasUser || !hasClinicalAccess || !hasRecords;
    if (els.loadPatientFromFirebaseBtn) els.loadPatientFromFirebaseBtn.disabled = busy || !hasUser || !hasClinicalAccess || !hasSelection;
    if (els.deletePatientFromFirebaseBtn) els.deletePatientFromFirebaseBtn.disabled = busy || !hasUser || !hasClinicalAccess || !hasSelection;
    if (els.firebaseLoginGateSignInBtn) els.firebaseLoginGateSignInBtn.disabled = busy || !hasClient || (hasUser && hasProfile);
    if (els.firebaseLoginGateContinueOfflineBtn) els.firebaseLoginGateContinueOfflineBtn.disabled = busy;
    if (els.firebaseLoginGateNewUserBtn) els.firebaseLoginGateNewUserBtn.disabled = busy || !hasClient;
    if (els.firebaseRegisterSubmitBtn) els.firebaseRegisterSubmitBtn.disabled = busy || !hasClient;
    if (els.firebaseRegisterBackBtn) els.firebaseRegisterBackBtn.disabled = busy;
    if (els.firebasePatientSearchInput) els.firebasePatientSearchInput.disabled = !hasUser || !hasClinicalAccess;
    if (els.firebasePatientDialogSignInBtn) {
      els.firebasePatientDialogSignInBtn.disabled = busy || !hasClient || hasUser;
      els.firebasePatientDialogSignInBtn.hidden = hasUser;
    }
    if (els.firebasePatientDialogRefreshBtn) {
      els.firebasePatientDialogRefreshBtn.disabled = busy || !hasClient || !hasUser || !hasClinicalAccess;
      els.firebasePatientDialogRefreshBtn.hidden = !hasUser || !hasClinicalAccess;
    }
    renderFirebaseUserPanel();
    const canShowArchived = canManageArchivedFirebasePatients();
    if (!canShowArchived && state.firebasePatients.showArchived) {
      state.firebasePatients.showArchived = false;
    }
    if (els.firebasePatientShowArchivedFilter) {
      els.firebasePatientShowArchivedFilter.classList.toggle('hidden', !canShowArchived);
    }
    if (els.firebasePatientShowArchivedToggle) {
      els.firebasePatientShowArchivedToggle.disabled = busy || !canShowArchived;
      els.firebasePatientShowArchivedToggle.checked = Boolean(canShowArchived && state.firebasePatients.showArchived);
    }
  }

  function setAdminDashboardStatus(message, tone = 'neutral') {
    if (!els.adminDashboardStatus) return;
    els.adminDashboardStatus.textContent = message || '';
    els.adminDashboardStatus.classList.toggle('ok', tone === 'ok');
    els.adminDashboardStatus.classList.toggle('warn', tone === 'warn');
    els.adminDashboardStatus.classList.toggle('error', tone === 'error');
  }

  function getAdminUserDisplayName(profile = {}) {
    return getFirebaseProfileDisplayName(profile) || normalizeFirebaseProfileEmail(profile.email || '') || profile.uid || 'Nepoznati korisnik';
  }

  function normalizeAdminUserProfileRecord(docSnap) {
    const data = typeof docSnap?.data === 'function' ? docSnap.data() : docSnap || {};
    return {
      id: docSnap?.id || data.uid || '',
      uid: data.uid || docSnap?.id || '',
      email: normalizeFirebaseProfileEmail(data.email || ''),
      displayName: getAdminUserDisplayName(data),
      department: normalizeFirebaseProfileText(data.department || data.activeWardId || '', 100),
      organizationId: normalizeClinicalContextId(data.organizationId || '', 80),
      activeWardId: normalizeClinicalContextId(data.activeWardId || '', 80),
      wardIds: normalizeClinicalWardList(data.wardIds, data.activeWardId || data.department || ''),
      roles: normalizeClinicalRoleList(data.roles || data.role),
      status: String(data.status || data.accountStatus || 'active').toLowerCase(),
      updatedAt: data.updatedAt || data.createdAt || ''
    };
  }

  function normalizeAdminAuditRecord(docSnap) {
    const data = typeof docSnap?.data === 'function' ? docSnap.data() : docSnap || {};
    return {
      id: docSnap?.id || data.id || '',
      eventType: String(data.eventType || 'audit.event'),
      actorUid: String(data.actorUid || ''),
      actorEmail: normalizeFirebaseProfileEmail(data.actorEmail || ''),
      actorRole: String(data.actorRole || ''),
      organizationId: String(data.organizationId || ''),
      wardId: String(data.wardId || ''),
      createdAt: data.createdAt || data.serverCreatedAt || '',
      patientDocId: String(data.patientDocId || ''),
      trigger: String(data.trigger || ''),
      metadata: isPlainJsonObject(data.metadata) ? data.metadata : {}
    };
  }

  function getAdminRecordMillis(value) {
    return firebaseTimestampToMillis(value) || Date.parse(String(value || '')) || 0;
  }

  function isAdminErrorAuditEvent(event = {}) {
    return /saveFailed|printWithoutSync|conflictDetected|failed|error|denied/i.test(String(event.eventType || ''));
  }

  function getAdminLastSeen(user, patientRecords = [], auditEvents = []) {
    const candidates = [user.updatedAt];
    patientRecords.forEach((record) => {
      const ownerEmail = normalizeFirebaseProfileEmail(record.ownerEmail || '');
      if (record.ownerUid === user.uid || (ownerEmail && ownerEmail === user.email)) {
        candidates.push(record.updatedAt || record.serverUpdatedAt || record.createdAt || record.serverCreatedAt);
      }
    });
    auditEvents.forEach((event) => {
      if (event.actorUid === user.uid || (event.actorEmail && event.actorEmail === user.email)) {
        candidates.push(event.createdAt);
      }
    });
    const best = candidates
      .map(getAdminRecordMillis)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    return best ? new Date(best).toISOString() : '';
  }

  function countAdminUserPatients(user, patientRecords = []) {
    return patientRecords.filter((record) => {
      const ownerEmail = normalizeFirebaseProfileEmail(record.ownerEmail || '');
      return record.ownerUid === user.uid || (ownerEmail && ownerEmail === user.email);
    }).length;
  }

  function countAdminUserAuditEvents(user, auditEvents = []) {
    return auditEvents.filter((event) => (
      event.actorUid === user.uid ||
      (event.actorEmail && event.actorEmail === user.email)
    )).length;
  }

  function setAdminMetric(element, value) {
    if (element) element.textContent = String(value ?? 0);
  }

  function renderAdminList(target, items, emptyText, formatter) {
    if (!target) return;
    target.textContent = '';
    if (!items.length) {
      target.textContent = emptyText;
      return;
    }
    items.slice(0, 12).forEach((item) => {
      const row = document.createElement('div');
      row.className = 'admin-list-item';
      const title = document.createElement('strong');
      title.textContent = formatter(item).title;
      const meta = document.createElement('span');
      meta.textContent = formatter(item).meta;
      row.append(title, meta);
      target.appendChild(row);
    });
  }

  function renderAdminUsersTable() {
    const body = els.adminUsersTableBody;
    if (!body) return;
    const users = state.adminDashboard.users || [];
    const patientRecords = state.adminDashboard.patientRecords || [];
    const auditEvents = state.adminDashboard.auditEvents || [];
    body.textContent = '';
    if (!users.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 6;
      cell.textContent = state.adminDashboard.loading ? 'Učitavam korisnike...' : 'Nema učitanih korisnika.';
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    users.slice(0, 80).forEach((user) => {
      const row = document.createElement('tr');
      const patientCount = countAdminUserPatients(user, patientRecords);
      const usageCount = countAdminUserAuditEvents(user, auditEvents);
      const lastSeen = getAdminLastSeen(user, patientRecords, auditEvents);
      const cells = [
        `${user.displayName}\n${user.email || user.uid}`,
        user.department || user.activeWardId || 'Bez odjela',
        user.roles.length ? user.roles.join(', ') : 'bez uloge',
        String(patientCount),
        lastSeen ? `${usageCount} događaja · ${formatPatientDraftSavedAt(lastSeen)}` : `${usageCount} događaja`,
        user.status === 'active' ? 'Aktivan' : user.status
      ];
      cells.forEach((value, index) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        if (index === 5) cell.className = user.status === 'active' ? 'admin-status-ok' : 'admin-status-warn';
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderAdminDashboard() {
    const users = state.adminDashboard.users || [];
    const patientRecords = state.adminDashboard.patientRecords || [];
    const auditEvents = state.adminDashboard.auditEvents || [];
    const errors = state.adminDashboard.errors || [];
    const wardIds = new Set();
    users.forEach((user) => {
      (user.wardIds || []).forEach((wardId) => { if (wardId) wardIds.add(wardId); });
      if (user.activeWardId) wardIds.add(user.activeWardId);
    });
    patientRecords.forEach((record) => { if (record.wardId) wardIds.add(record.wardId); });

    setAdminMetric(els.adminMetricUsers, users.length);
    setAdminMetric(els.adminMetricWards, wardIds.size);
    setAdminMetric(els.adminMetricPatients, patientRecords.length);
    setAdminMetric(els.adminMetricAuditEvents, auditEvents.length);
    setAdminMetric(els.adminMetricErrors, errors.length);
    renderAdminUsersTable();
    renderAdminList(
      els.adminAuditList,
      auditEvents.slice().sort((a, b) => getAdminRecordMillis(b.createdAt) - getAdminRecordMillis(a.createdAt)),
      'Nema učitanih audit događaja.',
      (event) => ({
        title: event.eventType,
        meta: `${event.actorEmail || event.actorUid || 'nepoznati korisnik'} · ${event.wardId || 'bez odjela'} · ${formatPatientDraftSavedAt(event.createdAt)}`
      })
    );
    renderAdminList(
      els.adminErrorList,
      errors.slice().sort((a, b) => getAdminRecordMillis(b.createdAt) - getAdminRecordMillis(a.createdAt)),
      'Nema zabilježenih grešaka u učitanom audit uzorku.',
      (event) => ({
        title: event.eventType,
        meta: `${event.actorEmail || event.actorUid || 'nepoznati korisnik'} · ${formatPatientDraftSavedAt(event.createdAt)}`
      })
    );
    if (state.adminDashboard.loading) {
      setAdminDashboardStatus('Učitavam admin podatke...', 'warn');
    } else if (state.adminDashboard.lastError) {
      setAdminDashboardStatus(state.adminDashboard.lastError, 'error');
    } else if (state.adminDashboard.lastLoadedAt) {
      setAdminDashboardStatus(`Učitano: ${formatPatientDraftSavedAt(state.adminDashboard.lastLoadedAt)}.`, 'ok');
    }
  }

  async function refreshAdminDashboard(options = {}) {
    if (!requireSuperAdminForAdminMode({ silent: options.silent })) return false;
    try {
      state.adminDashboard.loading = true;
      state.adminDashboard.lastError = '';
      renderAdminDashboard();
      const client = await getFirebasePatientsClient();
      const [usersSnapshot, patientsSnapshot, auditSnapshot] = await Promise.all([
        client.getDocs(client.query(client.collection(client.db, FIREBASE_USER_PROFILES_COLLECTION), client.limit(150))),
        client.getDocs(client.query(client.collection(client.db, FIREBASE_PATIENTS_COLLECTION), client.limit(500))),
        client.getDocs(client.query(client.collection(client.db, FIREBASE_PATIENT_AUDIT_EVENTS_COLLECTION), client.limit(250)))
      ]);
      const users = usersSnapshot.docs.map(normalizeAdminUserProfileRecord).filter(user => user.uid || user.email);
      const patientRecords = patientsSnapshot.docs
        .map((docSnap) => normalizeFirebasePatientRecord(docSnap, { allowLegacy: true }))
        .filter(Boolean);
      const auditEvents = auditSnapshot.docs.map(normalizeAdminAuditRecord);
      state.adminDashboard.users = users.sort((a, b) => a.displayName.localeCompare(b.displayName, 'hr'));
      state.adminDashboard.patientRecords = patientRecords;
      state.adminDashboard.auditEvents = auditEvents;
      state.adminDashboard.errors = auditEvents.filter(isAdminErrorAuditEvent);
      state.adminDashboard.lastLoadedAt = new Date().toISOString();
      markFirebaseAvailabilityAvailable();
      renderAdminDashboard();
      return true;
    } catch (error) {
      console.warn('Admin dashboard nije učitan.', error);
      const message = `Admin dashboard nije učitan: ${getFirebaseAuthErrorMessage(error)}`;
      state.adminDashboard.lastError = message;
      markFirebaseAvailabilityUnavailable(error);
      setAdminDashboardStatus(message, 'error');
      setStatus(message, true);
      renderAdminDashboard();
      return false;
    } finally {
      state.adminDashboard.loading = false;
      renderAdminDashboard();
    }
  }

  function buildAdminDashboardExportPayload() {
    const users = state.adminDashboard.users || [];
    const patientRecords = state.adminDashboard.patientRecords || [];
    const auditEvents = state.adminDashboard.auditEvents || [];
    const errors = state.adminDashboard.errors || [];
    return {
      schema: 'temperaturna-lista-admin-report-v1',
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        uid: getFirebaseAuthContext().uid,
        email: getFirebaseAuthContext().email,
        roles: getFirebaseAuthContext().roles
      },
      privacy: {
        containsPatientClinicalText: false,
        note: 'Izvještaj sadrži administratorske metapodatke, ne klinički tekst pacijenata.'
      },
      metrics: {
        users: users.length,
        patients: patientRecords.length,
        auditEvents: auditEvents.length,
        errors: errors.length
      },
      users: users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        department: user.department,
        organizationId: user.organizationId,
        activeWardId: user.activeWardId,
        wardIds: user.wardIds,
        roles: user.roles,
        status: user.status,
        patientCount: countAdminUserPatients(user, patientRecords),
        auditEventCount: countAdminUserAuditEvents(user, auditEvents),
        lastSeenAt: getAdminLastSeen(user, patientRecords, auditEvents)
      })),
      auditSample: auditEvents.slice(0, 100).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        actorUid: event.actorUid,
        actorEmail: event.actorEmail,
        actorRole: event.actorRole,
        organizationId: event.organizationId,
        wardId: event.wardId,
        createdAt: event.createdAt,
        patientDocId: event.patientDocId,
        trigger: event.trigger
      })),
      errorSample: errors.slice(0, 100).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        actorUid: event.actorUid,
        actorEmail: event.actorEmail,
        wardId: event.wardId,
        createdAt: event.createdAt,
        trigger: event.trigger
      }))
    };
  }

  function exportAdminDashboardReport() {
    if (!requireSuperAdminForAdminMode()) return;
    const payload = buildAdminDashboardExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const filename = `temperaturna-lista-admin-izvjestaj-${getLocalIsoDateString(new Date())}.json`;
    downloadBlob(filename, blob);
    setAdminDashboardStatus('Admin izvještaj je preuzet. Ne sadrži klinički tekst pacijenata.', 'ok');
    setStatus('Admin izvještaj je preuzet.');
  }

  function explainLockedAdminServerAction() {
    const message = 'Ova radnja je zaključana dok se ne doda serverska Firebase Admin SDK / Cloud Function zaštita. Frontend ne smije sam dodjeljivati ovlasti.';
    setAdminDashboardStatus(message, 'warn');
    setStatus(message, true);
  }

  function renderFirebasePatientList(preferredId = '') {
    const select = els.firebasePatientSelect;
    if (!select) return;
    const previousId = preferredId || select.value || '';
    const records = getFirebasePatientRecordsForCurrentMode();
    select.textContent = '';

    if (!records.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = state.firebasePatients.user
        ? `Nema spremljenih Firebase pacijenata (${formatFirebasePatientModeShortLabel(getCurrentPatientMode())})`
        : 'Prijavi se za Firebase popis';
      select.appendChild(option);
      renderFirebasePatientDialogList();
      updateFirebasePatientControls();
      return;
    }

    records.forEach((record) => {
      const option = document.createElement('option');
      option.value = record.id;
      option.textContent = formatFirebasePatientOptionLabel(record);
      select.appendChild(option);
    });

    if (previousId && records.some(record => record.id === previousId)) {
      select.value = previousId;
    } else {
      select.selectedIndex = 0;
    }
    renderFirebasePatientDialogList();
    updateFirebasePatientControls();
  }

  function formatFirebasePatientOptionLabel(record) {
    const label = truncateFirebasePatientLabel(record.label || 'Pacijent bez imena', 54);
    const dateText = formatFirebasePatientStoredDate(record.updatedAt || record.createdAt || record.serverUpdatedAt || record.serverCreatedAt);
    const modeLabel = formatFirebasePatientModeShortLabel(getFirebasePatientRecordMode(record));
    return dateText ? `${label} - ${modeLabel} - ${dateText}` : `${label} - ${modeLabel}`;
  }

  function truncateFirebasePatientLabel(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
  }

  function formatFirebasePatientStoredDate(value) {
    const date = firebaseTimestampToDate(value);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}.`;
  }

  function firebaseTimestampToDate(value) {
    if (!value) return null;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
    if (typeof value.toDate === 'function') {
      const parsed = value.toDate();
      return parsed instanceof Date && Number.isFinite(parsed.getTime()) ? parsed : null;
    }
    if (Number.isFinite(value.seconds)) {
      const millis = value.seconds * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000);
      const parsed = new Date(millis);
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
    return null;
  }

  function firebaseTimestampToMillis(value) {
    const date = firebaseTimestampToDate(value);
    return date ? date.getTime() : 0;
  }

  function buildFirebasePatientLabel(data = {}) {
    const name = String(data.fullName || '').replace(/\s+/g, ' ').trim() || 'Pacijent bez imena';
    const birthYear = String(data.birthYear || '').trim();
    const admissionDate = String(data.admissionDate || '').trim();
    const parts = [name];
    if (birthYear) parts.push(`(${birthYear})`);
    if (admissionDate) parts.push(formatIsoDateToCroatian(admissionDate));
    return parts.join(' ');
  }

  function normalizeFirebasePatientIdentityPart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getFirebasePatientIdentityKey(data = {}) {
    const mode = getPatientModeFromData(data);
    const name = normalizeFirebasePatientIdentityPart(data.fullName);
    const birthYear = normalizeFirebasePatientIdentityPart(data.birthYear);
    const admissionDate = normalizeFirebasePatientIdentityPart(data.admissionDate);
    if (!name && !birthYear && !admissionDate) return '';
    return `patient-v1|${mode}|${name}|${birthYear}|${admissionDate}`;
  }

  function getLegacyFirebasePatientIdentityKey(data = {}) {
    const name = normalizeFirebasePatientIdentityPart(data.fullName);
    const birthYear = normalizeFirebasePatientIdentityPart(data.birthYear);
    const admissionDate = normalizeFirebasePatientIdentityPart(data.admissionDate);
    if (!name && !birthYear && !admissionDate) return '';
    return `patient-v1|${name}|${birthYear}|${admissionDate}`;
  }

  function findFirebasePatientRecordByIdentity(data = {}) {
    const identityKey = getFirebasePatientIdentityKey(data);
    if (!identityKey) return null;
    const identityKeys = new Set([identityKey]);
    if (getPatientModeFromData(data) === PATIENT_MODES.WARD) {
      const legacyKey = getLegacyFirebasePatientIdentityKey(data);
      if (legacyKey) identityKeys.add(legacyKey);
    }
    return state.firebasePatients.records.find((record) => {
      if (isFirebasePatientRecordArchived(record)) return false;
      const recordKey = record.patientKey || getFirebasePatientIdentityKey(record.data);
      if (identityKeys.has(recordKey)) return true;
      if (getFirebasePatientRecordMode(record) !== getPatientModeFromData(data)) return false;
      const recordIdentityKey = getFirebasePatientIdentityKey(record.data);
      if (identityKeys.has(recordIdentityKey)) return true;
      const legacyRecordKey = getLegacyFirebasePatientIdentityKey(record.data);
      return identityKeys.has(legacyRecordKey);
    }) || null;
  }

  function getFirebaseAuthErrorMessage(error) {
    const code = String(error?.code || '');
    if (code === 'auth/unauthorized-domain') {
      return 'Domena nije dopuštena. U Firebase Authentication > Settings > Authorized domains dodaj lukajerkovic1-creator.github.io ili aktualnu GitHub Pages domenu.';
    }
    if (code === 'auth/operation-not-allowed') return 'Google prijava nije uključena. U Firebase Authentication > Sign-in method uključi Google.';
    if (code === 'auth/popup-closed-by-user') return 'Prijava je zatvorena prije završetka.';
    if (code === 'auth/popup-blocked') return 'Preglednik je blokirao Firebase prijavni prozor.';
    if (code === 'auth/cancelled-popup-request') return 'Već je otvoren jedan Firebase prijavni prozor.';
    if (code === 'auth/network-request-failed') return 'Mreža nije dopustila Firebase prijavu.';
    if (code === 'auth/web-storage-unsupported') return 'Preglednik blokira spremanje prijave. Provjeri cookies/storage postavke.';
    if (code === 'auth/invalid-api-key') return 'Firebase API ključ nije ispravan za ovaj projekt.';
    if (code === 'permission-denied') return 'Firebase pravila trenutno ne dopuštaju ovu radnju.';
    const message = error?.message || 'Firebase radnja nije uspjela.';
    return code ? `${message} (${code})` : message;
  }

  function isFirebasePatientsSmokeMode() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const qa = params.get('qa') || '';
      return params.get('firebaseSmoke') === '1' || /\bfirebase-save-smoke\b/i.test(qa);
    } catch (error) {
      return false;
    }
  }

  function getFirebasePatientsSmokeClient() {
    if (!isFirebasePatientsSmokeMode()) return null;
    const client = window[FIREBASE_SMOKE_CLIENT_GLOBAL];
    if (!client || typeof client !== 'object') return null;
    const requiredMethods = [
      'onAuthStateChanged', 'addDoc', 'setDoc', 'getDocs', 'getDoc',
      'collection', 'doc', 'query', 'where', 'limit', 'serverTimestamp'
    ];
    const missingMethod = requiredMethods.find((methodName) => typeof client[methodName] !== 'function');
    if (missingMethod) {
      console.warn(`Firebase smoke klijent nema metodu: ${missingMethod}`);
      return null;
    }
    client.__isTemperaturnaListaSmokeClient = true;
    return client;
  }

  async function getFirebasePatientsClient() {
    if (state.firebasePatients.client) return state.firebasePatients.client;
    const smokeClient = getFirebasePatientsSmokeClient();
    if (smokeClient) {
      state.firebasePatients.client = smokeClient;
      markFirebaseAvailabilityAvailable();
      return smokeClient;
    }

    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
    ]);

    const appName = 'temperaturna-lista-patients';
    const existingApp = appModule.getApps().find(app => app.name === appName);
    const app = existingApp || appModule.initializeApp(FIREBASE_CONFIG, appName);
    const auth = authModule.getAuth(app);
    try {
      await authModule.setPersistence(auth, authModule.browserLocalPersistence);
    } catch (error) {
      console.warn('Firebase Auth perzistencija nije dostupna; prijava možda neće ostati zapamćena.', error);
    }
    const provider = new authModule.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const client = {
      auth,
      db: firestoreModule.getFirestore(app),
      provider,
      signInWithPopup: authModule.signInWithPopup,
      signOut: authModule.signOut,
      onAuthStateChanged: authModule.onAuthStateChanged,
      setPersistence: authModule.setPersistence,
      browserLocalPersistence: authModule.browserLocalPersistence,
      collection: firestoreModule.collection,
      doc: firestoreModule.doc,
      addDoc: firestoreModule.addDoc,
      setDoc: firestoreModule.setDoc,
      getDocs: firestoreModule.getDocs,
      getDoc: firestoreModule.getDoc,
      query: firestoreModule.query,
      where: firestoreModule.where,
      limit: firestoreModule.limit,
      serverTimestamp: firestoreModule.serverTimestamp
    };
    state.firebasePatients.client = client;
    markFirebaseAvailabilityAvailable();
    return client;
  }

  function setFirebaseUserProfileReady(profile) {
    state.firebasePatients.userProfile = profile;
    const authContext = refreshFirebaseAuthContext();
    switchPersonalSuggestionsToUser(state.firebasePatients.user?.uid || 'local');
    resetFirebaseLoginGateDismissal();
    setFirebaseRegistrationMode(false, { focus: false });
    hideFirebaseLoginGate();
    const displayName = getFirebaseProfileDisplayName(profile);
    const department = profile?.department || '';
    const contextText = authContext.hasValidClinicalContext
      ? `${department || authContext.activeWardId} / ${authContext.organizationId}`
      : 'klinički kontekst nije potpun';
    setFirebasePatientStatus(`Prijavljeno: ${displayName} - ${contextText}`, authContext.hasValidClinicalContext ? 'ok' : 'error');
    setFirebaseLoginGateStatus(`Prijavljeno: ${displayName}.`);
  }

  async function handleFirebaseAuthenticatedUser(user) {
    state.firebasePatients.authResolved = true;
    state.firebasePatients.user = user || null;
    state.firebasePatients.records = [];
    renderFirebasePatientList();

    if (!user) {
      state.firebasePatients.userProfile = null;
      state.firebasePatients.authContext = createEmptyAuthContext();
      state.firebasePatients.pendingRegistrationProfile = null;
      switchPersonalSuggestionsToUser('local');
      resetCurrentFirebasePatientContext();
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        markPatientSyncFailed('Niste prijavljeni u Firebase.', { status: 'offline', lastSaveTarget: 'none' });
      }
      setFirebasePatientStatus('Nije prijavljeno.');
      setFirebaseRegistrationMode(false, { focus: false });
      syncFirebaseLoginGateState('Prijavi se Google računom ili registriraj novog korisnika.');
      updateFirebasePatientControls();
      return;
    }

    try {
      state.firebasePatients.profileLoading = true;
      updateFirebasePatientControls();
      const pendingProfile = state.firebasePatients.pendingRegistrationProfile;
      if (pendingProfile) {
        fillFirebaseRegistrationFormFromProfile({ ...pendingProfile, email: pendingProfile.email || user.email || '' }, { force: true });
        const savedProfile = await saveFirebaseUserProfile(pendingProfile, user);
        if (!savedProfile) {
          setFirebaseRegistrationMode(true, { focus: false });
          showFirebaseLoginGate('Dovrši registraciju korisnika.');
          return;
        }
        setFirebaseUserProfileReady(savedProfile);
      } else {
        const profile = await loadFirebaseUserProfile(user);
        if (isFirebaseUserProfileComplete(profile)) {
          setFirebaseUserProfileReady(profile);
        } else {
          state.firebasePatients.userProfile = profile || null;
          state.firebasePatients.authContext = buildAuthContext(user, profile);
          fillFirebaseRegistrationFormFromProfile(profile || buildProfileSeedFromFirebaseUser(user), { force: true });
          setFirebaseRegistrationMode(true, { focus: false });
          showFirebaseLoginGate('Korisnički profil nema potpun klinički kontekst. Upiši ime, prezime, odjel i Gmail.');
          setFirebasePatientStatus(getFirebaseClinicalContextErrorMessage(), 'error');
          return;
        }
      }

      await refreshFirebasePatients({ silent: true });
      scheduleFirebasePatientAutoSave({ force: true });
    } catch (error) {
      console.warn('Firebase korisnički profil nije dostupan.', error);
      const message = getFirebaseAuthErrorMessage(error);
      markFirebaseAvailabilityUnavailable(message);
      state.firebasePatients.userProfile = null;
      state.firebasePatients.authContext = buildAuthContext(user, null);
      setFirebaseRegistrationMode(true, { focus: false });
      showFirebaseLoginGate(message);
      setFirebaseLoginGateStatus(message, true);
      setFirebasePatientStatus('Korisnički profil nije učitan.', 'error');
    } finally {
      state.firebasePatients.profileLoading = false;
      updateFirebasePatientControls();
      syncFirebaseLoginGateState();
    }
  }

  async function initFirebasePatients() {
    if (!els.firebasePatientAuthStatus || state.firebasePatients.initialized) return;
    state.firebasePatients.initialized = true;
    mountFirebaseLoginGateOnBody();
    setFirebasePatientStatus('Povezivanje...');
    updateFirebasePatientControls();

    try {
      const client = await getFirebasePatientsClient();
      client.onAuthStateChanged(client.auth, (user) => {
        handleFirebaseAuthenticatedUser(user);
        return;
        state.firebasePatients.authResolved = true;
        state.firebasePatients.user = user || null;
        state.firebasePatients.records = [];
        renderFirebasePatientList();
        if (user) {
          const email = user.email || 'Google račun';
          resetFirebaseLoginGateDismissal();
          hideFirebaseLoginGate();
          setFirebasePatientStatus(`Prijavljeno: ${email}`, 'ok');
          setFirebaseLoginGateStatus(`Prijavljeno: ${email}`);
          refreshFirebasePatients({ silent: true }).then(() => {
            scheduleFirebasePatientAutoSave({ force: true });
          });
        } else {
          resetCurrentFirebasePatientContext();
          setFirebasePatientStatus('Nije prijavljeno.');
          syncFirebaseLoginGateState('Prijavi se Google računom za Firebase spremanje pacijenata.');
          updateFirebasePatientControls();
        }
      });
    } catch (error) {
      console.warn('Firebase pacijenti nisu dostupni.', error);
      const message = getFirebaseAuthErrorMessage(error);
      markFirebaseAvailabilityUnavailable(message);
      state.firebasePatients.authResolved = true;
      setFirebasePatientStatus('Firebase nije dostupan.', 'error');
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        markPatientSyncFailed('Firebase nije dostupan.', { status: 'offline', lastSaveTarget: 'none' });
      }
      showFirebaseLoginGate(message);
      setFirebaseLoginGateStatus(message, true);
      setStatus(`Firebase pacijenti nisu dostupni: ${message}`, true);
      updateFirebasePatientControls();
    }
  }

  async function signInFirebasePatients(options = {}) {
    try {
      const client = await getFirebasePatientsClient();
      if (options.registrationProfile) {
        state.firebasePatients.pendingRegistrationProfile = options.registrationProfile;
      }
      state.firebasePatients.loading = true;
      setFirebasePatientStatus('Prijava...');
      if (options.fromGate) setFirebaseLoginGateStatus('Otvaram Google prijavu...');
      updateFirebasePatientControls();
      await client.signInWithPopup(client.auth, client.provider);
    } catch (error) {
      console.warn('Firebase prijava nije uspjela.', error);
      const authErrorCode = String(error?.code || '');
      const wasPopupClosed = authErrorCode === 'auth/popup-closed-by-user';
      const wasPopupCancelled = authErrorCode === 'auth/cancelled-popup-request';
      const wasBrowserPopupIssue = authErrorCode === 'auth/popup-blocked';
      const isInteractivePopupIssue = wasPopupClosed || wasPopupCancelled || wasBrowserPopupIssue;
      const hasExistingUser = Boolean(state.firebasePatients.user);
      const message = wasPopupClosed && hasExistingUser
        ? 'Promjena računa je prekinuta. Trenutni korisnik je ostao prijavljen.'
        : wasPopupClosed
          ? 'Prijava je prekinuta. Firebase je dostupan; pokušaj ponovno kad želiš.'
        : getFirebaseAuthErrorMessage(error);
      if (isInteractivePopupIssue) markFirebaseAvailabilityAvailable();
      else markFirebaseAvailabilityUnavailable(message);
      setFirebasePatientStatus(message, isInteractivePopupIssue ? 'warn' : 'error');
      if (options.fromGate) setFirebaseLoginGateStatus(message, !isInteractivePopupIssue);
      setStatus(message, !isInteractivePopupIssue);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      syncFirebaseLoginGateState();
    }
  }

  async function handleFirebaseRegistrationSubmit(event) {
    event?.preventDefault?.();
    const profile = getFirebaseRegistrationFormProfile();
    const validation = validateFirebaseUserProfile(profile);
    if (!validation.ok) {
      setFirebaseLoginGateStatus(`Profil nije potpun: ${validation.errors.join(', ')}.`, true);
      return;
    }

    state.firebasePatients.pendingRegistrationProfile = profile;
    if (!state.firebasePatients.user) {
      await signInFirebasePatients({ fromGate: true, registrationProfile: profile });
      return;
    }

    try {
      state.firebasePatients.profileLoading = true;
      updateFirebasePatientControls();
      const savedProfile = await saveFirebaseUserProfile(profile, state.firebasePatients.user);
      if (!savedProfile) return;
      setFirebaseUserProfileReady(savedProfile);
      await refreshFirebasePatients({ silent: true });
      scheduleFirebasePatientAutoSave({ force: true });
    } catch (error) {
      console.warn('Spremanje Firebase korisničkog profila nije uspjelo.', error);
      const message = getFirebaseAuthErrorMessage(error);
      markFirebaseAvailabilityUnavailable(message);
      setFirebaseLoginGateStatus(message, true);
      setFirebasePatientStatus('Profil nije spremljen.', 'error');
      setStatus(message, true);
    } finally {
      state.firebasePatients.profileLoading = false;
      updateFirebasePatientControls();
      syncFirebaseLoginGateState();
    }
  }

  async function signOutFirebasePatients() {
    try {
      const client = await getFirebasePatientsClient();
      state.firebasePatients.loading = true;
      updateFirebasePatientControls();
      await client.signOut(client.auth);
      state.firebasePatients.records = [];
      state.firebasePatients.userProfile = null;
      state.firebasePatients.authContext = createEmptyAuthContext();
      state.firebasePatients.pendingRegistrationProfile = null;
      switchPersonalSuggestionsToUser('local');
      resetCurrentFirebasePatientContext();
      clearPatientDraft({ quiet: true });
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        markPatientSyncFailed('Odjavljeni ste iz Firebasea.', { status: 'offline', lastSaveTarget: 'none' });
      }
      renderFirebasePatientList();
      resetFirebaseLoginGateDismissal();
      syncFirebaseLoginGateState('Odjavljeni ste. Za Firebase spremanje ponovno se prijavite.');
      setStatus('Odjavljeni ste iz Firebase pacijenata.');
    } catch (error) {
      console.warn('Firebase odjava nije uspjela.', error);
      markFirebaseAvailabilityUnavailable(error);
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      if (isFirebasePatientDialogVisible()) renderFirebasePatientDialogList();
    }
  }

  function requireFirebasePatientUser() {
    const authContext = refreshFirebaseAuthContext();
    if (!state.firebasePatients.user) {
      setStatus('Prvo se prijavite u Firebase.', true);
      syncFirebaseLoginGateState('Prijavi se Google računom ili registriraj novog korisnika.');
      return false;
    }
    if (!isFirebaseUserProfileComplete(state.firebasePatients.userProfile)) {
      setStatus('Prvo dovrši korisnički profil za Firebase.', true);
      fillFirebaseRegistrationFormFromProfile(state.firebasePatients.userProfile || buildProfileSeedFromFirebaseUser(state.firebasePatients.user), { force: false });
      setFirebaseRegistrationMode(true, { focus: false });
      showFirebaseLoginGate('Dovrši korisnički profil prije rada s Firebase pacijentima.');
      return false;
    }
    if (!authContext.hasValidClinicalContext) {
      const message = getFirebaseClinicalContextErrorMessage();
      setFirebasePatientStatus(message, 'error');
      setStatus(message, true);
      setFirebaseRegistrationMode(true, { focus: false });
      showFirebaseLoginGate(message);
      return false;
    }
    return true;
  }

  async function saveCurrentPatientToFirebase(options = {}) {
    const automatic = Boolean(options.automatic);
    const fromPrint = Boolean(options.fromPrint);
    const automaticStatusLabel = String(options.statusLabel || (fromPrint ? 'Firebase spremanje prije ispisa' : 'Firebase auto-save'));
    const saveTrigger = String(options.saveTrigger || (fromPrint ? 'print' : automatic ? 'auto' : 'manual'));
    const authContext = refreshFirebaseAuthContext();
    if (state.firebasePatients.user && (!isFirebaseUserProfileComplete(state.firebasePatients.userProfile) || !authContext.hasValidClinicalContext)) {
      if (automatic) {
        setFirebasePatientStatus(`${automaticStatusLabel} čeka klinički kontekst.`);
        if (isPatientDataDifferentFromEmpty(getFormData())) {
          markPatientSyncFailed('Firebase klinički kontekst nije dovršen.', { status: 'offline', lastSaveTarget: 'none' });
        }
        return false;
      }
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        markPatientSyncFailed('Firebase klinički kontekst nije dovršen.', { status: 'offline', lastSaveTarget: 'none' });
      }
      if (!requireFirebasePatientUser()) return false;
    }
    if (!state.firebasePatients.user) {
      if (automatic) {
        setFirebasePatientStatus(`${automaticStatusLabel} čeka prijavu.`);
        if (isPatientDataDifferentFromEmpty(getFormData())) {
          markPatientSyncFailed('Niste prijavljeni u Firebase.', { status: 'offline', lastSaveTarget: 'none' });
        }
        return false;
      }
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        markPatientSyncFailed('Niste prijavljeni u Firebase.', { status: 'offline', lastSaveTarget: 'none' });
      }
      if (!requireFirebasePatientUser()) return false;
    }
    const patientData = getFormData();
    if (!isPatientDataDifferentFromEmpty(patientData)) {
      if (automatic) {
        setFirebasePatientStatus(`${automaticStatusLabel} čeka unos pacijenta.`);
      } else {
        setStatus('Nema unesenih podataka pacijenta za spremanje u Firebase.', true);
      }
      resetPatientSyncState('empty', { data: patientData });
      return false;
    }

    const validation = validatePatientDataObject(patientData);
    if (!validation.ok) {
      const message = `Podaci pacijenta nisu valjani za Firebase: ${validation.errors.join(' ')}`;
      if (automatic) {
        setFirebasePatientStatus(`${automaticStatusLabel} čeka valjane podatke.`, 'error');
      } else {
        setStatus(message, true);
      }
      markPatientSyncFailed(message, { data: patientData, lastSaveTarget: 'firebase' });
      return false;
    }

    let dataToSave = validation.data;
    let dataSignature = getFirebasePatientDataSignature(dataToSave);
    if (automatic && !options.force && dataSignature && dataSignature === state.firebasePatients.lastAutoSaveSignature) {
      if (state.firebasePatients.currentRecordId) {
        markPatientSyncSynced({
          data: dataToSave,
          currentPatientDocId: state.firebasePatients.currentRecordId,
          currentPatientVersion: dataSignature,
          lastSavedAt: state.patientSyncState.lastSavedAt || new Date().toISOString(),
          lastSaveTarget: 'firebase'
        });
      }
      return true;
    }

    markPatientSyncSaving('firebase');
    try {
      const client = await getFirebasePatientsClient();
      const nowIso = new Date().toISOString();
      const expiresAt = getFirebasePatientExpiresAtIso(new Date(nowIso));
      const user = state.firebasePatients.user;
      const clinicalPartitionKey = getClinicalPartitionKey(authContext);
      let matchingRecord = state.firebasePatients.currentRecordId
        ? null
        : findFirebasePatientRecordByIdentity(dataToSave);
      let existingId = state.firebasePatients.currentRecordId || matchingRecord?.id || '';
      let previousRecord = existingId ? (getFirebasePatientRecordById(existingId) || matchingRecord || null) : null;
      let remoteRecord = previousRecord;
      let conflictAction = '';

      if (existingId) {
        try {
          remoteRecord = await fetchFirebasePatientRecordById(client, existingId, { allowLegacy: true }) || previousRecord;
        } catch (error) {
          console.warn('Provjera udaljene verzije pacijenta nije uspjela.', error);
          remoteRecord = previousRecord;
        }
        const baseRecord = getLocalFirebasePatientBaseForConflict(previousRecord);
        if (remoteRecord && hasFirebasePatientSaveConflict(remoteRecord, baseRecord, dataToSave)) {
          const resolution = await resolveFirebasePatientSaveConflict({
            client,
            recordId: existingId,
            patientKey: remoteRecord.patientKey || getFirebasePatientIdentityKey(dataToSave),
            previousRecord,
            remoteRecord,
            localData: dataToSave,
            baseRecord,
            saveTrigger,
            automatic,
            fromPrint,
            patientMode: getPatientModeFromData(dataToSave)
          });
          if (!resolution.shouldContinue) return false;
          conflictAction = resolution.action || '';
          if (conflictAction === 'save-copy') {
            existingId = '';
            previousRecord = null;
            matchingRecord = null;
          } else if (conflictAction === 'merge' && resolution.data) {
            dataToSave = resolution.data;
            dataSignature = getFirebasePatientDataSignature(dataToSave);
          }
        } else if (remoteRecord) {
          previousRecord = remoteRecord;
        }
      }

      const clinicalRecord = patientDataToClinicalRecordV1(dataToSave, { authContext, source: 'firebase-save', nowIso });
      const clinicalValidation = validateClinicalRecord(clinicalRecord);
      const medicationSafety = runMedicationSafetyChecks(clinicalRecord);
      const label = buildFirebasePatientLabel(dataToSave);
      const patientKey = getFirebasePatientIdentityKey(dataToSave);
      const patientMode = getPatientModeFromData(dataToSave);
      const previousVersion = getFirebasePatientRecordVersion(previousRecord || remoteRecord);
      const nextVersion = existingId ? previousVersion + 1 : 1;
      const previousDataHash = getFirebasePatientRecordHash(previousRecord || remoteRecord);
      const dataHash = await getPatientAuditHash(dataToSave) || dataSignature;
      const docPayloadBase = {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: APP_VERSION,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: previousRecord?.updatedAt || remoteRecord?.updatedAt || '',
        previousDataHash,
        dataHash,
        updatedAt: nowIso,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        expiresAt,
        lastSaveTrigger: saveTrigger,
        status: FIREBASE_PATIENT_STATUSES.ACTIVE,
        deletedAt: '',
        deletedByUid: '',
        deletedByEmail: '',
        deleteReason: '',
        accessModel: CLINICAL_ACCESS_MODEL_VERSION,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        wardIds: authContext.wardIds,
        roles: authContext.roles,
        clinicalPartitionKey,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        ownerDepartment: state.firebasePatients.userProfile?.department || '',
        ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
        label,
        patientKey,
        patientMode,
        data: dataToSave,
        clinicalRecord,
        clinicalValidation,
        medicationSafety,
        serverUpdatedAt: client.serverTimestamp()
      };

      if (automatic) {
        state.firebasePatients.autoSaveInFlight = true;
        setFirebasePatientStatus(`${automaticStatusLabel} sprema...`);
      } else {
        state.firebasePatients.loading = true;
        setFirebasePatientStatus('Spremanje...');
      }
      updateFirebasePatientControls();
      let recordId = existingId;
      let createdAt = nowIso;
      if (recordId) {
        createdAt = previousRecord?.createdAt || matchingRecord?.createdAt || nowIso;
        await client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, recordId), docPayloadBase, { merge: true });
      } else {
        const docPayload = {
          ...docPayloadBase,
          createdAt: nowIso,
          serverCreatedAt: client.serverTimestamp()
        };
        const docRef = await client.addDoc(client.collection(client.db, FIREBASE_PATIENTS_COLLECTION), docPayload);
        recordId = docRef.id;
      }

      const savedRecord = {
        id: recordId,
        label,
        patientKey,
        patientMode,
        status: FIREBASE_PATIENT_STATUSES.ACTIVE,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        clinicalPartitionKey,
        data: dataToSave,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: previousRecord?.updatedAt || remoteRecord?.updatedAt || '',
        previousDataHash,
        dataHash,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        clinicalRecord,
        clinicalValidation,
        medicationSafety,
        createdAt,
        updatedAt: nowIso,
        expiresAt,
        deletedAt: '',
        deletedByUid: '',
        deletedByEmail: '',
        deleteReason: '',
        serverCreatedAt: getFirebasePatientRecordById(recordId)?.serverCreatedAt || null,
        serverUpdatedAt: null
      };
      state.firebasePatients.currentRecordId = recordId;
      state.firebasePatients.currentRecordVersion = nextVersion;
      state.firebasePatients.currentRecordUpdatedAt = nowIso;
      state.firebasePatients.currentRecordDataHash = dataHash;
      state.firebasePatients.currentRecordBaseData = clonePatientDataForConflict(dataToSave);
      state.firebasePatients.lastAutoSaveSignature = dataSignature;
      upsertFirebasePatientRecord(savedRecord);
      savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'firebase-saved' });
      await writePatientAuditEvent(previousRecord ? 'patient.update' : 'patient.create', {
        client,
        patientDocId: recordId,
        patientKey,
        previousRecord,
        newRecord: savedRecord,
        trigger: saveTrigger,
        changeSummary: previousRecord ? 'Pacijent je ažuriran u Firebaseu.' : 'Pacijent je kreiran u Firebaseu.',
        changedFields: previousRecord ? getChangedPatientDataFields(previousRecord.data, dataToSave) : Object.keys(dataToSave || {}).sort(),
        metadata: { automatic, fromPrint, patientMode, version: nextVersion, conflictAction }
      });
      if (conflictAction === 'merge') {
        await writePatientAuditEvent(FIREBASE_PATIENT_CONFLICT_EVENTS.MERGED, {
          client,
          patientDocId: recordId,
          patientKey,
          previousRecord: remoteRecord,
          newRecord: savedRecord,
          trigger: saveTrigger,
          changeSummary: 'Konflikt je spojen samo za nepreklapajuce promjene.',
          changedFields: getChangedPatientDataFields(remoteRecord?.data || {}, dataToSave),
          metadata: { automatic, fromPrint, patientMode, version: nextVersion }
        });
      } else if (conflictAction === 'save-copy') {
        await writePatientAuditEvent(FIREBASE_PATIENT_CONFLICT_EVENTS.SAVED_AS_COPY, {
          client,
          patientDocId: recordId,
          patientKey,
          previousRecord: remoteRecord,
          newRecord: savedRecord,
          trigger: saveTrigger,
          changeSummary: 'Konflikt je rijesen spremanjem lokalne verzije kao nove kopije.',
          changedFields: Object.keys(dataToSave || {}).sort(),
          metadata: { automatic, fromPrint, patientMode, copiedFromDocId: remoteRecord?.id || '' }
        });
      }
      markPatientSyncSynced({
        data: dataToSave,
        currentPatientDocId: recordId,
        currentPatientVersion: dataSignature,
        lastSavedAt: nowIso,
        lastSaveTarget: 'firebase'
      });
      const savedAtText = formatPatientDraftSavedAt(nowIso);
      state.firebasePatients.lastSaveErrorMessage = '';
      markFirebaseAvailabilityAvailable();
      setFirebasePatientStatus(automatic ? `${automaticStatusLabel} spremljen: ${savedAtText}.` : 'Spremljeno.', 'ok');
      if (!automatic) {
        const saveVerb = matchingRecord ? 'ažuriran postojeći zapis u' : 'spremljen u';
        setStatus(`Pacijent je ${saveVerb} Firebase kolekciju "${FIREBASE_PATIENTS_COLLECTION}". Automatsko arhiviranje: nakon ${RETENTION_POLICY.patientDays} dana.`);
      }
      return true;
    } catch (error) {
      console.warn('Spremanje pacijenta u Firebase nije uspjelo.', error);
      const message = getFirebaseAuthErrorMessage(error);
      markFirebaseAvailabilityUnavailable(message);
      await writePatientAuditEvent('patient.saveFailed', {
        patientDocId: state.firebasePatients.currentRecordId || '',
        patientKey: getFirebasePatientIdentityKey(dataToSave),
        newData: dataToSave,
        trigger: saveTrigger,
        changeSummary: 'Spremanje pacijenta u Firebase nije uspjelo.',
        changedFields: [],
        metadata: {
          automatic,
          fromPrint,
          errorCode: String(error?.code || ''),
          errorMessage: message
        }
      });
      state.firebasePatients.lastSaveErrorMessage = `${automatic ? automaticStatusLabel : 'Spremanje'} nije uspjelo: ${message}`;
      markPatientSyncFailed(message, {
        data: dataToSave,
        status: 'failed',
        lastSaveTarget: 'firebase'
      });
      setFirebasePatientStatus(state.firebasePatients.lastSaveErrorMessage, 'error');
      setStatus(state.firebasePatients.lastSaveErrorMessage, true);
      return false;
    } finally {
      if (automatic) {
        state.firebasePatients.autoSaveInFlight = false;
      } else {
        state.firebasePatients.loading = false;
      }
      updateFirebasePatientControls();
    }
  }

  function scheduleFirebasePatientAutoSave(options = {}) {
    if (state.firebasePatients.suppressAutoSave) return;
    window.clearTimeout(state.firebasePatients.autoSaveTimer);
    state.firebasePatients.autoSaveTimer = null;

    if (!state.firebasePatients.user || !isFirebaseUserProfileComplete(state.firebasePatients.userProfile) || !getFirebaseAuthContext().hasValidClinicalContext) {
      if (isPatientDataDifferentFromEmpty(getFormData())) {
        setFirebasePatientStatus('Firebase auto-save čeka prijavu i klinički kontekst.');
      }
      return;
    }

    if (!isPatientDataDifferentFromEmpty(getFormData())) {
      return;
    }

    state.firebasePatients.autoSaveTimer = window.setTimeout(() => {
      runFirebasePatientAutoSave(options);
    }, options.immediate ? 0 : FIREBASE_PATIENT_AUTO_SAVE_DEBOUNCE_MS);
  }

  async function runFirebasePatientAutoSave(options = {}) {
    if (state.firebasePatients.suppressAutoSave) return;
    if (state.firebasePatients.autoSaveInFlight) {
      state.firebasePatients.autoSavePending = true;
      return;
    }
    state.firebasePatients.autoSavePending = false;
    await saveCurrentPatientToFirebase({ automatic: true, force: Boolean(options.force) });
    if (state.firebasePatients.autoSavePending) {
      state.firebasePatients.autoSavePending = false;
      scheduleFirebasePatientAutoSave({ immediate: true, force: true });
    }
  }

  async function saveCurrentPatientToFirebaseBeforePrint() {
    if (!isPatientDataDifferentFromEmpty(getFormData())) {
      resetPatientSyncState('empty');
      return { attempted: false, saved: false, reason: 'empty' };
    }

    if (!state.firebasePatients.user) {
      setFirebasePatientStatus('Firebase spremanje prije ispisa čeka prijavu.');
      markPatientSyncFailed('Niste prijavljeni u Firebase.', { status: 'offline', lastSaveTarget: 'none' });
      return {
        attempted: false,
        saved: false,
        reason: 'not-signed-in',
        message: 'Pacijent nije spremljen u Firebase jer niste prijavljeni.'
      };
    }

    if (!isFirebaseUserProfileComplete(state.firebasePatients.userProfile) || !getFirebaseAuthContext().hasValidClinicalContext) {
      setFirebasePatientStatus('Firebase spremanje prije ispisa čeka prijavu i klinički kontekst.');
      markPatientSyncFailed('Firebase klinički kontekst nije dovršen.', { status: 'offline', lastSaveTarget: 'none' });
      return {
        attempted: false,
        saved: false,
        reason: 'invalid-clinical-context',
        message: 'Pacijent nije spremljen u Firebase jer prijava ili klinički kontekst nisu dovršeni.'
      };
    }

    const saved = await saveCurrentPatientToFirebase({ automatic: true, force: true, fromPrint: true });
    window.clearTimeout(state.firebasePatients.autoSaveTimer);
    state.firebasePatients.autoSaveTimer = null;
    state.firebasePatients.autoSavePending = false;
    return {
      attempted: true,
      saved,
      reason: saved ? 'saved' : 'failed',
      message: saved ? '' : (state.firebasePatients.lastSaveErrorMessage || 'Firebase spremanje prije ispisa nije uspjelo.')
    };
  }

  function shouldConfirmPrintWithoutFirebaseSave(saveResult) {
    if (!isPatientDataDifferentFromEmpty(getFormData())) return false;
    if (saveResult?.saved && isCurrentPatientSyncedForPrint()) return false;
    return !isCurrentPatientSyncedForPrint();
  }

  async function confirmPrintWithoutFirebaseSave(saveResult) {
    if (!shouldConfirmPrintWithoutFirebaseSave(saveResult)) return true;
    const detail = String(saveResult?.message || state.patientSyncState.lastError || 'Pacijent nije spremljen u Firebase.').trim();
    const syncMessage = getPatientSyncStatusMessage();
    return showPrintConfirmDialog({
      title: 'Lista nije sinkronizirana',
      message: `${detail}\n\n${syncMessage}\n\nIspisuje se lokalna kopija koja nije potvrđeno spremljena u Firebase. Želite li je ipak ispisati?`,
      proceedLabel: 'Ispiši lokalnu kopiju',
      cancelLabel: 'Ne ispisuj'
    });
  }

  function getPrintStatusAfterFirebaseSave(saveResult) {
    if (saveResult?.saved) {
      return 'Pacijent je spremljen u Firebase i otvoren je dijalog za ispis.';
    }
    if (saveResult?.attempted) {
      return 'Ispis je otvoren nakon izričite potvrde lokalne kopije. Pacijent nije spremljen u Firebase.';
    }
    if (saveResult?.reason === 'not-signed-in') {
      return 'Ispis je otvoren nakon izričite potvrde lokalne kopije jer nisi prijavljen.';
    }
    if (saveResult?.reason === 'invalid-clinical-context') {
      return 'Ispis je otvoren nakon izričite potvrde lokalne kopije jer klinički kontekst nije dovršen.';
    }
    return 'Otvoren je dijalog za ispis.';
  }

  function normalizeFirebasePatientRecord(docSnap, options = {}) {
    const payload = docSnap.data();
    if (!isPlainJsonObject(payload) || payload.schema !== 'temperaturna-lista-patient-v1') return null;
    const hasClinicalAccess = canAuthContextAccessClinicalPayload(payload);
    const hasLegacyAccess = Boolean(options.allowLegacy && canRecoverLegacyOwnedFirebasePatientPayload(payload));
    if (options.legacyOnly && !hasLegacyAccess) return null;
    if (!hasClinicalAccess && !hasLegacyAccess) return null;
    const validation = validatePatientDataObject(payload.data);
    if (!validation.ok) return null;
    const patientMode = normalizePatientMode(payload.patientMode || validation.data.patientMode);
    const data = { ...validation.data, patientMode };
    const authContext = getFirebaseAuthContext();
    const needsClinicalMigration = !hasClinicalAccess && hasLegacyAccess;
    const status = payload.status === FIREBASE_PATIENT_STATUSES.DELETED
      ? FIREBASE_PATIENT_STATUSES.DELETED
      : FIREBASE_PATIENT_STATUSES.ACTIVE;
    return {
      id: docSnap.id,
      label: String(payload.label || buildFirebasePatientLabel(data)),
      patientKey: String(payload.patientKey || getFirebasePatientIdentityKey(data)),
      patientMode,
      status,
      legacyAccess: needsClinicalMigration,
      needsClinicalMigration,
      organizationId: String(payload.organizationId || (needsClinicalMigration ? authContext.organizationId : '')),
      wardId: String(payload.wardId || (needsClinicalMigration ? authContext.activeWardId : '')),
      clinicalPartitionKey: String(payload.clinicalPartitionKey || (needsClinicalMigration ? getClinicalPartitionKey(authContext) : '')),
      data,
      version: Number(payload.version || 0),
      lastKnownVersion: Number(payload.lastKnownVersion || 0),
      lastKnownUpdatedAt: String(payload.lastKnownUpdatedAt || ''),
      previousDataHash: String(payload.previousDataHash || ''),
      dataHash: String(payload.dataHash || getFirebasePatientDataSignature(data)),
      updatedByUid: String(payload.updatedByUid || ''),
      updatedByEmail: String(payload.updatedByEmail || ''),
      clinicalRecord: isPlainJsonObject(payload.clinicalRecord) ? payload.clinicalRecord : null,
      clinicalValidation: isPlainJsonObject(payload.clinicalValidation) ? payload.clinicalValidation : null,
      medicationSafety: isPlainJsonObject(payload.medicationSafety) ? payload.medicationSafety : null,
      createdAt: payload.createdAt || '',
      updatedAt: payload.updatedAt || '',
      expiresAt: payload.expiresAt || '',
      deletedAt: payload.deletedAt || '',
      deletedByUid: payload.deletedByUid || '',
      deletedByEmail: payload.deletedByEmail || '',
      deleteReason: payload.deleteReason || '',
      serverCreatedAt: payload.serverCreatedAt || null,
      serverUpdatedAt: payload.serverUpdatedAt || null
    };
  }

  async function queryLegacyOwnedFirebasePatientSnapshots(client) {
    const docsById = new Map();
    const attempts = [];
    const user = state.firebasePatients.user;
    const userEmail = normalizeFirebaseProfileEmail(user?.email || state.firebasePatients.userProfile?.email || '');
    if (user?.uid) attempts.push(['ownerUid', user.uid]);
    if (userEmail) attempts.push(['ownerEmail', userEmail]);
    let blocked = false;
    for (const [field, value] of attempts) {
      try {
        const legacyQuery = client.query(
          client.collection(client.db, FIREBASE_PATIENTS_COLLECTION),
          client.where(field, '==', value),
          client.limit(100)
        );
        const legacySnapshot = await client.getDocs(legacyQuery);
        legacySnapshot.docs.forEach((docSnap) => {
          if (!docsById.has(docSnap.id)) docsById.set(docSnap.id, docSnap);
        });
      } catch (legacyError) {
        blocked = true;
        console.warn(`Učitavanje starih Firebase pacijenata po polju ${field} nije uspjelo.`, legacyError);
      }
    }
    return { docs: Array.from(docsById.values()), blocked };
  }

  async function refreshFirebasePatients(options = {}) {
    if (!requireFirebasePatientUser()) return;
    const preferredId = options.preferredId || getFirebasePatientSelectedId();
    try {
      const client = await getFirebasePatientsClient();
      state.firebasePatients.loading = true;
      if (!options.silent) setFirebasePatientStatus('Učitavam popis...');
      updateFirebasePatientControls();
      const clinicalPartitionKey = getClinicalPartitionKey();

      const patientQuery = client.query(
        client.collection(client.db, FIREBASE_PATIENTS_COLLECTION),
        client.where('accessModel', '==', CLINICAL_ACCESS_MODEL_VERSION),
        client.where('organizationId', '==', getFirebaseAuthContext().organizationId),
        client.where('wardId', '==', getFirebaseAuthContext().activeWardId),
        client.where('clinicalPartitionKey', '==', clinicalPartitionKey),
        client.limit(100)
      );
      const snapshot = await client.getDocs(patientQuery);
      let records = snapshot.docs
        .map(normalizeFirebasePatientRecord)
        .filter(Boolean)
        .sort((a, b) => {
          const bTime = firebaseTimestampToMillis(b.serverUpdatedAt) || firebaseTimestampToMillis(b.updatedAt);
          const aTime = firebaseTimestampToMillis(a.serverUpdatedAt) || firebaseTimestampToMillis(a.updatedAt);
          return bTime - aTime;
        });
      let legacyReadBlocked = false;
      if (state.firebasePatients.user?.uid) {
        const legacySnapshot = await queryLegacyOwnedFirebasePatientSnapshots(client);
        legacyReadBlocked = legacySnapshot.blocked;
        const existingIds = new Set(records.map(record => record.id));
        const legacyRecords = legacySnapshot.docs
          .map(docSnap => normalizeFirebasePatientRecord(docSnap, { allowLegacy: true, legacyOnly: true }))
          .filter(record => record && !existingIds.has(record.id));
        if (legacyRecords.length) {
          records = records.concat(legacyRecords).sort((a, b) => {
            const bTime = firebaseTimestampToMillis(b.serverUpdatedAt) || firebaseTimestampToMillis(b.updatedAt);
            const aTime = firebaseTimestampToMillis(a.serverUpdatedAt) || firebaseTimestampToMillis(a.updatedAt);
            return bTime - aTime;
          });
        }
      }
      records = await deleteExpiredFirebasePatientRecords(records);
      state.firebasePatients.records = records;
      renderFirebasePatientList(preferredId);
      markFirebaseAvailabilityAvailable();
      if (!options.silent) {
        const activeCount = state.firebasePatients.records.filter(record => !isFirebasePatientRecordArchived(record)).length;
        const legacyCount = state.firebasePatients.records.filter(isLegacyFirebasePatientRecord).length;
        const legacySuffix = legacyCount ? `, starih za migraciju: ${legacyCount}` : '';
        const blockedSuffix = legacyReadBlocked ? ' Stari zapisi nisu dostupni dok se ne deployaju migracijska Firestore pravila.' : '';
        setFirebasePatientStatus(`Učitano aktivnih: ${activeCount}${legacySuffix}${blockedSuffix}`, 'ok');
        setStatus(`Učitano je ${activeCount} aktivnih Firebase pacijenata.${legacyCount ? ` Starih zapisa za migraciju: ${legacyCount}.` : ''}${blockedSuffix}`);
      }
    } catch (error) {
      console.warn('Učitavanje Firebase pacijenata nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientStatus('Popis nije učitan.', 'error');
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      if (isFirebasePatientDialogVisible()) renderFirebasePatientDialogList();
    }
  }

  async function migrateLegacyFirebasePatientsToCurrentProfile(options = {}) {
    if (!requireFirebasePatientUser()) return false;
    const authContext = refreshFirebaseAuthContext();
    if (!authContext.hasValidClinicalContext) {
      const message = getFirebaseClinicalContextErrorMessage();
      setFirebasePatientStatus(message, 'error');
      setStatus(message, true);
      return false;
    }

    let legacyRecords = state.firebasePatients.records.filter(isLegacyFirebasePatientRecord);
    if (!legacyRecords.length) {
      await refreshFirebasePatients({ silent: true });
      legacyRecords = state.firebasePatients.records.filter(isLegacyFirebasePatientRecord);
    }
    if (!legacyRecords.length) {
      const message = 'Nema dostupnih starih Firebase pacijenata za prebacivanje. Ako postoje stariji zapisi bez UID-a ili e-maila vlasnika, potrebna je posebna admin migracija.';
      setFirebasePatientStatus(message, 'warn');
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return false;
    }

    const displayName = getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {});
    const department = state.firebasePatients.userProfile?.department || authContext.activeWardId;
    if (!options.skipConfirm) {
      const confirmed = window.confirm(
        `Prebaciti ${legacyRecords.length} starih Firebase pacijenata na profil ${displayName || authContext.email}, odjel ${department}, kao odjelne pacijente?\n\n` +
        'Migracija mijenja samo dostupne stare zapise koje ovaj Google račun smije čitati. Zapisi ostaju u Firebaseu i dobit će revizijski trag.'
      );
      if (!confirmed) return false;
    }

    const client = await getFirebasePatientsClient();
    const user = state.firebasePatients.user;
    const nowIso = new Date().toISOString();
    const expiresAt = getFirebasePatientExpiresAtIso(new Date(nowIso));
    const clinicalPartitionKey = getClinicalPartitionKey(authContext);
    state.firebasePatients.loading = true;
    setFirebasePatientStatus(`Prebacujem stare pacijente (${legacyRecords.length})...`);
    setFirebasePatientDialogStatus(`Prebacujem stare pacijente (${legacyRecords.length})...`);
    updateFirebasePatientControls();

    const migratedRecords = [];
    try {
      for (const record of legacyRecords) {
        const data = {
          ...record.data,
          patientMode: PATIENT_MODES.WARD
        };
        const clinicalRecord = patientDataToClinicalRecordV1(data, { authContext, source: 'legacy-bulk-migration', nowIso });
        const clinicalValidation = validateClinicalRecord(clinicalRecord);
        const medicationSafety = runMedicationSafetyChecks(clinicalRecord);
        const previousVersion = getFirebasePatientRecordVersion(record);
        const nextVersion = previousVersion + 1;
        const previousDataHash = getFirebasePatientRecordHash(record);
        const dataHash = await getPatientAuditHash(data) || getFirebasePatientDataSignature(data);
        const label = buildFirebasePatientLabel(data);
        const patientKey = record.patientKey || getFirebasePatientIdentityKey(data);
        const payload = {
          schema: 'temperaturna-lista-patient-v1',
          appVersion: APP_VERSION,
          version: nextVersion,
          lastKnownVersion: previousVersion,
          lastKnownUpdatedAt: record.updatedAt || '',
          previousDataHash,
          dataHash,
          createdAt: record.createdAt || nowIso,
          updatedAt: nowIso,
          updatedByUid: user.uid,
          updatedByEmail: user.email || '',
          expiresAt,
          lastSaveTrigger: 'legacy-bulk-migration',
          status: FIREBASE_PATIENT_STATUSES.ACTIVE,
          deletedAt: '',
          deletedByUid: '',
          deletedByEmail: '',
          deleteReason: '',
          accessModel: CLINICAL_ACCESS_MODEL_VERSION,
          organizationId: authContext.organizationId,
          wardId: authContext.activeWardId,
          wardIds: authContext.wardIds,
          roles: authContext.roles,
          clinicalPartitionKey,
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          ownerDepartment: state.firebasePatients.userProfile?.department || '',
          ownerDisplayName: displayName,
          label,
          patientKey,
          patientMode: PATIENT_MODES.WARD,
          data,
          clinicalRecord,
          clinicalValidation,
          medicationSafety,
          serverUpdatedAt: client.serverTimestamp()
        };
        await client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id), payload, { merge: true });
        const migratedRecord = {
          ...record,
          ...payload,
          id: record.id,
          legacyAccess: false,
          needsClinicalMigration: false,
          serverCreatedAt: record.serverCreatedAt || null,
          serverUpdatedAt: null
        };
        migratedRecords.push(migratedRecord);
        await writePatientAuditEvent('patient.update', {
          client,
          patientDocId: record.id,
          patientKey,
          previousRecord: record,
          newRecord: migratedRecord,
          trigger: 'legacy-bulk-migration',
          changeSummary: 'Stari Firebase pacijent prebačen je na trenutni profil i odjelni kontekst.',
          changedFields: ['accessModel', 'organizationId', 'wardId', 'clinicalPartitionKey', 'ownerUid', 'ownerEmail', 'patientMode', 'data.patientMode'],
          metadata: { migratedToPatientMode: PATIENT_MODES.WARD, migratedFromLegacy: true }
        });
      }
      migratedRecords.forEach(upsertFirebasePatientRecord);
      changePatientMode(PATIENT_MODES.WARD, { silent: true });
      renderFirebasePatientList(migratedRecords[0]?.id || '');
      await refreshFirebasePatients({ silent: true, preferredId: migratedRecords[0]?.id || '' });
      markFirebaseAvailabilityAvailable();
      const message = `Prebačeno starih Firebase pacijenata na profil ${displayName || authContext.email}: ${migratedRecords.length}. Sada su u odjelnim pacijentima.`;
      setFirebasePatientStatus(message, 'ok');
      setFirebasePatientDialogStatus(message);
      setStatus(message);
      return true;
    } catch (error) {
      console.warn('Prebacivanje starih Firebase pacijenata nije uspjelo.', error);
      const message = getFirebaseAuthErrorMessage(error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientStatus(`Prebacivanje starih pacijenata nije uspjelo: ${message}`, 'error');
      setFirebasePatientDialogStatus(`Prebacivanje nije uspjelo: ${message}`, true);
      setStatus(`Prebacivanje starih Firebase pacijenata nije uspjelo: ${message}`, true);
      return false;
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      renderFirebaseUserPanel();
      if (isFirebasePatientDialogVisible()) renderFirebasePatientDialogList();
    }
  }

  async function loadFirebasePatientRecord(record, options = {}) {
    if (!requireFirebasePatientUser()) return;
    if (!record) {
      setStatus('Odaberite Firebase pacijenta za učitavanje.', true);
      return;
    }
    if (isFirebasePatientRecordArchived(record) && !options.allowArchived) {
      const message = 'Arhivirani pacijent se prvo mora vratiti prije otvaranja.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }

    try {
      const client = await getFirebasePatientsClient();
      state.firebasePatients.loading = true;
      setFirebasePatientStatus('Učitavam pacijenta...');
      updateFirebasePatientControls();
      const docSnap = await client.getDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id));
      if (!docSnap.exists()) {
        setStatus('Firebase zapis pacijenta više ne postoji.', true);
        await refreshFirebasePatients({ silent: true });
        return;
      }
      record = normalizeFirebasePatientRecord(docSnap, { allowLegacy: true });
      if (!record) {
        setStatus('Firebase zapis ne odgovara shemi pacijenta.', true);
        return;
      }
      if (isFirebasePatientRecordArchived(record) && !options.allowArchived) {
        const message = 'Arhivirani pacijent se prvo mora vratiti prije otvaranja.';
        setFirebasePatientDialogStatus(message, true);
        setStatus(message, true);
        return;
      }
      state.firebasePatients.suppressAutoSave = true;
      try {
        setFormData(record.data);
        renderAll();
        savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'firebase-loaded' });
      } finally {
        state.firebasePatients.suppressAutoSave = false;
      }
      rememberCurrentFirebasePatient(record);
      renderFirebasePatientList(record.id);
      if (options.closeDialog) hideFirebasePatientDialog();
      await writePatientAuditEvent('patient.view', {
        client,
        patientDocId: record.id,
        patientKey: record.patientKey,
        newRecord: record,
        trigger: options.trigger || 'open',
        changeSummary: 'Pacijent je otvoren iz Firebasea.',
        changedFields: [],
        metadata: { patientMode: record.patientMode }
      });
      markFirebaseAvailabilityAvailable();
      setFirebasePatientStatus('Pacijent učitan.', 'ok');
      setStatus(`Pacijent je učitan iz Firebasea: ${record.label}.`);
    } catch (error) {
      console.warn('Učitavanje Firebase pacijenta nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientStatus('Učitavanje nije uspjelo.', 'error');
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
    }
  }

  async function loadFirebasePatientById(recordId, options = {}) {
    const record = getFirebasePatientRecordById(recordId);
    if (!record) {
      setStatus('Odabrani Firebase pacijent nije u popisu. Osvježi popis pa pokušaj ponovno.', true);
      return;
    }
    await loadFirebasePatientRecord(record, options);
  }

  async function loadSelectedFirebasePatient() {
    await loadFirebasePatientRecord(getSelectedFirebasePatientRecord());
  }

  async function renameFirebasePatientRecord(record) {
    if (!requireFirebasePatientUser()) return;
    if (!record) {
      setStatus('Odaberite Firebase pacijenta za preimenovanje.', true);
      return;
    }
    if (isFirebasePatientRecordArchived(record)) {
      const message = 'Arhiviranog pacijenta prvo treba vratiti prije preimenovanja.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }

    const currentName = String(record.data?.fullName || record.label || '').replace(/\s+/g, ' ').trim();
    const nextName = window.prompt('Novi naziv pacijenta u Firebaseu:', currentName);
    if (nextName === null) return;
    const fullName = String(nextName || '').replace(/\s+/g, ' ').trim();
    if (!fullName) {
      const message = 'Naziv pacijenta ne smije biti prazan.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }

    const validation = validatePatientDataObject({
      ...(record.data || {}),
      fullName
    });
    if (!validation.ok) {
      const message = `Preimenovanje nije moguće: ${validation.errors.join(' ')}`;
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }

    let successMessage = '';
    try {
      const client = await getFirebasePatientsClient();
      const nowIso = new Date().toISOString();
      const expiresAt = getFirebasePatientExpiresAtIso(new Date(nowIso));
      const user = state.firebasePatients.user;
      const label = buildFirebasePatientLabel(validation.data);
      const patientKey = getFirebasePatientIdentityKey(validation.data);
      const patientMode = getPatientModeFromData(validation.data);
      const authContext = getFirebaseAuthContext();
      const clinicalPartitionKey = getClinicalPartitionKey(authContext);
      const previousVersion = getFirebasePatientRecordVersion(record);
      const nextVersion = previousVersion + 1;
      const dataHash = getFirebasePatientDataSignature(validation.data);
      const clinicalRecord = patientDataToClinicalRecordV1(validation.data, { authContext, source: 'firebase-rename', nowIso });
      const clinicalValidation = validateClinicalRecord(clinicalRecord);
      const medicationSafety = runMedicationSafetyChecks(clinicalRecord);
      state.firebasePatients.loading = true;
      setFirebasePatientDialogStatus('Preimenujem pacijenta...');
      setFirebasePatientStatus('Preimenovanje...');
      updateFirebasePatientControls();

      await client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id), {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: APP_VERSION,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: record.updatedAt || '',
        previousDataHash: getFirebasePatientRecordHash(record),
        dataHash,
        updatedAt: nowIso,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        expiresAt,
        lastSaveTrigger: 'rename',
        status: FIREBASE_PATIENT_STATUSES.ACTIVE,
        accessModel: CLINICAL_ACCESS_MODEL_VERSION,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        wardIds: authContext.wardIds,
        roles: authContext.roles,
        clinicalPartitionKey,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        ownerDepartment: state.firebasePatients.userProfile?.department || '',
        ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
        label,
        patientKey,
        patientMode,
        data: validation.data,
        clinicalRecord,
        clinicalValidation,
        medicationSafety,
        serverUpdatedAt: client.serverTimestamp()
      }, { merge: true });

      const renamedRecord = {
        ...record,
        label,
        patientKey,
        patientMode,
        status: FIREBASE_PATIENT_STATUSES.ACTIVE,
        data: validation.data,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: record.updatedAt || '',
        previousDataHash: getFirebasePatientRecordHash(record),
        dataHash,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        clinicalRecord,
        clinicalValidation,
        medicationSafety,
        updatedAt: nowIso,
        expiresAt,
        serverUpdatedAt: null
      };
      upsertFirebasePatientRecord(renamedRecord);
      await writePatientAuditEvent('patient.rename', {
        client,
        patientDocId: record.id,
        patientKey,
        previousRecord: record,
        newRecord: renamedRecord,
        trigger: 'rename',
        changeSummary: 'Pacijent je preimenovan u Firebaseu.',
        changedFields: ['label', 'patientKey', 'data.fullName'],
        metadata: { patientMode }
      });
      if (state.firebasePatients.currentRecordId === record.id) {
        state.firebasePatients.suppressAutoSave = true;
        try {
          setFormData(validation.data);
          renderAll();
          savePatientDraftNow({ quiet: true, startupRecovery: false, recoveryReason: 'firebase-renamed' });
        } finally {
          state.firebasePatients.suppressAutoSave = false;
        }
        rememberCurrentFirebasePatient(renamedRecord);
      }
      state.firebasePatients.lastSaveErrorMessage = '';
      successMessage = `Preimenovano: ${label}.`;
      setFirebasePatientDialogStatus(successMessage);
      setFirebasePatientStatus('Preimenovano.', 'ok');
      setStatus(`Firebase pacijent je preimenovan: ${label}.`);
    } catch (error) {
      console.warn('Preimenovanje Firebase pacijenta nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientDialogStatus('Preimenovanje nije uspjelo.', true);
      setFirebasePatientStatus('Preimenovanje nije uspjelo.', 'error');
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      renderFirebasePatientDialogList();
      if (successMessage) setFirebasePatientDialogStatus(successMessage);
    }
  }

  async function renameFirebasePatientById(recordId) {
    const record = getFirebasePatientRecordById(recordId);
    if (!record) {
      setStatus('Odabrani Firebase pacijent nije u popisu. Osvježi popis pa pokušaj ponovno.', true);
      return;
    }
    await renameFirebasePatientRecord(record);
  }

  async function archiveFirebasePatientRecord(record, options = {}) {
    if (!requireFirebasePatientUser()) return;
    if (!record) {
      setStatus('Odaberite Firebase pacijenta za arhiviranje.', true);
      return;
    }
    if (isFirebasePatientRecordArchived(record)) {
      const message = 'Pacijent je već arhiviran.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }
    const confirmed = options.skipConfirm || window.confirm(
      `Arhivirati Firebase zapis pacijenta "${record.label}"?\n\nZapis će se sakriti iz uobičajenog popisa, ali ostaje u Firebaseu i revizijskom tragu.`
    );
    if (!confirmed) return;

    let archived = false;
    try {
      const client = await getFirebasePatientsClient();
      const nextPreferredId = getFirebasePatientRecordsForCurrentMode().find(item => item.id !== record.id)?.id || '';
      const nowIso = new Date().toISOString();
      const user = state.firebasePatients.user;
      const authContext = getFirebaseAuthContext();
      const clinicalPartitionKey = getClinicalPartitionKey(authContext);
      const previousVersion = getFirebasePatientRecordVersion(record);
      const nextVersion = previousVersion + 1;
      const dataHash = getFirebasePatientRecordHash(record);
      const archivePayload = {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: APP_VERSION,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: record.updatedAt || '',
        previousDataHash: dataHash,
        dataHash,
        updatedAt: nowIso,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        lastSaveTrigger: options.trigger || 'soft-delete',
        status: FIREBASE_PATIENT_STATUSES.DELETED,
        deletedAt: nowIso,
        deletedByUid: user.uid,
        deletedByEmail: user.email || '',
        deleteReason: String(options.deleteReason || 'Ručno arhivirano iz aplikacije.').slice(0, 300),
        accessModel: CLINICAL_ACCESS_MODEL_VERSION,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        wardIds: authContext.wardIds,
        roles: authContext.roles,
        clinicalPartitionKey,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        ownerDepartment: state.firebasePatients.userProfile?.department || '',
        ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
        label: record.label,
        patientKey: record.patientKey,
        patientMode: record.patientMode,
        data: record.data,
        serverUpdatedAt: client.serverTimestamp()
      };
      state.firebasePatients.loading = true;
      setFirebasePatientDialogStatus('Arhiviram pacijenta...');
      setFirebasePatientStatus('Arhiviranje...');
      updateFirebasePatientControls();
      await client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id), archivePayload, { merge: true });
      const archivedRecord = {
        ...record,
        ...archivePayload,
        serverUpdatedAt: null
      };
      if (state.firebasePatients.currentRecordId === record.id) {
        resetCurrentFirebasePatientContext();
      }
      upsertFirebasePatientRecord(archivedRecord);
      await writePatientAuditEvent('patient.softDelete', {
        client,
        patientDocId: record.id,
        patientKey: record.patientKey,
        previousRecord: record,
        newRecord: archivedRecord,
        trigger: archivePayload.lastSaveTrigger,
        changeSummary: 'Pacijent je arhiviran u Firebaseu.',
        changedFields: ['status', 'deletedAt', 'deletedByUid', 'deletedByEmail', 'deleteReason'],
        metadata: { patientMode: record.patientMode }
      });
      renderFirebasePatientList(nextPreferredId);
      await refreshFirebasePatients({ silent: true, preferredId: nextPreferredId });
      state.firebasePatients.lastSaveErrorMessage = '';
      archived = true;
      setFirebasePatientDialogStatus('Pacijent je arhiviran. Skriven je iz uobičajenog popisa, ali ostaje u revizijskom tragu.');
      setFirebasePatientStatus('Arhivirano.', 'ok');
      setStatus('Firebase zapis pacijenta je arhiviran i ostaje u revizijskom tragu.');
    } catch (error) {
      console.warn('Arhiviranje Firebase pacijenta nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientDialogStatus('Arhiviranje nije uspjelo.', true);
      setFirebasePatientStatus('Arhiviranje nije uspjelo.', 'error');
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      renderFirebasePatientDialogList();
      if (archived) setFirebasePatientDialogStatus('Pacijent je arhiviran. Skriven je iz uobičajenog popisa, ali ostaje u revizijskom tragu.');
    }
  }

  async function archiveFirebasePatientById(recordId) {
    const record = getFirebasePatientRecordById(recordId);
    if (!record) {
      setStatus('Odabrani Firebase pacijent nije u popisu. Osvježi popis pa pokušaj ponovno.', true);
      return;
    }
    await archiveFirebasePatientRecord(record);
  }

  async function archiveSelectedFirebasePatient() {
    await archiveFirebasePatientRecord(getSelectedFirebasePatientRecord());
  }

  async function restoreFirebasePatientRecord(record) {
    if (!requireFirebasePatientUser()) return;
    if (!canManageArchivedFirebasePatients()) {
      const message = 'Samo ovlaštena admin uloga može vratiti arhivirane pacijente.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }
    if (!record) {
      setStatus('Odaberite arhiviranog Firebase pacijenta za vraćanje.', true);
      return;
    }
    if (!isFirebasePatientRecordArchived(record)) {
      const message = 'Pacijent nije arhiviran.';
      setFirebasePatientDialogStatus(message, true);
      setStatus(message, true);
      return;
    }
    const confirmed = window.confirm(`Vratiti arhiviranog pacijenta "${record.label}" u aktivni popis?`);
    if (!confirmed) return;

    let restored = false;
    try {
      const client = await getFirebasePatientsClient();
      const nowIso = new Date().toISOString();
      const user = state.firebasePatients.user;
      const authContext = getFirebaseAuthContext();
      const clinicalPartitionKey = getClinicalPartitionKey(authContext);
      const previousVersion = getFirebasePatientRecordVersion(record);
      const nextVersion = previousVersion + 1;
      const dataHash = getFirebasePatientRecordHash(record);
      const restorePayload = {
        schema: 'temperaturna-lista-patient-v1',
        appVersion: APP_VERSION,
        version: nextVersion,
        lastKnownVersion: previousVersion,
        lastKnownUpdatedAt: record.updatedAt || '',
        previousDataHash: dataHash,
        dataHash,
        updatedAt: nowIso,
        updatedByUid: user.uid,
        updatedByEmail: user.email || '',
        lastSaveTrigger: 'restore',
        status: FIREBASE_PATIENT_STATUSES.ACTIVE,
        deletedAt: '',
        deletedByUid: '',
        deletedByEmail: '',
        deleteReason: '',
        restoredAt: nowIso,
        restoredByUid: user.uid,
        restoredByEmail: user.email || '',
        accessModel: CLINICAL_ACCESS_MODEL_VERSION,
        organizationId: authContext.organizationId,
        wardId: authContext.activeWardId,
        wardIds: authContext.wardIds,
        roles: authContext.roles,
        clinicalPartitionKey,
        ownerUid: user.uid,
        ownerEmail: user.email || '',
        ownerDepartment: state.firebasePatients.userProfile?.department || '',
        ownerDisplayName: getFirebaseProfileDisplayName(state.firebasePatients.userProfile || {}),
        label: record.label,
        patientKey: record.patientKey,
        patientMode: record.patientMode,
        data: record.data,
        serverUpdatedAt: client.serverTimestamp()
      };
      state.firebasePatients.loading = true;
      setFirebasePatientDialogStatus('Vraćam arhiviranog pacijenta...');
      setFirebasePatientStatus('Vraćanje...');
      updateFirebasePatientControls();
      await client.setDoc(client.doc(client.db, FIREBASE_PATIENTS_COLLECTION, record.id), restorePayload, { merge: true });
      const restoredRecord = {
        ...record,
        ...restorePayload,
        serverUpdatedAt: null
      };
      upsertFirebasePatientRecord(restoredRecord);
      await writePatientAuditEvent('patient.restore', {
        client,
        patientDocId: record.id,
        patientKey: record.patientKey,
        previousRecord: record,
        newRecord: restoredRecord,
        trigger: 'restore',
        changeSummary: 'Arhivirani pacijent je vraćen u aktivni popis.',
        changedFields: ['status', 'deletedAt', 'deletedByUid', 'deletedByEmail', 'deleteReason'],
        metadata: { patientMode: record.patientMode }
      });
      renderFirebasePatientList(record.id);
      await refreshFirebasePatients({ silent: true, preferredId: record.id });
      restored = true;
      setFirebasePatientDialogStatus('Pacijent je vraćen u aktivni popis.');
      setFirebasePatientStatus('Vraćeno.', 'ok');
      setStatus('Arhivirani Firebase pacijent je vraćen u aktivni popis.');
    } catch (error) {
      console.warn('Vraćanje arhiviranog Firebase pacijenta nije uspjelo.', error);
      markFirebaseAvailabilityUnavailable(error);
      setFirebasePatientDialogStatus('Vraćanje nije uspjelo.', true);
      setFirebasePatientStatus('Vraćanje nije uspjelo.', 'error');
      setStatus(getFirebaseAuthErrorMessage(error), true);
    } finally {
      state.firebasePatients.loading = false;
      updateFirebasePatientControls();
      renderFirebasePatientDialogList();
      if (restored) setFirebasePatientDialogStatus('Pacijent je vraćen u aktivni popis.');
    }
  }

  async function restoreFirebasePatientById(recordId) {
    const record = getFirebasePatientRecordById(recordId);
    if (!record) {
      setStatus('Odabrani Firebase pacijent nije u popisu. Osvježi popis pa pokušaj ponovno.', true);
      return;
    }
    await restoreFirebasePatientRecord(record);
  }

  function dragEventHasFiles(event) {
    return Array.from(event.dataTransfer?.types || []).includes('Files');
  }

  function setDragDropHighlight(active) {
    document.body.classList.toggle('dragging-json-file', Boolean(active));
  }

  function handleWindowDragEnter(event) {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    state.dragDropCounter += 1;
    setDragDropHighlight(true);
  }

  function handleWindowDragOver(event) {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    setDragDropHighlight(true);
  }

  function handleWindowDragLeave(event) {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    state.dragDropCounter = Math.max(0, state.dragDropCounter - 1);
    if (state.dragDropCounter === 0) setDragDropHighlight(false);
  }

  function handleWindowDrop(event) {
    if (!dragEventHasFiles(event)) return;
    event.preventDefault();
    state.dragDropCounter = 0;
    setDragDropHighlight(false);
    const files = Array.from(event.dataTransfer?.files || []);
    const jsonFiles = files.filter(isJsonFile);
    if (!jsonFiles.length) {
      setStatus('Povučen je dokument koji nije JSON datoteka.', true);
      return;
    }
    if (jsonFiles.length > 1) {
      setStatus('Povučeno je više JSON datoteka; učitavam prvu.', false);
    }
    loadPatientDataFromFile(jsonFiles[0], { fromDrop: true });
  }

  async function saveCalibration() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      calibration: state.calibration
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

    if (supportsNativeSavePicker()) {
      try {
        const savedName = await saveBlobWithNativePicker(blob, PAGE.fileNames.calibration, {
          types: [
            {
              description: 'JSON kalibracije',
              accept: { 'application/json': ['.json'] }
            }
          ]
        });
        if (!savedName) return { ok: false, message: 'Spremanje kalibracije je otkazano.' };
        markAdminCalibrationSaved();
        const message = `Kalibracija je spremljena u JSON datoteku: ${savedName}. Lokacija je ona koju ste odabrali u dijalogu preglednika; puna putanja nije dostupna iz sigurnosnih razloga preglednika.`;
        setStatus(message);
        return { ok: true, message };
      } catch (error) {
        if (error && error.name === 'AbortError') {
          setStatus('Spremanje kalibracije je otkazano.');
          return { ok: false, message: 'Spremanje kalibracije je otkazano.' };
        }
        console.warn('Save picker za kalibraciju nije uspio, koristi se standardno preuzimanje.', error);
        setStatus('Preglednik nije dopustio odabir mjesta spremanja. Koristi se standardno preuzimanje.', true);
      }
    }

    downloadBlob(PAGE.fileNames.calibration, blob);
    markAdminCalibrationSaved();
    const message = `Kalibracija je spremljena u JSON datoteku: ${PAGE.fileNames.calibration}. Ako preglednik ne pita za mjesto spremanja, datoteka je u zadanoj mapi preuzimanja.`;
    setStatus(message);
    return { ok: true, message };
  }

  function inlineScriptJson(value) {
    return JSON.stringify(value, null, 2)
      .replace(/<\//g, '<\\/')
      .replace(/<!--/g, '<\u0021--')
      .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
      .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
  }

  function buildSelfContainedHtmlWithCalibration() {
    const payload = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      calibration: state.calibration
    };
    const serializedCalibration = inlineScriptJson(payload);
    const rootClone = document.documentElement.cloneNode(true);
    // Ne spremati runtime CSS varijablu s data URI podlogom u HTML atribut style.
    // Podloga ostaje samo u CLEAN_BACKGROUND_DATA_URI, a --preview-bg se ponovno postavlja pri učitavanju.
    rootClone.style.removeProperty('--preview-bg');
    if (!rootClone.getAttribute('style')) {
      rootClone.removeAttribute('style');
    }

    rootClone.querySelector('#appRoot')?.classList.remove('admin-on');
    rootClone.querySelector('#adminPanel')?.classList.remove('visible');
    rootClone.querySelector('#adminCloseDialog')?.remove();
    rootClone.querySelector('#adminDiscardConfirmDialog')?.remove();
    rootClone.querySelector('#printConfirmDialog')?.remove();

    // Privatnost: nova HTML aplikacija s ugrađenom kalibracijom ne smije ponijeti
    // nikakve pacijentske podatke ni zalijepljeni OHBP tekst iz trenutne sesije.
    [
      'fullName',
      'birthYear',
      'admissionDate',
      'ohbpPasteBox',
      'diagnosis',
      'allergies',
      'patientOrigin',
      'therapy',
      'ohbpTherapy',
      'vitalSigns',
      'followUpControlDate',
      'followUpControl',
      'labRaw',
      'radiologyRaw'
    ].forEach((id) => {
      const field = rootClone.querySelector(`#${id}`);
      if (!field) return;
      if ('value' in field) field.value = '';
      if ('defaultValue' in field) field.defaultValue = '';
      field.removeAttribute('value');
      field.removeAttribute('data-last-autofill');
      if (field.tagName === 'TEXTAREA') {
        field.textContent = '';
      }
    });

    [
      'microHemocultures',
      'microUrineCulture',
      'microStoolBacteriology',
      'microStoolCdiff',
      'microStoolVirology'
    ].forEach((id) => {
      const checkbox = rootClone.querySelector(`#${id}`);
      if (!checkbox) return;
      checkbox.checked = false;
      checkbox.removeAttribute('checked');
    });

    const clonedUnsavedIndicator = rootClone.querySelector('#adminUnsavedIndicator');
    if (clonedUnsavedIndicator) {
      clonedUnsavedIndicator.classList.add('hidden');
      clonedUnsavedIndicator.setAttribute('aria-hidden', 'true');
    }
    rootClone.querySelectorAll('.overlay').forEach((overlay) => { overlay.innerHTML = ''; });
    const clonedAdmissionWarning = rootClone.querySelector('#chronicTherapyAdmissionWarning');
    if (clonedAdmissionWarning) {
      clonedAdmissionWarning.textContent = '';
      clonedAdmissionWarning.classList.add('hidden');
    }
    ['showDiagnosisOnList', 'showAllergiesOnList', 'showPatientOriginOnList', 'showTherapyOnList', 'showOhbpTherapyOnList', 'showVitalSignsOnList', 'showFollowUpControlOnList', 'showLabsOnList', 'showRadiologyOnList'].forEach((id) => {
      const checkbox = rootClone.querySelector(`#${id}`);
      if (!checkbox) return;
      checkbox.checked = true;
      checkbox.setAttribute('checked', '');
    });
    rootClone.querySelectorAll('.display-controlled-field').forEach((field) => {
      field.classList.remove('inactive-field');
      field.removeAttribute('readonly');
      field.setAttribute('aria-disabled', 'false');
    });
    rootClone.querySelectorAll('.field-label-row.is-inactive').forEach((row) => row.classList.remove('is-inactive'));
    rootClone.querySelectorAll('[data-collapsible-field]').forEach((section) => {
      const fieldId = section.getAttribute('data-collapsible-field');
      const keepCollapsed = fieldId === 'ohbpTherapy' || fieldId === 'vitalSigns' || fieldId === 'followUpControl' || fieldId === 'microbiologySamples';
      section.classList.toggle('is-collapsed', keepCollapsed);
      section.classList.toggle('is-expanded', !keepCollapsed);
    });
    rootClone.querySelectorAll('[data-collapsible-target]').forEach((button) => {
      const fieldId = button.getAttribute('data-collapsible-target');
      const keepCollapsed = fieldId === 'ohbpTherapy' || fieldId === 'vitalSigns' || fieldId === 'followUpControl' || fieldId === 'microbiologySamples';
      button.setAttribute('aria-expanded', keepCollapsed ? 'false' : 'true');
      button.setAttribute('title', keepCollapsed ? 'Prikaži tekstni okvir' : 'Skupi tekstni okvir');
      const arrow = button.querySelector('.collapsible-arrow');
      if (arrow) arrow.textContent = keepCollapsed ? '▾' : '▴';
    });
    const clonedStatusBar = rootClone.querySelector('#statusBar');
    if (clonedStatusBar) {
      // Ne ugrađuj trenutne runtime/admin poruke u novostvoreni HTML.
      clonedStatusBar.textContent = 'Aplikacija je spremna.';
      clonedStatusBar.style.color = 'var(--muted)';
      delete clonedStatusBar.dataset.autoLabWarning;
    }
    const clonedOverflowStatus = rootClone.querySelector('#overflowWarningStatus');
    if (clonedOverflowStatus) {
      clonedOverflowStatus.textContent = '';
      clonedOverflowStatus.classList.remove('visible');
      clonedOverflowStatus.classList.add('hidden');
    }
    let html = '<!DOCTYPE html>\n' + rootClone.outerHTML;

    html = html.replace(
      /const EMBEDDED_CALIBRATION = [\s\S]*?;\n\n  const DAY_BOUNDS/,
      'const EMBEDDED_CALIBRATION = ' + serializedCalibration + ';\n\n  const DAY_BOUNDS'
    );

    return html;
  }

  function saveCalibrationInsideHtmlApp() {
    try {
      saveCalibrationToStorage();
      const html = buildSelfContainedHtmlWithCalibration();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      downloadBlob(PAGE.fileNames.calibratedApp, blob);
      markAdminCalibrationSaved();
      setStatus('Stvorena je nova HTML aplikacija s ugrađenom kalibracijom. Novostvoreni HTML pri otvaranju koristi upravo ugrađenu kalibraciju, a ne staru kalibraciju iz preglednika.');
      return true;
    } catch (error) {
      setStatus('Nije moguće stvoriti HTML aplikaciju s ugrađenom kalibracijom.', true);
      return false;
    }
  }

  function loadCalibrationFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'));
        const calibration = parsed.calibration || parsed;
        commitCalibrationMutation(() => {
          state.calibration = tunePrintFieldCapacity(mergeDeep(deepClone(DEFAULT_COORDS), calibration));
        });
        setStatus('Kalibracija je učitana iz JSON datoteke.');
      } catch (error) {
        setStatus('Ne mogu učitati JSON kalibracije.', true);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function resetCalibration() {
    commitCalibrationMutation(() => {
      state.calibration = tunePrintFieldCapacity(deepClone(DEFAULT_COORDS));
    });
    setStatus('Vraćena je zadana kalibracija.');
  }

  async function renderCanvasesForExport() {
    const model = deriveDocumentModel(getFormData());
    const canvases = [];
    const page1 = document.createElement('canvas');
    page1.width = PAGE.printWidthPx;
    page1.height = PAGE.printHeightPx;
    renderPageToCanvas(page1, model.page1LayoutKey, model, 1, { forceWhiteBackground: true });
    const page2 = document.createElement('canvas');
    page2.width = PAGE.printWidthPx;
    page2.height = PAGE.printHeightPx;
    renderPageToCanvas(page2, model.page2LayoutKey, model, 2, { forceWhiteBackground: true });
    canvases.push(page1, page2);
    return canvases;
  }
