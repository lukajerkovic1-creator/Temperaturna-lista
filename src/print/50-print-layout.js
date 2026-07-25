// ============================================================
  // MODULE: 50-print-layout.js
  // Source module; tools/build-bootstrap.js assembles the browser runtime.
  // ============================================================
  function buildPrintPageMetadata(pageIndex, pageCount) {
    const data = getFormData();
    const syncState = state.patientSyncState || {};
    const availability = state.appAvailability || {};
    const userLabel = typeof getClinicalOperatorName === 'function' ? getClinicalOperatorName() : '';
    const buildSha = APP_BUILD_SHA;
    const markers = [
      LOCAL_PATIENT_STORAGE_ONLY ? 'ONLINE PHI OFF' : '',
      availability.networkStatus === 'offline' ? 'OFFLINE' : '',
      isFirebasePatientsSmokeMode() ? 'TEST/QA' : ''
    ].filter(Boolean).join(' / ') || 'standard';
    const roomBed = [data.room ? `Soba ${data.room}` : '', data.bed ? `Krevet ${data.bed}` : ''].filter(Boolean).join(', ');
    return [
      `Pacijent: ${data.fullName || 'NEDOSTAJE'} (${data.birthYear || 'godiste?'})`,
      `ID: ${data.patientIdentifier || 'NEDOSTAJE'}`,
      `Encounter: ${data.encounterId || data.admissionDate || 'NEDOSTAJE'}`,
      roomBed || 'Soba/krevet: nije upisano',
      `Stranica ${pageIndex}/${pageCount}`,
      `Vrijeme: ${new Date().toLocaleString('hr-HR')}`,
      `Korisnik: ${userLabel || 'NEDOSTAJE'}`,
      `Verzija: ${APP_VERSION}`,
      `Build: ${buildSha}`,
      `Sync: ${syncState.status || 'unknown'} / ${syncState.lastSaveTarget || 'none'}`,
      markers
    ].map(escapeHtml).join(' | ');
  }

async function printCanvasPages(canvases, documentTitle) {
    const printPages = canvases.map((canvas, index) => ({
      src: canvas.toDataURL('image/png'),
      pageNumber: Math.max(1, Number(canvas.dataset.printPageNumber || index + 1)),
      documentPageCount: Math.max(
        Number(canvas.dataset.printDocumentPageCount || 0),
        Number(canvas.dataset.printPageNumber || index + 1),
        canvases.length
      )
    }));
    const pageDataUrls = printPages.map(page => page.src);
    const safeDocumentTitle = escapeHtml(documentTitle || 'Ispis temperaturne liste');
    const appIconUrl = escapeHtml(new URL('assets/app-icon.png', document.baseURI).href);
    const appStylesUrl = escapeHtml(new URL('src/styles/app.css', document.baseURI).href);
    const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<title>${safeDocumentTitle}</title>
<link rel="icon" type="image/png" href="${appIconUrl}">
<link rel="stylesheet" href="${appStylesUrl}">
<style>
  @page {
    size: A4 landscape;
    margin: 0;
  }
  html,
  body {
    width: 297mm;
    min-height: 210mm;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 297mm;
    height: 210mm;
    margin: 0;
    padding: 0;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #fff;
  }
  .page:last-child {
    break-after: auto;
    page-break-after: auto;
  }
  .page img {
    display: block;
    width: 100%;
    height: auto;
    min-height: 0;
    max-width: 100%;
    max-height: calc(210mm - 13mm);
    flex: 1 1 auto;
    object-fit: contain;
    object-position: center center;
  }
  .print-page-meta {
    position: static;
    width: calc(100% - 8mm);
    flex: 0 0 auto;
    box-sizing: border-box;
    margin: 2mm 4mm 1mm;
    padding: 1.2mm 2mm;
    border: 0.25mm solid #111;
    background: rgba(255, 255, 255, 0.92);
    color: #111;
    font: 7pt/1.25 Arial, sans-serif;
    letter-spacing: 0;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: normal;
  }
  @media print {
    html,
    body {
      width: 297mm;
      min-height: 210mm;
    }
  }
</style>
</head>
<body>
  ${printPages.map(page => `<div class="page"><div class="print-page-meta">${buildPrintPageMetadata(page.pageNumber, page.documentPageCount)}</div><img src="${page.src}" alt="Stranica ${page.pageNumber}"></div>`).join('')}
</body>
</html>`;

    let iframe = document.getElementById('print-frame');
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow.document;
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        if (isFirebasePatientsSmokeMode() && window.__TEMPERATURNA_LISTA_SKIP_PRINT_DIALOG__ === true) {
          window.__TEMPERATURNA_LISTA_PRINT_CALLS__ = Number(window.__TEMPERATURNA_LISTA_PRINT_CALLS__ || 0) + 1;
          if (Array.isArray(window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__)) {
            window.__TEMPERATURNA_LISTA_SMOKE_EVENTS__.push({
              op: 'print',
              documentTitle: safeDocumentTitle,
              pageCount: pageDataUrls.length,
              pageNumbers: printPages.map(page => page.pageNumber),
              documentPageCount: Math.max(...printPages.map(page => page.documentPageCount)),
              at: new Date().toISOString()
            });
          }
          return;
        }
        iframe.contentWindow.print();
      } catch (error) {
        throw error;
      }
    };

    const images = Array.from(frameDoc.images);
    if (!images.length) {
      setTimeout(triggerPrint, 50);
      return;
    }
    let loaded = 0;
    const done = () => {
      loaded += 1;
      if (loaded >= images.length) {
        setTimeout(triggerPrint, 50);
      }
    };
    images.forEach(img => {
      if (img.complete) {
        done();
      } else {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      }
    });
  }

  function getHiddenPrintSections() {
    const hidden = [];
    if (els.showDiagnosisOnList && !els.showDiagnosisOnList.checked) hidden.push('Dijagnoza');
    if (els.showAllergiesOnList && !els.showAllergiesOnList.checked) hidden.push('Alergije na lijekove');
    if (els.showPatientOriginOnList && !els.showPatientOriginOnList.checked) hidden.push('Od kuda je pacijent');
    if (els.showTherapyOnList && !els.showTherapyOnList.checked) hidden.push('Kronična terapija');
    if (els.showOhbpTherapyOnList && !els.showOhbpTherapyOnList.checked) hidden.push('Terapija u OHBP-u');
    if (els.showVitalSignsOnList && !els.showVitalSignsOnList.checked) hidden.push('Vitalni parametri');
    if (els.showFollowUpControlOnList && !els.showFollowUpControlOnList.checked) hidden.push('Kontrola');
    if (els.showLabsOnList && !els.showLabsOnList.checked) hidden.push('Laboratorij');
    if (els.showRadiologyOnList && !els.showRadiologyOnList.checked) hidden.push('RTG/UZV');
    return hidden;
  }

  async function confirmPrintWithHiddenSections() {
    const hidden = getHiddenPrintSections();
    if (!hidden.length) return true;
    const hiddenText = hidden.join(' / ');
    return showPrintConfirmDialog({
      title: 'Sakrivena polja na temperaturnoj listi',
      message: `${hiddenText} ${hidden.length === 1 ? 'je sakriven/a' : 'su sakriveni'} na listi. Želite li nastaviti ispis?`,
      proceedLabel: 'Nastavi ispis',
      cancelLabel: 'Odustani'
    });
  }

  async function confirmPrintWithChronicTherapyAdmissionWarning() {
    const admissionWarning = updateChronicTherapyAdmissionWarningStatus();
    if (!admissionWarning) return true;
    return showPrintConfirmDialog({
      title: 'Kronična terapija neće biti prikazana',
      message: `${admissionWarning}

Unesite datum prijema ili odustanite od ispisa. Želite li ipak nastaviti ispis?`,
      proceedLabel: 'Ipak nastavi ispis',
      cancelLabel: 'Odustani i upiši datum'
    });
  }

  async function writeCurrentPatientPrintAuditEvent(eventType, saveResult = {}) {
    const patientData = getFormData();
    const patientKey = getFirebasePatientIdentityKey(patientData);
    const currentRecord = getFirebasePatientRecordById(state.firebasePatients.currentRecordId);
    const recordForAudit = currentRecord || {
      id: state.firebasePatients.currentRecordId || '',
      patientKey,
      patientMode: getPatientModeFromData(patientData),
      status: FIREBASE_PATIENT_STATUSES.ACTIVE,
      data: patientData
    };
    return writePatientAuditEvent(eventType, {
      patientDocId: recordForAudit.id || '',
      patientKey,
      newRecord: recordForAudit,
      trigger: 'print',
      changeSummary: eventType === 'patient.printWithoutSync'
        ? (LOCAL_PATIENT_STORAGE_ONLY
          ? 'Temperaturna lista je ispisana bez aktualnog lokalnog JSON izvoza.'
          : 'Temperaturna lista je ispisana bez potvrđenog Firebase spremanja.')
        : 'Temperaturna lista je poslana na ispis.',
      changedFields: [],
      metadata: {
        saveAttempted: Boolean(saveResult?.attempted),
        saveSucceeded: Boolean(saveResult?.saved),
        saveReason: String(saveResult?.reason || '')
      }
    });
  }

  function isLocalPrintQaHookEnabled() {
    const hostname = String(window.location?.hostname || '');
    const isLocalhost = hostname === '127.0.0.1' || hostname === 'localhost';
    const qaSearchEnabled = /(?:^|[?&])qa=/.test(String(window.location?.search || ''));
    return isLocalhost && qaSearchEnabled && window.__TEMPERATURNA_LISTA_ENABLE_QA_HOOKS__ === true;
  }

  function getPrintTextOverflowWarnings() {
    const warnings = Array.isArray(state.lastTextOverflowWarnings) ? state.lastTextOverflowWarnings.slice() : [];
    if (isLocalPrintQaHookEnabled() && Array.isArray(state.printQaForcedTextOverflowWarnings)) {
      warnings.push(...state.printQaForcedTextOverflowWarnings);
    }
    return warnings;
  }

  function getClinicalPrintPrerequisiteIssues() {
    const data = getFormData();
    const issues = [];
    const fullName = String(data.fullName || '').trim();
    const birthYear = String(data.birthYear || '').trim();
    const admissionDate = normalizeAdmissionDateInput(data.admissionDate);
    const diagnosis = String(data.diagnosis || '').trim();
    const allergies = String(data.allergies || '').trim();
    const therapy = [
      String(data.therapy || '').trim(),
      String(data.ohbpTherapy || '').trim()
    ].filter(Boolean).join('\n');

    if (!getClinicalOperatorName()) issues.push('ime i prezime operatera ispisa');

    if (!fullName) issues.push('ime i prezime pacijenta');
    if (!/^(?:18|19|20)\d{2}$/.test(birthYear)) issues.push('valjano godiste pacijenta');
    if (!admissionDate) issues.push('potvrden datum prijema / encounter');
    if (!diagnosis) issues.push('potvrdena dijagnoza');
    if (!allergies) issues.push('eksplicitni alergijski status, npr. nema ili navesti alergiju');
    if (!therapy) issues.push('potvrdena terapija');

    issues.push(...getClinicalPrintReviewIssues(data));
    issues.push(...getUnconfirmedCriticalParserProvenanceIssues(data));

    const record = patientDataToClinicalRecordV1(data, { source: 'pre-print-validation' });
    const validationIssues = validateClinicalRecord(record).issues
      .filter((issue) => issue.severity === 'critical');
    const medicationSafetyIssues = runMedicationSafetyChecks(record).issues
      .filter((issue) => issue.severity === 'critical');
    [...validationIssues, ...medicationSafetyIssues].forEach((issue) => {
      const message = String(issue.message || '').trim();
      if (message) issues.push(`klinička provjera: ${message}`);
    });

    return [...new Set(issues)];
  }

  function getClinicalPrintIdentifierWarnings() {
    const data = getFormData();
    const warnings = [];
    if (!String(data.patientIdentifier || '').trim()) {
      warnings.push('MBO/MRN ili bolnicki broj pacijenta');
    }
    if (!String(data.encounterId || '').trim()) {
      warnings.push('encounter/protokol ID');
    }
    return warnings;
  }

  async function confirmPrintWithoutAvailableIdentifiers() {
    const warnings = getClinicalPrintIdentifierWarnings();
    if (!warnings.length) return true;

    const message = `Upozorenje: nedostaje ${warnings.join(' i ')}. Ispis je moguc, ali prije nastavka provjerite da su ime, godiste i datum prijema tocni. Na ispisu ce nedostajuci identifikator biti jasno oznacen.`;
    setStatus(message, true);
    return showPrintConfirmDialog({
      title: 'Nedostaju identifikacijski brojevi',
      message,
      proceedLabel: 'Nastavi bez broja',
      cancelLabel: 'Vrati se i dopuni'
    });
  }

  function getPrintOverrideWarnings() {
    const warnings = [];
    const issues = getClinicalPrintPrerequisiteIssues();
    if (issues.length) {
      warnings.push(`Nedostaje ili nije potvrđeno: ${issues.join('; ')}.`);
    }

    const textOverflowWarnings = getPrintTextOverflowWarnings();
    if (textOverflowWarnings.length) {
      warnings.push(buildTextOverflowWarningMessage(textOverflowWarnings));
    }

    if (state.admin?.enabled) {
      warnings.push('Uključen je servisni/admin način. Ispis može sadržavati servisne postavke ili privremene promjene.');
    }

    return warnings;
  }

  async function confirmPrintDespiteWarnings() {
    const warnings = getPrintOverrideWarnings();
    if (!warnings.length) return true;

    const message = `Pronađena su upozorenja:\n\n${warnings.map((warning) => `• ${warning}`).join('\n')}\n\nMožete se vratiti i ispraviti podatke ili svejedno nastaviti ispis.`;
    setStatus(`Upozorenje prije ispisa: ${warnings.join(' ')}`, true);
    return showPrintConfirmDialog({
      title: 'Upozorenja prije ispisa',
      message,
      proceedLabel: 'Svejedno ispiši',
      cancelLabel: 'Vrati se i ispravi'
    });
  }

  async function printPages() {
    renderAll();

    if (!(await confirmPrintDespiteWarnings())) {
      setStatus('Ispis je otkazan. Podaci su ostali u obrascu kako biste ih mogli ispraviti.');
      return;
    }

    if (!(await confirmPrintWithChronicTherapyAdmissionWarning())) {
      setStatus('Ispis je otkazan. Upišite ispravan datum prijema kako bi se kronična terapija prikazala na listi.');
      return;
    }

    if (!(await confirmPrintWithoutAvailableIdentifiers())) {
      setStatus('Ispis je otkazan. Dopunite dostupni MBO/MRN, bolnicki broj ili encounter/protokol ID.');
      return;
    }

    if (!(await confirmPrintWithHiddenSections())) {
      setStatus('Ispis je otkazan jer su neka polja sakrivena na listi.');
      return;
    }

    try {
      const firebasePrintSaveResult = await saveCurrentPatientToFirebaseBeforePrint();
      if (!(await confirmPrintWithoutFirebaseSave(firebasePrintSaveResult))) {
        setStatus(LOCAL_PATIENT_STORAGE_ONLY
          ? 'Ispis je otkazan. Aktualna verzija nije spremljena u lokalni JSON; podaci su ostali u obrascu.'
          : 'Ispis je otkazan. Pacijent nije spremljen u Firebase, a podaci su ostali u obrascu.', true);
        return;
      }
      if (shouldConfirmPrintWithoutFirebaseSave(firebasePrintSaveResult)) {
        await writeCurrentPatientPrintAuditEvent('patient.printWithoutSync', firebasePrintSaveResult);
      }
      const canvases = await renderCanvasesForExport();
      await printCanvasPages(canvases, 'Ispis temperaturne liste');
      await writeCurrentPatientPrintAuditEvent('patient.print', firebasePrintSaveResult);
      setStatus(
        getPrintStatusAfterFirebaseSave(firebasePrintSaveResult),
        Boolean(firebasePrintSaveResult?.attempted && !firebasePrintSaveResult?.saved)
      );
    } catch (error) {
      setStatus('Ispis nije moguće pripremiti.', true);
    }
  }
  function getPrintConfirmDialog() {
    let dialog = document.getElementById('printConfirmDialog');
    if (dialog) return dialog;

    dialog = document.createElement('div');
    dialog.id = 'printConfirmDialog';
    dialog.className = 'admin-close-dialog-backdrop';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'printConfirmDialogTitle');
    dialog.setAttribute('aria-describedby', 'printConfirmDialogDescription');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <div class="admin-close-dialog" tabindex="-1">
        <h2 id="printConfirmDialogTitle"></h2>
        <p id="printConfirmDialogDescription"></p>
        <div class="admin-close-dialog-actions">
          <button type="button" class="cancel-action" data-print-confirm-action="cancel">Odustani</button>
          <button type="button" class="secondary-action" data-print-confirm-action="proceed">Nastavi ispis</button>
        </div>
      </div>
    `;

    dialog.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-print-confirm-action]');
      if (!actionButton) {
        if (event.target === dialog) resolvePrintConfirmDialog(false);
        return;
      }
      resolvePrintConfirmDialog(actionButton.dataset.printConfirmAction === 'proceed');
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function resolvePrintConfirmDialog(result) {
    const dialog = document.getElementById('printConfirmDialog');
    if (!dialog) return;
    const resolver = dialog.__resolvePrintConfirm;
    dialog.__resolvePrintConfirm = null;
    hideAccessibleAdminDialog(dialog);
    if (typeof resolver === 'function') {
      resolver(Boolean(result));
    }
  }

  function hidePrintConfirmDialog(options = {}) {
    const dialog = document.getElementById('printConfirmDialog');
    if (dialog) hideAccessibleAdminDialog(dialog, options);
  }

  function showPrintConfirmDialog(options = {}) {
    const dialog = getPrintConfirmDialog();
    const titleNode = dialog.querySelector('#printConfirmDialogTitle');
    const descriptionNode = dialog.querySelector('#printConfirmDialogDescription');
    const proceedButton = dialog.querySelector('[data-print-confirm-action="proceed"]');
    const cancelButton = dialog.querySelector('[data-print-confirm-action="cancel"]');

    if (titleNode) titleNode.textContent = options.title || 'Potvrda ispisa';
    if (descriptionNode) descriptionNode.textContent = options.message || 'Želite li nastaviti?';
    if (proceedButton) proceedButton.textContent = options.proceedLabel || 'Nastavi';
    if (cancelButton) cancelButton.textContent = options.cancelLabel || 'Odustani';

    return new Promise((resolve) => {
      dialog.__resolvePrintConfirm = resolve;
      dialog.__returnFocusTo = els.printBtn || document.activeElement || null;
      showAccessibleAdminDialog(dialog, '[data-print-confirm-action="cancel"]');
    });
  }

  const ADMIN_DIALOG_FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  function getAdminDialogPanel(dialog) {
    return dialog ? dialog.querySelector('.admin-close-dialog') : null;
  }

  function isElementActuallyFocusable(element) {
    if (!element || element.disabled) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return element.offsetParent !== null || element === document.activeElement;
  }

  function getAdminDialogFocusableElements(dialog) {
    return Array.from(dialog.querySelectorAll(ADMIN_DIALOG_FOCUSABLE_SELECTOR))
      .filter(isElementActuallyFocusable);
  }

  function getVisibleAdminDialog() {
    const printDialog = document.getElementById('printConfirmDialog');
    if (printDialog && printDialog.classList.contains('visible')) return printDialog;
    const discardDialog = document.getElementById('adminDiscardConfirmDialog');
    if (discardDialog && discardDialog.classList.contains('visible')) return discardDialog;
    const closeDialog = document.getElementById('adminCloseDialog');
    if (closeDialog && closeDialog.classList.contains('visible')) return closeDialog;
    return null;
  }

  function getAdminDialogDefaultButton(dialog) {
    if (!dialog) return null;
    if (dialog.id === 'adminDiscardConfirmDialog') {
      return dialog.querySelector('[data-admin-discard-confirm="no"]');
    }
    if (dialog.id === 'adminCloseDialog') {
      return dialog.querySelector('[data-admin-close-action="save"]');
    }
    if (dialog.id === 'printConfirmDialog') {
      return dialog.querySelector('[data-print-confirm-action="cancel"]');
    }
    return null;
  }

  function focusInsideAdminDialog(dialog, preferredSelector) {
    if (!dialog) return;
    const preferred = preferredSelector ? dialog.querySelector(preferredSelector) : null;
    const focusable = getAdminDialogFocusableElements(dialog);
    const target = preferred && isElementActuallyFocusable(preferred)
      ? preferred
      : (focusable[0] || getAdminDialogPanel(dialog) || dialog);
    if (target && typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
  }

  function showAccessibleAdminDialog(dialog, preferredFocusSelector) {
    if (!dialog) return;
    const activeElement = document.activeElement;
    const activeIsInsideAnotherAdminDialog = Boolean(
      activeElement && activeElement.closest && activeElement.closest('.admin-close-dialog-backdrop')
    );
    if (activeElement && !dialog.contains(activeElement) && activeElement !== document.body && !activeIsInsideAnotherAdminDialog) {
      dialog.__returnFocusTo = activeElement;
    } else if (!dialog.__returnFocusTo) {
      dialog.__returnFocusTo = els.adminCloseBtn || els.adminToggleBtn || null;
    }
    dialog.classList.add('visible');
    dialog.setAttribute('aria-hidden', 'false');
    focusInsideAdminDialog(dialog, preferredFocusSelector);
  }

  function hideAccessibleAdminDialog(dialog, options = {}) {
    if (!dialog) return;
    const wasVisible = dialog.classList.contains('visible');
    dialog.classList.remove('visible');
    dialog.setAttribute('aria-hidden', 'true');
    if (wasVisible && options.restoreFocus !== false) {
      const returnFocusTo = dialog.__returnFocusTo;
      if (returnFocusTo && document.contains(returnFocusTo) && typeof returnFocusTo.focus === 'function') {
        returnFocusTo.focus({ preventScroll: true });
      }
    }
  }

  function cancelVisibleAdminDialog(dialog) {
    if (!dialog) return false;
    if (dialog.id === 'printConfirmDialog') {
      resolvePrintConfirmDialog(false);
      return true;
    }
    if (dialog.id === 'adminDiscardConfirmDialog') {
      hideAdminDiscardConfirmDialog({ restoreFocus: false });
      showAdminCloseDialog();
      setStatus('Odbacivanje promjena je odustavljeno.');
      return true;
    }
    if (dialog.id === 'adminCloseDialog') {
      hideAdminCloseDialog();
      setStatus('Zatvaranje admin načina je odustavljeno.');
      return true;
    }
    return false;
  }

  function trapAdminDialogTab(event, dialog) {
    const focusable = getAdminDialogFocusableElements(dialog);
    if (!focusable.length) {
      event.preventDefault();
      const panel = getAdminDialogPanel(dialog) || dialog;
      panel.focus({ preventScroll: true });
      return true;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!dialog.contains(active)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return true;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return true;
    }

    return true;
  }

  function handleVisibleAdminDialogKeyDown(event) {
    const dialog = getVisibleAdminDialog();
    if (!dialog) return false;

    if (event.key === 'Tab') {
      return trapAdminDialogTab(event, dialog);
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelVisibleAdminDialog(dialog);
      return true;
    }

    if (event.key === 'Enter' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      const target = event.target;
      const isNativeActivator = target && target.closest && target.closest('button, a[href], input, select, textarea, [contenteditable="true"]');
      if (!isNativeActivator) {
        const defaultButton = getAdminDialogDefaultButton(dialog);
        if (defaultButton) {
          event.preventDefault();
          defaultButton.click();
          return true;
        }
      }
    }

    return false;
  }

  function isAdminCloseDialogVisible() {
    const dialog = document.getElementById('adminCloseDialog');
    return Boolean(dialog && dialog.classList.contains('visible'));
  }

  function hideAdminCloseDialog(options = {}) {
    const dialog = document.getElementById('adminCloseDialog');
    if (dialog) hideAccessibleAdminDialog(dialog, options);
  }

  function isAdminDiscardConfirmDialogVisible() {
    const dialog = document.getElementById('adminDiscardConfirmDialog');
    return Boolean(dialog && dialog.classList.contains('visible'));
  }

  function hideAdminDiscardConfirmDialog(options = {}) {
    const dialog = document.getElementById('adminDiscardConfirmDialog');
    if (dialog) hideAccessibleAdminDialog(dialog, options);
  }

  function discardAdminSessionChangesAndClose() {
    const snapshot = state.admin.sessionStartSnapshot;
    let restored = true;
    if (snapshot) {
      restored = restoreCalibrationSnapshot(snapshot);
    }
    if (!restored) return;
    state.admin.undoStack = [];
    state.admin.redoStack = [];
    hideAdminDiscardConfirmDialog();
    hideAdminCloseDialog();
    setAdminMode(false);
    setStatus('Admin način je zatvoren. Sve promjene iz ove admin sesije su odbačene.');
  }

  function getAdminDiscardConfirmDialog() {
    let dialog = document.getElementById('adminDiscardConfirmDialog');
    if (dialog) return dialog;

    dialog = document.createElement('div');
    dialog.id = 'adminDiscardConfirmDialog';
    dialog.className = 'admin-close-dialog-backdrop';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'adminDiscardConfirmDialogTitle');
    dialog.setAttribute('aria-describedby', 'adminDiscardConfirmDialogDescription');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <div class="admin-close-dialog" tabindex="-1">
        <h2 id="adminDiscardConfirmDialogTitle">Jeste li sigurni da želite odbaciti sve promjene?</h2>
        <p id="adminDiscardConfirmDialogDescription">Ovo će vratiti postavke na stanje prije uključivanja admin načina rada. Radnja se neće spremiti.</p>
        <div class="admin-close-dialog-actions">
          <button type="button" class="discard-action" data-admin-discard-confirm="yes">Da</button>
          <button type="button" class="secondary-action" data-admin-discard-confirm="no">Ne</button>
        </div>
      </div>
    `;

    dialog.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-admin-discard-confirm]');
      if (!actionButton) {
        if (event.target === dialog) cancelVisibleAdminDialog(dialog);
        return;
      }
      const action = actionButton.dataset.adminDiscardConfirm;

      if (action === 'yes') {
        discardAdminSessionChangesAndClose();
        return;
      }

      if (action === 'no') {
        hideAdminDiscardConfirmDialog();
        showAdminCloseDialog();
        setStatus('Odbacivanje promjena je odustavljeno.');
      }
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function showAdminDiscardConfirmDialog() {
    hideAdminCloseDialog({ restoreFocus: false });
    const dialog = getAdminDiscardConfirmDialog();
    showAccessibleAdminDialog(dialog, '[data-admin-discard-confirm="no"]');
  }

  function getAdminCloseDialog() {
    let dialog = document.getElementById('adminCloseDialog');
    if (dialog) return dialog;

    dialog = document.createElement('div');
    dialog.id = 'adminCloseDialog';
    dialog.className = 'admin-close-dialog-backdrop';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'adminCloseDialogTitle');
    dialog.setAttribute('aria-describedby', 'adminCloseDialogDescription');
    dialog.setAttribute('aria-hidden', 'true');
    dialog.innerHTML = `
      <div class="admin-close-dialog" tabindex="-1">
        <h2 id="adminCloseDialogTitle">Spremiti promjene prije izlaska iz admin načina?</h2>
        <p id="adminCloseDialogDescription">Spremi čuva postavke lokalno na ovom računalu za sljedeće otvaranje u istom pregledniku. Odbaci promjene vraća stanje prije admin načina. Odustani ostavlja admin način otvoren.</p>
        <div class="admin-close-dialog-actions">
          <button type="button" data-admin-close-action="save">Spremi</button>
          <button type="button" class="discard-action" data-admin-close-action="discard">Odbaci promjene</button>
          <button type="button" class="cancel-action" data-admin-close-action="cancel">Odustani</button>
        </div>
      </div>
    `;

    dialog.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-admin-close-action]');
      if (!actionButton) {
        if (event.target === dialog) cancelVisibleAdminDialog(dialog);
        return;
      }
      const action = actionButton.dataset.adminCloseAction;

      if (action === 'cancel') {
        hideAdminCloseDialog();
        setStatus('Zatvaranje admin načina je odustavljeno.');
        return;
      }

      if (action === 'discard') {
        discardAdminSessionChangesAndClose();
        return;
      }

      if (action === 'save') {
        actionButton.disabled = true;
        try {
          const result = await saveCalibrationToLocalApp();
          if (!result || !result.ok) {
            actionButton.disabled = false;
            return;
          }
          hideAdminCloseDialog();
          setAdminMode(false);
          setStatus(`${result.message} Admin način je isključen.`);
        } catch (error) {
          actionButton.disabled = false;
          setStatus('Nije moguće spremiti online postavke aplikacije.', true);
        }
      }
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function showAdminCloseDialog() {
    hideAdminDiscardConfirmDialog({ restoreFocus: false });
    const dialog = getAdminCloseDialog();
    showAccessibleAdminDialog(dialog, '[data-admin-close-action="save"]');
  }

  function requestCloseAdminMode() {
    if (!state.admin.enabled) {
      setAdminMode(false);
      return;
    }
    showAdminCloseDialog();
  }

  function setAdminMode(enabled) {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled && !requireSuperAdminForAdminMode()) return;
    const wasEnabled = Boolean(state.admin.enabled);
    state.admin.enabled = nextEnabled;

    if (nextEnabled && !wasEnabled) {
      state.admin.sessionStartSnapshot = snapshotCalibration();
      state.admin.savedSnapshot = snapshotCalibration();
      state.admin.undoStack = [];
      state.admin.redoStack = [];
    }

    if (!nextEnabled) {
      state.admin.sessionStartSnapshot = null;
      state.admin.savedSnapshot = null;
      state.admin.undoStack = [];
      state.admin.redoStack = [];
      state.admin.advancedVisible = false;
      hideAdminCloseDialog({ restoreFocus: false });
      hideAdminDiscardConfirmDialog({ restoreFocus: false });
    }

    els.appRoot.classList.toggle('admin-on', state.admin.enabled);
    els.adminPanel.classList.toggle('visible', state.admin.enabled);
    if (els.adminToggleBtn) {
      els.adminToggleBtn.classList.toggle('active-admin', state.admin.enabled);
      els.adminToggleBtn.title = state.admin.enabled
        ? 'Servisni režim uključen — klikni za izlaz (Ctrl + Alt + A)'
        : 'Servisni režim / admin kalibracija (Ctrl + Alt + A)';
      els.adminToggleBtn.setAttribute('aria-label', state.admin.enabled ? 'Isključi servisni režim' : 'Uključi servisni režim');
      els.adminToggleBtn.setAttribute('aria-pressed', state.admin.enabled ? 'true' : 'false');
    }
    updateAdminSelectionUI();
    updateUndoRedoButtons();
    updateAdminAdvancedControls();
    updateAdminUnsavedIndicator();
    updateAdminAccessVisibility();
    if (state.admin.enabled) {
      updateSelectAllTextBoxesButton();
      renderAdminDashboard();
      refreshAdminDashboard({ silent: true });
      setStatus('Admin dashboard je uključen. Kalibraciju ispisa koristi samo za servisne izmjene.');
    } else {
      state.admin.selectAllTextBoxes = false;
      state.admin.drag = null;
      updateSelectAllTextBoxesButton();
      setStatus('Admin dashboard je isključen.');
    }
  }

  function toggleAdminMode() {
    if (!isCapabilityEnabled('adminDashboard')) {
      setStatus('Admin dashboard nije dio produkcijskog kliničkog načina.', true);
      return false;
    }
    if (state.admin.enabled) {
      requestCloseAdminMode();
    } else {
      if (!requireSuperAdminForAdminMode()) return;
      const confirmed = window.confirm('Uključiti admin dashboard? Ovdje se vide korisnici, audit i servisna kalibracija ispisa.');
      if (!confirmed) return;
      setAdminMode(true);
    }
    return true;
  }

  function closeAdminMode() {
    requestCloseAdminMode();
  }

  function exposePrintQaHooks() {
    if (!isLocalPrintQaHookEnabled()) {
      return;
    }
    window.__TEMPERATURNA_LISTA_QA_PRINT__ = {
      setAdminMode(enabled) {
        state.admin.enabled = Boolean(enabled);
        if (els.appRoot) els.appRoot.classList.toggle('admin-on', state.admin.enabled);
        if (els.adminPanel) els.adminPanel.classList.toggle('visible', state.admin.enabled);
        if (els.adminToggleBtn) els.adminToggleBtn.setAttribute('aria-pressed', state.admin.enabled ? 'true' : 'false');
        return Boolean(state.admin?.enabled);
      },
      setTextOverflowWarnings(warnings) {
        state.printQaForcedTextOverflowWarnings = Array.isArray(warnings) ? warnings : [];
        return state.printQaForcedTextOverflowWarnings.length;
      }
    };
  }
  function getSpeechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function getSpeechButton(targetId) {
    if (targetId === 'therapy') return els.therapySpeechBtn;
    if (targetId === 'ohbpTherapy') return els.ohbpTherapySpeechBtn;
    return null;
  }

  function getSpeechStatusElement(targetId) {
    if (targetId === 'therapy') return els.therapySpeechStatus;
    if (targetId === 'ohbpTherapy') return els.ohbpTherapySpeechStatus;
    return null;
  }

  function getSpeechMicStateElement(targetId) {
    if (targetId === 'therapy') return els.therapyMicState;
    if (targetId === 'ohbpTherapy') return els.ohbpTherapyMicState;
    return null;
  }

  function setSpeechMicVisualState(targetId, mode = 'off', message = 'Mikrofon isključen') {
    const stateEl = getSpeechMicStateElement(targetId);
    if (!stateEl) return;
    stateEl.classList.remove('on', 'off', 'paused', 'blocked');
    stateEl.classList.add(mode);
    let textEl = stateEl.querySelector('[data-mic-state-text]');
    if (!textEl) {
      stateEl.innerHTML = '<span class="mic-state-dot" aria-hidden="true"></span><span data-mic-state-text></span>';
      textEl = stateEl.querySelector('[data-mic-state-text]');
    }
    if (textEl) textEl.textContent = message;
  }

  function getSpeechTargetTextarea(targetId) {
    if (targetId === 'therapy') return els.therapy;
    if (targetId === 'ohbpTherapy') return els.ohbpTherapy;
    return null;
  }

  function getSpeechTargetLabel(targetId) {
    if (targetId === 'therapy') return 'kronična terapija';
    if (targetId === 'ohbpTherapy') return 'terapija u OHBP-u';
    return 'terapija';
  }

  function setSpeechStatus(targetId, message = '', kind = 'neutral') {
    const status = getSpeechStatusElement(targetId);
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('ok', kind === 'ok');
    status.classList.toggle('warn', kind === 'warn');
  }

  function setSpeechButtonsState(activeTargetId = null) {
    ['therapy', 'ohbpTherapy'].forEach((targetId) => {
      const button = getSpeechButton(targetId);
      if (!button) return;
      const isActive = activeTargetId === targetId;
      const anotherActive = Boolean(activeTargetId && !isActive);
      const session = getActiveTherapyGuidedSession(targetId);
      const hasPausedSession = Boolean(!isActive && !anotherActive && session && !session.completed && (session.stepIndex > 0 || session.rawSegments.length));

      button.classList.toggle('listening', isActive);
      button.classList.toggle('mic-on', isActive);
      button.classList.toggle('mic-off', !isActive && !hasPausedSession && !anotherActive);
      button.classList.toggle('mic-paused', hasPausedSession);
      button.classList.toggle('mic-blocked', anotherActive);

      if (isActive) {
        button.textContent = '■ Zaustavi unos';
        button.title = 'Kliknite za zaustavljanje ili pauziranje vođenog audio unosa.';
        setSpeechMicVisualState(targetId, 'on', 'Mikrofon uključen');
      } else if (anotherActive) {
        button.textContent = '🎙 Zauzeto';
        button.title = 'Audio unos je aktivan u drugom terapijskom polju.';
        setSpeechMicVisualState(targetId, 'blocked', 'Mikrofon zauzet');
      } else if (hasPausedSession) {
        button.textContent = '▶ Nastavi unos';
        button.title = 'Započeti unos je sačuvan. Kliknite za nastavak od trenutnog koraka.';
        setSpeechMicVisualState(targetId, 'paused', 'Mikrofon isključen — unos pauziran');
      } else {
        button.textContent = '🎙 Pokreni unos';
        button.title = `Pokreni vođeni audio unos: ${getSpeechTargetLabel(targetId)}.`;
        setSpeechMicVisualState(targetId, 'off', 'Mikrofon isključen');
      }

      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.disabled = anotherActive;
    });
  }

  const THERAPY_SPEECH_MEDICATION_DICTIONARY = Object.freeze([
    { canonical: 'piperacilin/tazobaktam', variants: ['piperacilin tazobaktam', 'piperacilin tazobaktan', 'piper tazo', 'piptazo', 'pip tazo', 'tazocin'] },
    { canonical: 'meropenem', variants: ['meropenem', 'meronem', 'meropenemum', 'mero'] },
    { canonical: 'imipenem/cilastatin', variants: ['imipenem cilastatin', 'imipenem', 'tienam'] },
    { canonical: 'ertapenem', variants: ['ertapenem', 'invanz'] },
    { canonical: 'ceftriakson', variants: ['ceftriakson', 'ceftrijakson', 'ceftriaxon', 'ceftriaxone', 'rocephin', 'lendacin'] },
    { canonical: 'cefazolin', variants: ['cefazolin', 'kefzol'] },
    { canonical: 'cefuroksim', variants: ['cefuroksim', 'cefuroxime', 'zinacef', 'zinnat'] },
    { canonical: 'ceftazidim', variants: ['ceftazidim', 'ceftazidime', 'fortum'] },
    { canonical: 'ceftazidim/avibaktam', variants: ['ceftazidim avibaktam', 'ceftazidim avibactam', 'ceftazidim avibaktam', 'caz avi', 'caz-avi', 'zavicefta'] },
    { canonical: 'cefepim', variants: ['cefepim', 'cefepime', 'maxipime'] },
    { canonical: 'amoksicilin/klavulanska kiselina', variants: ['amoksicilin klavulanska', 'amoksicilin klavulanat', 'amoksiklav', 'augmentin', 'koamoksiklav'] },
    { canonical: 'ampicilin/sulbaktam', variants: ['ampicilin sulbaktam', 'ampicilin sulbactam', 'unasyn'] },
    { canonical: 'azitromicin', variants: ['azitromicin', 'sumamed', 'azithromycin'] },
    { canonical: 'doksiciklin', variants: ['doksiciklin', 'doxycycline', 'doksiciklinum'] },
    { canonical: 'metronidazol', variants: ['metronidazol', 'medazol', 'flagyl'] },
    { canonical: 'ciprofloksacin', variants: ['ciprofloksacin', 'ciprofloxacin', 'ciprinol', 'ciproxin', 'cipro'] },
    { canonical: 'levofloksacin', variants: ['levofloksacin', 'levofloxacin', 'tavanic'] },
    { canonical: 'moksifloksacin', variants: ['moksifloksacin', 'moxifloxacin', 'avelox'] },
    { canonical: 'vankomicin', variants: ['vankomicin', 'vancomycin', 'vanco', 'vanko'] },
    { canonical: 'linezolid', variants: ['linezolid', 'zyvoxid'] },
    { canonical: 'daptomicin', variants: ['daptomicin', 'daptomycin', 'cubicin'] },
    { canonical: 'kolistin', variants: ['kolistin', 'colistin', 'kolistimetat', 'colomycin'] },
    { canonical: 'amikacin', variants: ['amikacin', 'amikin'] },
    { canonical: 'gentamicin', variants: ['gentamicin', 'garamycin'] },
    { canonical: 'fosfomicin', variants: ['fosfomicin', 'fosfomycin'] },
    { canonical: 'klindamicin', variants: ['klindamicin', 'clindamycin', 'dalacin'] },
    { canonical: 'kotrimoksazol', variants: ['kotrimoksazol', 'cotrimoxazole', 'trimetoprim sulfametoksazol', 'tmp smx', 'biseptol'] },
    { canonical: 'nitrofurantoin', variants: ['nitrofurantoin', 'nifuran'] },
    { canonical: 'flukonazol', variants: ['flukonazol', 'fluconazole', 'diflucan'] },
    { canonical: 'aciklovir', variants: ['aciklovir', 'acyclovir', 'zovirax'] },
    { canonical: 'ganciklovir', variants: ['ganciklovir', 'ganciclovir', 'cymevene'] },
    { canonical: 'valganciklovir', variants: ['valganciklovir', 'valganciclovir', 'valcyte'] },
    { canonical: 'oseltamivir', variants: ['oseltamivir', 'tamiflu'] },
    { canonical: 'remdesivir', variants: ['remdesivir', 'veklury'] },
    { canonical: 'paracetamol', variants: ['paracetamol', 'lupocet', 'lekadol'] },
    { canonical: 'metamizol', variants: ['metamizol', 'analgin', 'novalgetol'] },
    { canonical: 'ketoprofen', variants: ['ketoprofen', 'ketonal'] },
    { canonical: 'tramadol', variants: ['tramadol', 'tramal'] },
    { canonical: 'pantoprazol', variants: ['pantoprazol', 'controloc', 'nolpaza'] },
    { canonical: 'metoklopramid', variants: ['metoklopramid', 'reglan'] },
    { canonical: 'ondansetron', variants: ['ondansetron', 'zofran'] },
    { canonical: 'furosemid', variants: ['furosemid', 'lasix'] },
    { canonical: 'enoksaparin', variants: ['enoksaparin', 'clexane', 'enoxaparin'] },
    { canonical: 'heparin', variants: ['heparin', 'nefrakcionirani heparin'] },
    { canonical: 'diazepam', variants: ['diazepam', 'apaurin', 'normabel'] },
    { canonical: 'midazolam', variants: ['midazolam', 'dormicum'] },
    { canonical: 'prednizon', variants: ['prednizon', 'decortin'] },
    { canonical: 'metilprednizolon', variants: ['metilprednizolon', 'solu medrol', 'solumedrol'] },
    { canonical: 'inzulin glargin', variants: ['inzulin glargin', 'lantus', 'toujeo'] },
    { canonical: 'inzulin aspart', variants: ['inzulin aspart', 'novorapid'] },
    { canonical: 'inzulin lispro', variants: ['inzulin lispro', 'humalog'] },
    { canonical: 'NaCl 0,9%', variants: ['nacl', 'natrijev klorid', 'fiziološka', 'fizioloska'] },
    { canonical: 'Ringer', variants: ['ringer', 'ringerov laktat', 'ringer laktat'] },
    { canonical: 'glukoza', variants: ['glukoza', 'glucose'] }
  ]);

  function replaceTherapySpeechWord(value, alternativesPattern, replacement) {
    return String(value || '').replace(
      new RegExp(`(^|[^\\p{L}\\p{N}])(${alternativesPattern})(?=$|[^\\p{L}\\p{N}])`, 'giu'),
      (match, prefix, term) => `${prefix}${typeof replacement === 'function' ? replacement(term) : replacement}`
    );
  }

  function normalizeCroatianTherapyNumberWords(value) {
    let text = String(value || '');
    const replacements = [
      ['(?:četiri|cetiri)\\s+i\\s+pol', '4,5'],
      ['nula', '0'],
      ['jedanaest', '11'],
      ['dvanaest', '12'],
      ['dvadeset', '20'],
      ['jedan', '1'],
      ['jedna', '1'],
      ['jedno', '1'],
      ['dva', '2'],
      ['dvije', '2'],
      ['tri', '3'],
      ['četiri|cetiri', '4'],
      ['pet', '5'],
      ['šest|sest', '6'],
      ['sedam', '7'],
      ['osam', '8'],
      ['devet', '9'],
      ['deset', '10']
    ];
    replacements.forEach(([pattern, replacement]) => {
      text = replaceTherapySpeechWord(text, pattern, replacement);
    });
    return text;
  }

  function normalizeTherapySpeechTranscript(value) {
    let text = String(value || '').trim();
    if (!text) return '';

    text = normalizeCroatianTherapyNumberWords(text);

    const replacements = [
      [/\bnovi\s+red\b/gi, '\n'],
      [/\bsljedeći\s+red\b/gi, '\n'],
      [/\bslijedeći\s+red\b/gi, '\n'],
      [/\bzarez\b/gi, ','],
      [/\btočka\b/gi, '.'],
      [/\bdvotočka\b/gi, ':'],
      [/\bcrtica\b/gi, '-'],
      [/\bputa\b/gi, 'x'],
      [/\bmiligrama?\b/gi, 'mg'],
      [/\bgrama?\b/gi, 'g'],
      [/\bmililitara?\b/gi, 'ml'],
      [/\blitara?\b/gi, 'L'],
      [/\bmikrograma?\b/gi, 'mcg'],
      [/\bintravenski\b/gi, 'i.v.'],
      [/\bintravenska\b/gi, 'i.v.'],
      [/\bintravensko\b/gi, 'i.v.'],
      [/\biv\b/gi, 'i.v.'],
      [/\bper\s+os\b/gi, 'p.o.'],
      [/\bna\s+usta\b/gi, 'p.o.'],
      [/\bperoralno\b/gi, 'p.o.'],
      [/\bsubkutano\b/gi, 's.c.'],
      [/\bsc\b/gi, 's.c.'],
      [/\bintramuskularno\b/gi, 'i.m.'],
      [/\bim\b/gi, 'i.m.'],
      [/\bsvakih\s+(\d{1,2})\s+sati\b/gi, 'svakih $1 h'],
      [/\bsvakih\s+(\d{1,2})\s+h\b/gi, 'svakih $1 h'],
      [/\b(\d{1,2})\s+sati\b/gi, '$1 h'],
      [/\b(\d+)\s*x\s*(\d+)\b/gi, '$1x$2'],
      [/\b(\d+)\s+puta\s+dnevno\b/gi, '$1x dnevno'],
      [/\bjednom\s+dnevno\b/gi, '1x dnevno'],
      [/\bdvaput\s+dnevno\b/gi, '2x dnevno'],
      [/\btriput\s+dnevno\b/gi, '3x dnevno'],
      [/\b(\d)\s+(\d)\s+(\d)\b/g, '$1,$2,$3']
    ];

    replacements.forEach(([pattern, replacement]) => {
      text = text.replace(pattern, replacement);
    });

    text = text
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])(?=\S)/g, '$1 ')
      .replace(/\b(\d+)\s*,\s*(\d+)\s*(mg|g|ml|L|mcg)\b/gi, '$1,$2 $3')
      .replace(/\b(\d+)\s*(mg|g|ml|L|mcg)\b/gi, '$1 $2')
      .replace(/i\.\s*v\./gi, 'i.v.')
      .replace(/p\.\s*o\./gi, 'p.o.')
      .replace(/s\.\s*c\./gi, 's.c.')
      .replace(/i\.\s*m\./gi, 'i.m.')
      .replace(/p\.\s*r\./gi, 'p.r.')
      .replace(/\b(\d)\s*,\s*(\d)\s*,\s*(\d)(?:\s*,\s*(\d))?\b/g, (match, a, b, c, d) => d ? `${a},${b},${c},${d}` : `${a},${b},${c}`)
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return text;
  }

  function normalizeForMedicationMatch(value) {
    return String(value || '')
      .toLocaleLowerCase('hr-HR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function levenshteinDistance(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    const previous = Array.from({ length: right.length + 1 }, (_, i) => i);
    const current = Array(right.length + 1).fill(0);

    for (let i = 1; i <= left.length; i += 1) {
      current[0] = i;
      for (let j = 1; j <= right.length; j += 1) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
      }
      for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
    }
    return previous[right.length];
  }

  function medicationSimilarity(a, b) {
    const left = normalizeForMedicationMatch(a);
    const right = normalizeForMedicationMatch(b);
    if (!left || !right) return 0;
    if (left === right) return 1;
    const maxLength = Math.max(left.length, right.length);
    if (!maxLength) return 0;
    return Math.max(0, 1 - (levenshteinDistance(left, right) / maxLength));
  }

  function getAllMedicationVariants() {
    const variants = [];
    THERAPY_SPEECH_MEDICATION_DICTIONARY.forEach((entry) => {
      [entry.canonical, ...(entry.variants || [])].forEach((variant) => {
        if (variant) variants.push({ canonical: entry.canonical, variant });
      });
    });
    return variants.sort((a, b) => b.variant.length - a.variant.length);
  }

  function replaceExactMedicationVariants(text) {
    let standardized = String(text || '');
    let bestMatch = null;
    getAllMedicationVariants().forEach(({ canonical, variant }) => {
      const normalizedVariant = normalizeForMedicationMatch(variant);
      if (!normalizedVariant) return;
      const variantPattern = escapeRegExp(variant)
        .replace(/\\\//g, '[\\/\\s-]+')
        .replace(/\s+/g, '\\s+');
      const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${variantPattern})(?=$|[^\\p{L}\\p{N}])`, 'giu');
      if (pattern.test(standardized)) {
        standardized = standardized.replace(pattern, `$1${canonical}`);
        bestMatch = bestMatch || { canonical, variant, confidence: 1, matchType: 'exact' };
      }
    });
    return { standardized, bestMatch };
  }

  function findFuzzyMedicationMatch(text) {
    const normalized = normalizeForMedicationMatch(text);
    if (!normalized) return null;
    const words = normalized.split(/\s+/).filter(Boolean);
    const candidates = new Set(words);
    for (let i = 0; i < words.length - 1; i += 1) candidates.add(`${words[i]} ${words[i + 1]}`);
    for (let i = 0; i < words.length - 2; i += 1) candidates.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);

    let best = null;
    getAllMedicationVariants().forEach(({ canonical, variant }) => {
      candidates.forEach((candidate) => {
        const score = medicationSimilarity(candidate, variant);
        if (!best || score > best.confidence) {
          best = { canonical, variant, candidate, confidence: score, matchType: 'fuzzy' };
        }
      });
    });

    if (!best || best.confidence < 0.72) return null;
    return best;
  }

  function classifyTherapySuggestionConfidence(match) {
    if (!match) return { level: 'low', label: 'niska', message: 'Lijek nije pouzdano prepoznat. Provjeriti ručno.' };
    if (match.matchType === 'exact' || match.confidence >= 0.9) return { level: 'high', label: 'visoka', message: `Prepoznat lijek: ${match.canonical}.` };
    if (match.confidence >= 0.78) return { level: 'medium', label: 'srednja', message: `Mogući lijek: ${match.canonical}. Provjeriti prije prihvaćanja.` };
    return { level: 'low', label: 'niska', message: `Nesiguran mogući lijek: ${match.canonical}. Provjeriti ručno.` };
  }

  function findMedicationMatchForTherapyText(text) {
    const normalized = normalizeTherapySpeechTranscript(text);
    const exactResult = replaceExactMedicationVariants(normalized);
    if (exactResult.bestMatch) {
      return { normalizedText: exactResult.standardized, match: exactResult.bestMatch };
    }
    const fuzzyMatch = findFuzzyMedicationMatch(normalized);
    return { normalizedText: exactResult.standardized || normalized, match: fuzzyMatch };
  }

  function hasTherapyDose(text) {
    const value = String(text || '');
    return /\b\d+(?:[,.]\d+)?\s*(?:mg|g|mcg|µg|ug|ml|l|ij|iu|jed\.?|mmol|%|amp(?:ula|ule)?|tbl\.?|tabl\.?|tableta|tablete|kaps\.?|kapsula|kapsule|kap|kapi|doza|doze|inhalacija|udaha)\b/i.test(value);
  }

  function hasTherapyRoute(text) {
    const value = String(text || '');
    return /(^|[^\p{L}\p{N}])(?:i\.v\.|iv|p\.o\.|po|s\.c\.|sc|i\.m\.|im|p\.r\.|pr|per\s+os|na\s+usta|peroralno|subkutano|intramuskularno|intravenski|rektalno|per\s+rectum|inhalacijski|inh\.?|lokalno)(?=$|[^\p{L}\p{N}])/iu.test(value);
  }

  function hasTherapyDosingSchedule(text) {
    const value = String(text || '');
    return /(?:\b\d+\s*x\s*\d+\b|\b\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*\d+)?\b|\bsvakih\s+\d{1,2}\s*h\b|\b\d{1,2}\s*h\b|\b\d+\s*x\s*dnevno\b|\b(?:jednom|dvaput|triput)\s+dnevno\b|\bujutro\b|\bnavečer\b|\bnavecer\b|\bna\s+dan\b)/i.test(value);
  }

  function validateTherapySpeechStructuredInput(text, suppliedMatch = null) {
    const normalizedText = normalizeTherapySpeechTranscript(text);
    const matchData = suppliedMatch
      ? { normalizedText, match: suppliedMatch }
      : findMedicationMatchForTherapyText(normalizedText);
    const textToCheck = matchData.normalizedText || normalizedText;
    const match = matchData.match || null;
    const checks = {
      medication: Boolean(match && (match.matchType === 'exact' || match.confidence >= 0.78)),
      dose: hasTherapyDose(textToCheck),
      schedule: hasTherapyDosingSchedule(textToCheck),
      route: hasTherapyRoute(textToCheck)
    };
    const missing = [];
    if (!checks.medication) missing.push('prepoznat generički ili tvornički naziv lijeka iz rječnika');
    if (!checks.dose) missing.push('doza s jedinicom, npr. 1 g, 500 mg, 4,5 g');
    if (!checks.schedule) missing.push('ritam doziranja, npr. 1x1, 1,0,0 ili svakih 8 h');
    if (!checks.route) missing.push('put primjene, npr. i.v., p.o., s.c. ili i.m.');

    return {
      valid: missing.length === 0,
      checks,
      missing,
      normalizedText: textToCheck,
      match,
      message: missing.length === 0
        ? 'OK — unos zadovoljava pravilo: lijek + doza + ritam + put primjene.'
        : `Blokirano — nedostaje: ${missing.join('; ')}.`
    };
  }

  function buildTherapySpeechSuggestion(rawTranscript) {
    const rawText = String(rawTranscript || '').replace(/\s+/g, ' ').trim();
    const basicNormalized = normalizeTherapySpeechTranscript(rawTranscript);
    const exactResult = replaceExactMedicationVariants(basicNormalized);
    const fuzzyMatch = exactResult.bestMatch ? null : findFuzzyMedicationMatch(basicNormalized);
    let standardized = exactResult.standardized;
    let match = exactResult.bestMatch || fuzzyMatch;

    if (fuzzyMatch && !exactResult.bestMatch && fuzzyMatch.confidence >= 0.78) {
      const candidatePattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(fuzzyMatch.candidate).replace(/\s+/g, '\\s+')})(?=$|[^\\p{L}\\p{N}])`, 'iu');
      standardized = standardized.replace(candidatePattern, `$1${fuzzyMatch.canonical}`);
    }

    standardized = standardized
      .replace(/\s+([,.;:])/g, '$1')
      .replace(/([,.;:])(?=\S)/g, '$1 ')
      .replace(/\b(\d+)\s*,\s*(\d+)\s*(mg|g|ml|L|mcg)\b/gi, '$1,$2 $3')
      .replace(/\b(\d+)\s*(mg|g|ml|L|mcg)\b/gi, '$1 $2')
      .replace(/i\.\s*v\./gi, 'i.v.')
      .replace(/p\.\s*o\./gi, 'p.o.')
      .replace(/s\.\s*c\./gi, 's.c.')
      .replace(/i\.\s*m\./gi, 'i.m.')
      .replace(/p\.\s*r\./gi, 'p.r.')
      .replace(/\b(\d)\s*,\s*(\d)\s*,\s*(\d)(?:\s*,\s*(\d))?\b/g, (match, a, b, c, d) => d ? `${a},${b},${c},${d}` : `${a},${b},${c}`)
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    const confidence = classifyTherapySuggestionConfidence(match);
    const suggestedText = standardized || basicNormalized || rawText;
    const validation = validateTherapySpeechStructuredInput(suggestedText, match);
    return {
      rawText,
      normalizedText: basicNormalized,
      suggestedText,
      match,
      confidence,
      validation
    };
  }

  function insertTextAtTextareaCursor(textarea, text) {
    const cleanText = String(text || '').trim();
    if (!textarea || !cleanText) return false;

    const value = textarea.value || '';
    const start = Number.isFinite(textarea.selectionStart) ? textarea.selectionStart : value.length;
    const end = Number.isFinite(textarea.selectionEnd) ? textarea.selectionEnd : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsSeparator = before && !/[\s\n]$/.test(before) && cleanText && !/^([,.;:])/u.test(cleanText);
    const insertion = `${needsSeparator ? '\n' : ''}${cleanText}`;

    textarea.value = before + insertion + after;
    const cursor = before.length + insertion.length;
    textarea.selectionStart = cursor;
    textarea.selectionEnd = cursor;
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    if (textarea.id === 'therapy') syncTherapyEditorFromTextarea();
    return true;
  }
