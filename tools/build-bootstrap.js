const fs = require('fs');
const path = require('path');
const { assertSemVer, calculateBuildSha } = require('./lib/build-metadata');

const root = path.resolve(__dirname, '..');
const productionBundlePath = path.join(root, 'src', 'app', 'bootstrap.js');
const qaBundlePath = path.join(root, 'src', 'app', 'bootstrap.qa.js');

const productionModules = [
  'src/app/00-core-ui-state.js',
  'src/clinical/10-therapy-validation.js',
  'src/parser/20-ohbp-parser.js',
  'src/parser/30-parser-tests.js',
  'src/ui/40-rendering-ui.js',
  'src/print/50-print-layout.js',
  'src/ui/60-speech-ui-and-events.js',
];

const qaModules = [
  'src/app/00-core-ui-state.js',
  'src/clinical/10-therapy-validation.js',
  'src/parser/20-ohbp-parser.js',
  'src/parser/30-parser-tests.js',
  'src/ui/40-rendering-ui.js',
  'src/print/50-print-layout.js',
  'src/ui/60-speech-ui-and-events.js',
];

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appVersion = assertSemVer(packageJson.version);

const buildHashInputs = [
  ...new Set([...productionModules, ...qaModules]),
  'index.html',
  'src/styles/app.css',
  'assets/app-icon.png',
  'assets/temperature-list-background.jpg',
  'assets/data/therapy-database.js',
  'tools/build-bootstrap.js',
  'tools/lib/build-metadata.js'
];
const binaryBuildHashExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const buildSha = calculateBuildSha({
  version: appVersion,
  entries: buildHashInputs.map(relativePath => ({
    path: relativePath,
    content: binaryBuildHashExtensions.has(path.extname(relativePath).toLowerCase())
      ? fs.readFileSync(path.join(root, relativePath))
      : fs.readFileSync(path.join(root, relativePath), 'utf8')
  }))
});

function injectBuildMetadata(source) {
  return source
    .replaceAll('__BUILD_METADATA_APP_VERSION__', appVersion)
    .replaceAll('__BUILD_METADATA_BUILD_SHA__', buildSha);
}

function readModule(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing module source: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8').replace(/\r\n?/g, '\n');
}

function sliceRequiredSection(source, startMarker, label) {
  const startIndex = source.indexOf(startMarker);
  if (startIndex < 0) {
    throw new Error(`Missing ${label} start marker: ${startMarker}`);
  }
  return source.slice(startIndex);
}

function removeRequiredSection(source, startMarker, endMarker, label) {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${label} markers.`);
  }
  return `${source.slice(0, startIndex)}${source.slice(endIndex)}`;
}

function replaceRequiredSection(source, startMarker, endMarker, replacement, label) {
  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker, startIndex + startMarker.length);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`Missing or invalid ${label} markers.`);
  }
  return `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
}

function sliceBeforeRequiredMarker(source, endMarker, label) {
  const endIndex = source.indexOf(endMarker);
  if (endIndex < 0) {
    throw new Error(`Missing ${label} end marker: ${endMarker}`);
  }
  return source.slice(0, endIndex);
}

function buildProductionModule(relativePath) {
  let source = readModule(relativePath);
  if (relativePath === 'src/clinical/10-therapy-validation.js') {
    source = removeRequiredSection(
      source,
      '  function populateAdminLayoutSelect() {',
      '  function setStatus(message, isError = false) {',
      'QA-only print calibration editor'
    );
    source = removeRequiredSection(
      source,
      '  async function copyFhirBundleToClipboard(',
      '  function exposeClinicalRecordHelpers() {',
      'QA-only FHIR clipboard export'
    );
  }
  if (relativePath === 'src/parser/30-parser-tests.js') {
    source = sliceRequiredSection(
      source,
      '  function escapeRegex(value) {',
      'shared parser formatting and preview renderer'
    );
    source = removeRequiredSection(
      source,
      '  function handleAdminFieldSelection(event, layoutKey, fieldPath) {',
      '  function collectTextOverflowWarnings(model) {',
      'QA-only admin preview overlays'
    );
  }
  if (relativePath === 'src/ui/40-rendering-ui.js') {
    source = replaceRequiredSection(
      source,
      '  function getPatientDraftDataSignature(data) {',
      '  function downloadPatientBackupData() {',
      `  function purgePatientDraftBrowserStorage() {\n    safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);\n    safeLocalStorageRemoveItem(STORAGE_KEYS.legacyPatientDraft);\n  }\n\n  function readPatientDraftFromStorage() {\n    return null;\n  }\n\n  function resetPatientDraftRuntimeState() {\n    window.clearTimeout(state.patientDraft.saveTimer);\n    state.patientDraft.saveTimer = null;\n    state.patientDraft.lastSavedAt = '';\n    state.patientDraft.suppressSave = false;\n    state.patientDraft.mode = PATIENT_DRAFT_STORAGE_MODES.DISABLED;\n    state.patientDraft.cryptoKey = null;\n    state.patientDraft.expiresAt = '';\n    state.patientDraft.saveInFlight = false;\n    state.patientDraft.pendingSave = false;\n  }\n\n  function updatePatientDraftControls() {\n    if (els.downloadPatientBackupBtn) {\n      els.downloadPatientBackupBtn.disabled = !isPatientDataDifferentFromEmpty(getFormData());\n    }\n  }\n\n  async function savePatientDraftNow() {\n    return false;\n  }\n\n  function schedulePatientDraftSave() {\n    // Production patient data is persisted only through an explicit JSON file download.\n  }\n\n  function clearPatientDraft(options = {}) {\n    purgePatientDraftBrowserStorage();\n    resetPatientDraftRuntimeState();\n    if (!options.quiet) {\n      setStatus('Browser draft je obrisan. Pacijenta spremite samo kao lokalnu JSON datoteku.');\n    }\n    return true;\n  }\n\n  async function restorePatientDraftFromStorage() {\n    clearPatientDraft({ quiet: true });\n    setStatus('Vraćanje pacijenta iz browser storagea nije dopušteno. Učitajte lokalnu JSON datoteku.', true);\n    return false;\n  }\n\n  function restorePatientDraftOnStartup() {\n    clearPatientDraft({ quiet: true });\n    return false;\n  }\n\n  async function enableEncryptedPatientDraftRecovery() {\n    clearPatientDraft({ quiet: true });\n    setStatus('Trajni browser draft nije dopušten. Pacijenta spremite samo kao lokalnu JSON datoteku.', true);\n    return false;\n  }\n\n`,
      'production patient browser-draft storage'
    );
    source = replaceRequiredSection(
      source,
      '  async function getFirebasePatientsClient() {',
      '  async function saveCalibrationToLocalApp() {',
      `  async function getFirebasePatientsClient() {\n    const error = new Error('Online storage is disabled in the production bundle.');\n    error.code = 'online-storage-disabled';\n    throw error;\n  }\n\n`,
      'production online-storage client'
    );
    source = removeRequiredSection(
      source,
      '  function isSuperAdmin(authContext = getFirebaseAuthContext()) {',
      '  function getClinicalPartitionKey(authContext = getFirebaseAuthContext()) {',
      'QA-only admin access UI'
    );
    source = removeRequiredSection(
      source,
      '  function canRecoverAdminFirebasePatientPayload(payload = {}, authContext = getFirebaseAuthContext()) {',
      '  function getFirebaseClinicalContextErrorMessage() {',
      'QA-only unrestricted legacy recovery helper'
    );
    source = removeRequiredSection(
      source,
      "  function setAdminDashboardStatus(message, tone = 'neutral') {",
      "  function renderFirebasePatientList(preferredId = '') {",
      'QA-only admin dashboard'
    );
    source = removeRequiredSection(
      source,
      '  async function saveCalibrationToLocalApp() {',
      '  function setFirebaseUserProfileReady(profile) {',
      'QA-only local print calibration editor persistence'
    );
    source = removeRequiredSection(
      source,
      '  async function queryAdminRecoverableFirebasePatientSnapshots(client) {',
      '  async function refreshFirebasePatients(options = {}) {',
      'QA-only admin patient recovery query'
    );
    source = removeRequiredSection(
      source,
      '  async function saveCalibration() {',
      '  async function renderCanvasesForExport() {',
      'QA-only calibration import and export'
    );
  }
  if (relativePath === 'src/print/50-print-layout.js') {
    source = sliceBeforeRequiredMarker(
      source,
      '  function isAdminCloseDialogVisible() {',
      'QA-only admin dialogs and speech implementation'
    );
  }
  if (relativePath === 'src/ui/60-speech-ui-and-events.js') {
    source = sliceRequiredSection(source, '  function onFormChanged() {', 'production form events');
    source = removeRequiredSection(
      source,
      '  function handlePointerMove(event) {',
      '  function onKeyDown(event) {',
      'QA-only calibration pointer and nudge handlers'
    );
    source = removeRequiredSection(
      source,
      '    const isAdminShortcut = (event.ctrlKey || event.metaKey) && event.altKey && event.code === \'KeyA\';',
      '    if (!state.admin.enabled) return;',
      'QA-only keyboard shortcuts'
    );
    source = removeRequiredSection(
      source,
      "    if (els.copyFhirBundleBtn) els.copyFhirBundleBtn.addEventListener('click', () => {",
      "    if (els.loadDowntimeBackupBtn) els.loadDowntimeBackupBtn.addEventListener('click', () => {",
      'QA-only FHIR clipboard handler'
    );
    source = removeRequiredSection(
      source,
      "    if (isCapabilityEnabled('adminDashboard')) {\n    if (els.adminToggleBtn)",
      "    els.loadDataInput.addEventListener('change', (event) => {",
      'QA-only admin and parser event bindings'
    );
    source = removeRequiredSection(
      source,
      "    if (isCapabilityEnabled('adminDashboard')) {\n    els.loadCalibrationInput.addEventListener('change', (event) => {",
      "    window.addEventListener('keydown', onKeyDown);",
      'QA-only calibration event bindings'
    );
    source = removeRequiredSection(
      source,
      '  function liftAdminPanelAboveApp() {',
      '  async function init() {',
      'QA-only admin panel bootstrap helper'
    );
  }
  return injectBuildMetadata(source);
}

function buildQaModule(relativePath) {
  return injectBuildMetadata(readModule(relativePath));
}

function buildBundle(modules, readSource = readModule) {
  const bundle = modules.map(readSource).join('');
  if (!bundle.includes('(() => {')) {
    throw new Error('Bootstrap bundle is missing its application wrapper.');
  }
  if (!bundle.trimEnd().endsWith('})();')) {
    throw new Error('Bootstrap bundle is missing its closing application wrapper.');
  }
  return `${bundle.trimEnd()}\n`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const nextProductionBundle = buildBundle(productionModules, buildProductionModule);
  const nextQaBundle = buildBundle(qaModules, buildQaModule);

  if (checkOnly) {
    const currentProductionBundle = fs.existsSync(productionBundlePath) ? fs.readFileSync(productionBundlePath, 'utf8') : '';
    const currentQaBundle = fs.existsSync(qaBundlePath) ? fs.readFileSync(qaBundlePath, 'utf8') : '';
    if (currentProductionBundle !== nextProductionBundle || currentQaBundle !== nextQaBundle) {
      console.error('Production or QA bootstrap bundle is not in sync with the module sources.');
      console.error('Run: npm run build:bootstrap');
      process.exit(1);
    }
    console.log('Production and QA bootstrap bundles are in sync with module sources.');
    return;
  }

  fs.writeFileSync(productionBundlePath, nextProductionBundle, 'utf8');
  fs.writeFileSync(qaBundlePath, nextQaBundle, 'utf8');
  console.log(`Wrote ${path.relative(root, productionBundlePath)} from ${productionModules.length} production module sources (v${appVersion}, build ${buildSha}).`);
  console.log(`Wrote ${path.relative(root, qaBundlePath)} from ${qaModules.length} QA module sources (v${appVersion}, build ${buildSha}).`);
}

main();
