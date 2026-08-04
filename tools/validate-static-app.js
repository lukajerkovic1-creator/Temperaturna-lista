const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

const requiredFiles = [
  'index.html',
  'package.json',
  'playwright.config.js',
  'firebase.json',
  'firestore.rules',
  'src/app/bootstrap.js',
  'src/app/bootstrap.qa.js',
  'src/styles/app.css',
  'assets/app-icon.png',
  'assets/temperature-list-background.jpg',
  'assets/data/therapy-database.js',
  'tools/build-bootstrap.js',
  'tools/lib/build-metadata.js',
  'tools/lint-source.js',
  'tests/unit/build-metadata.test.js',
  'tests/parser-fuzz.spec.js',
  'docs/integration/fhir-profile-manifest.v1.json',
];

const failures = [];

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function assertValidJavaScript(source, label) {
  try {
    new vm.Script(source, { filename: label });
  } catch (error) {
    failures.push(`${label} must be valid JavaScript: ${error.message}`);
  }
}

for (const relativePath of requiredFiles) {
  assert(fs.existsSync(path.join(root, relativePath)), `Missing required file: ${relativePath}`);
}

const indexPath = path.join(root, 'index.html');
const indexHtml = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';

assert(/<meta\s+charset=["']?UTF-8["']?/i.test(indexHtml), 'index.html must declare UTF-8 early.');
assert(indexHtml.includes('src/styles/app.css'), 'index.html must load src/styles/app.css.');
assert(indexHtml.includes('Lokalno spremanje: nema unesenog pacijenta.'), 'The static shell must use local-save wording before bootstrap initializes.');
assert(indexHtml.includes('href="assets/app-icon.png"'), 'index.html must use the external application icon asset.');
assert(indexHtml.includes('<script src="assets/data/therapy-database.js"></script>'), 'index.html must load the external therapy database asset.');
assert(indexHtml.indexOf('assets/data/therapy-database.js') < indexHtml.indexOf("script.src = qaEnabled"), 'The therapy database asset must load before the application bootstrap.');
assert(indexHtml.includes("script.src = qaEnabled ? 'src/app/bootstrap.qa.js' : 'src/app/bootstrap.js'"), 'index.html must select the production or local-QA bootstrap explicitly.');
assert(indexHtml.includes("'parserTestPanel'"), 'index.html must remove QA-only controls before loading the production bundle.');
assert(!indexHtml.includes('netlify'), 'index.html should not point to Netlify deployment assets.');
assert(!indexHtml.includes('data:image/'), 'index.html must not embed multi-megabyte image data URIs.');
assert(Buffer.byteLength(indexHtml, 'utf8') < 200_000, 'index.html must remain a small application shell rather than a generated single-file bundle.');

const appIcon = fs.readFileSync(path.join(root, 'assets', 'app-icon.png'));
const backgroundImage = fs.readFileSync(path.join(root, 'assets', 'temperature-list-background.jpg'));
const therapyDatabaseAsset = fs.readFileSync(path.join(root, 'assets', 'data', 'therapy-database.js'), 'utf8');
assert(appIcon.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'assets/app-icon.png must be a valid PNG asset.');
assert(appIcon.readUInt32BE(16) === 256 && appIcon.readUInt32BE(20) === 256, 'assets/app-icon.png must remain the reviewed 256x256 application icon.');
assert(appIcon.length < 150_000, 'assets/app-icon.png must remain below the 150 KB startup budget.');
assert(backgroundImage[0] === 0xff && backgroundImage[1] === 0xd8 && backgroundImage.at(-2) === 0xff && backgroundImage.at(-1) === 0xd9, 'assets/temperature-list-background.jpg must be a valid JPEG asset.');
assert(backgroundImage.length < 300_000, 'Temperature-list background must remain below the 300 KB asset budget.');
assertValidJavaScript(therapyDatabaseAsset, 'assets/data/therapy-database.js');
assert(Buffer.byteLength(therapyDatabaseAsset, 'utf8') < 3_500_000, 'Therapy database wrapper must remain below the 3.5 MB asset budget.');
const therapyAssetWindow = {};
try {
  vm.runInNewContext(therapyDatabaseAsset, { window: therapyAssetWindow }, { filename: 'assets/data/therapy-database.js' });
} catch (error) {
  failures.push(`assets/data/therapy-database.js must initialize safely: ${error.message}`);
}
const therapyBase64Chunks = therapyAssetWindow.__TEMPERATURNA_LISTA_THERAPY_CSV_BASE64__;
assert(Array.isArray(therapyBase64Chunks) && therapyBase64Chunks.length > 1, 'Therapy database asset must expose a chunked Base64 payload.');
if (Array.isArray(therapyBase64Chunks)) {
  const therapyCsvBytes = Buffer.from(therapyBase64Chunks.join(''), 'base64');
  assert(therapyCsvBytes.length === 2_332_731, 'Therapy database asset byte length must match the reviewed source dataset.');
}

const bootstrapPath = path.join(root, 'src/app/bootstrap.js');
const bootstrap = fs.existsSync(bootstrapPath) ? fs.readFileSync(bootstrapPath, 'utf8') : '';
const qaBootstrapPath = path.join(root, 'src/app/bootstrap.qa.js');
const qaBootstrap = fs.existsSync(qaBootstrapPath) ? fs.readFileSync(qaBootstrapPath, 'utf8') : '';
const firestoreRulesPath = path.join(root, 'firestore.rules');
const firestoreRules = fs.existsSync(firestoreRulesPath) ? fs.readFileSync(firestoreRulesPath, 'utf8') : '';
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const buildShaMatch = bootstrap.match(/const APP_BUILD_SHA = '([a-f0-9]{12})';/);
const qaBuildShaMatch = qaBootstrap.match(/const APP_BUILD_SHA = '([a-f0-9]{12})';/);

assert(semverPattern.test(String(packageJson.version || '')), 'package.json version must be valid SemVer.');
assert(packageLock.version === packageJson.version, 'package-lock.json root version must match package.json.');
assert(packageLock.packages?.['']?.version === packageJson.version, 'package-lock.json package version must match package.json.');
assert(packageJson.scripts?.lint === 'node tools/lint-source.js', 'package.json must expose the mandatory source lint gate.');
assert(packageJson.scripts?.test === 'node --test tests/unit/*.test.js', 'package.json must expose the mandatory Node unit-test gate.');
assert(packageJson.scripts?.['test:parser'] === 'playwright test tests/parser-fuzz.spec.js', 'package.json must expose the mandatory parser fuzz gate.');
assert(bootstrap.includes(`const APP_VERSION = '${packageJson.version}';`), 'Production bootstrap version must match package.json.');
assert(qaBootstrap.includes(`const APP_VERSION = '${packageJson.version}';`), 'QA bootstrap version must match package.json.');
assert(Boolean(buildShaMatch), 'Production bootstrap must contain a deterministic 12-character build SHA.');
assert(Boolean(qaBuildShaMatch), 'QA bootstrap must contain a deterministic 12-character build SHA.');
assert(buildShaMatch?.[1] === qaBuildShaMatch?.[1], 'Production and QA bootstraps must identify the same source build.');
assert(!bootstrap.includes('__BUILD_METADATA_APP_VERSION__') && !bootstrap.includes('__BUILD_METADATA_BUILD_SHA__'), 'Production bootstrap must not retain build metadata placeholders.');
assert(!qaBootstrap.includes('__BUILD_METADATA_APP_VERSION__') && !qaBootstrap.includes('__BUILD_METADATA_BUILD_SHA__'), 'QA bootstrap must not retain build metadata placeholders.');
assert(bootstrap.includes('window.__TEMPERATURNA_LISTA_BUILD_SHA__ = APP_BUILD_SHA;'), 'Production bootstrap must expose the runtime build SHA without rewriting its global name.');
assert(qaBootstrap.includes('window.__TEMPERATURNA_LISTA_BUILD_SHA__ = APP_BUILD_SHA;'), 'QA bootstrap must expose the runtime build SHA without rewriting its global name.');

assert(bootstrap.includes('(() => {'), 'src/app/bootstrap.js must contain the application wrapper.');
assertValidJavaScript(bootstrap, 'src/app/bootstrap.js');
assertValidJavaScript(qaBootstrap, 'src/app/bootstrap.qa.js');
assert(bootstrap.trimEnd().endsWith('})();'), 'src/app/bootstrap.js must close the application wrapper.');
assert(!bootstrap.includes('function captureParserTestCaseFromShortcut()'), 'Production bootstrap must not include parser-test capture implementation.');
assert(bootstrap.includes('function deriveDocumentModel(data)'), 'Production bootstrap must retain the shared clinical preview model.');
assert(!bootstrap.includes('function renderAdminOverlays()'), 'Production bootstrap must not include QA-only admin preview overlays.');
assert(!bootstrap.includes('function toggleAdminMode()'), 'Production bootstrap must not include the admin mode implementation.');
assert(!bootstrap.includes('function renderAdminDashboard()'), 'Production bootstrap must not include the admin dashboard implementation.');
assert(!bootstrap.includes('function populateAdminLayoutSelect()'), 'Production bootstrap must not include the calibration editor implementation.');
assert(!bootstrap.includes('function getSpeechRecognitionConstructor()'), 'Production bootstrap must not include speech recognition implementation.');
assert(!bootstrap.includes('function copyFhirBundleToClipboard('), 'Production bootstrap must not include FHIR clipboard implementation.');
assert(!bootstrap.includes('Ctrl+Alt+P parser capture'), 'Production bootstrap must not include parser capture shortcut handling.');
assert(bootstrap.includes("const appName = 'temperaturna-lista-therapy-settings';"), 'Production bootstrap may use Firebase only through the isolated non-clinical therapy-settings client.');
assert(bootstrap.includes("const THERAPY_FAVORITES_FIREBASE_DOCUMENT_ID = 'sharedTherapyFavoritesV2';"), 'Production bootstrap must pin shared therapy sync to its dedicated appConfig document.');
assert(firestoreRules.includes('match /appConfig/sharedTherapyFavoritesV2'), 'Firestore rules must isolate the shared therapy-settings document.');
assert(firestoreRules.includes("request.auth.token.email == 'luka.jerkovic1@gmail.com'"), 'Shared therapy writes must remain restricted to the reviewed administrator identity.');
assert(firestoreRules.includes('match /{document=**}') && firestoreRules.includes('allow read, write: if false;'), 'Firestore rules must remain fail-closed for every other document, including patients.');
assert(!bootstrap.includes('data:image/'), 'Production bootstrap must not contain embedded image data URIs.');
assert(!qaBootstrap.includes('data:image/'), 'QA bootstrap must not contain embedded image data URIs.');
assert(bootstrap.includes("const CLEAN_BACKGROUND_ASSET_URL = new URL('assets/temperature-list-background.jpg', document.baseURI).href;"), 'Production bootstrap must resolve the external temperature-list background asset from the document base URL.');
assert(bootstrap.includes('window.__TEMPERATURNA_LISTA_THERAPY_CSV_BASE64__'), 'Production bootstrap must consume the external therapy database asset.');
assert(bootstrap.includes('Online storage is disabled in the production bundle.'), 'Production bootstrap must contain a fail-closed online-storage client boundary.');
assert(!bootstrap.includes('const PatientDraftStorage = Object.freeze({'), 'Production bootstrap must not contain the patient browser-draft storage adapter.');
assert(!bootstrap.includes('function buildPatientDraftPayload('), 'Production bootstrap must not serialize patient data for browser storage.');
assert(!bootstrap.includes('safeLocalStorageSetItem(STORAGE_KEYS.patientDraft'), 'Production bootstrap must never write a patient draft to localStorage.');
assert(bootstrap.includes("'patient.localJsonExport'"), 'Production bootstrap must audit successful local JSON export.');
assert(bootstrap.includes("'patient.localJsonRestore'"), 'Production bootstrap must audit successful local JSON restore.');
assert(bootstrap.includes("'patient.localJsonRestoreFailed'"), 'Production bootstrap must audit rejected local JSON restore.');
assert(bootstrap.includes("status: isCurrentVersion ? 'exported' : 'dirty'"), 'Production local JSON save must bind exported state to the exact patient-data version.');
assert(bootstrap.includes("lastSaveTarget: 'local-json'"), 'Production local JSON save must identify the local JSON target.');
assert(bootstrap.includes("title: 'Lista nije spremljena u lokalni JSON'"), 'Production print must require explicit confirmation for an unsaved local-only copy.');
assert(bootstrap.includes('Lokalno spremanje: aktualna verzija nije spremljena u JSON.'), 'Production status must describe unsaved local-only data without legacy sync wording.');
assert(bootstrap.includes("if (state.patientSyncState.saveInFlight)"), 'Production local JSON save must reject duplicate in-flight save attempts.');
assert(bootstrap.includes("Pacijent neće biti spremljen jer ime i prezime nisu uneseni."), 'Production local JSON save must reject an unnamed patient.');
assert(bootstrap.includes('function purgePatientDraftBrowserStorage()'), 'Production bootstrap must purge legacy patient browser-draft keys.');
assert(bootstrap.includes('safeLocalStorageRemoveItem(STORAGE_KEYS.patientDraft);'), 'Production bootstrap must remove the encrypted patient draft key.');
assert(bootstrap.includes('safeLocalStorageRemoveItem(STORAGE_KEYS.legacyPatientDraft);'), 'Production bootstrap must remove the legacy cleartext patient draft key.');
assert(bootstrap.includes('Production patient data is persisted only through an explicit JSON file download.'), 'Production patient draft scheduling must be a documented no-op.');
assert(indexHtml.includes("'patientDraftStatusRow'"), 'Production startup must remove the patient draft status UI.');
assert(indexHtml.includes("'patientDraftControls'"), 'Production startup must remove patient browser-draft controls.');
assert(bootstrap.includes('temperaturna-lista-encrypted-downtime-backup-v2'), 'Production bootstrap must use the encrypted downtime backup schema.');
assert(bootstrap.includes('async function encryptDowntimeBackupEnvelope('), 'Production bootstrap must encrypt downtime backups before download.');
assert(bootstrap.includes("cipher: 'AES-GCM-256'"), 'Production bootstrap must identify AES-GCM-256 downtime backup encryption.');
assert(!bootstrap.includes('JSON.stringify(buildDowntimeBackupEnvelope('), 'Production bootstrap must not download a cleartext downtime backup envelope.');
assert(indexHtml.includes('id="securePassphraseInput" type="password"'), 'index.html must collect downtime backup passphrases in a password field.');
assert(indexHtml.includes('id="parserProvenancePanel"'), 'index.html must expose parser provenance before print.');
assert(!indexHtml.includes('id="clinicalPrintReview"'), 'index.html must not contain the retired final clinical confirmation block.');
assert(!indexHtml.includes('id="printOperatorName"'), 'index.html must not contain the retired print operator input.');
assert(!indexHtml.includes('id="confirmIdentityAdmission"'), 'index.html must not contain retired final confirmation checkboxes.');
assert(bootstrap.includes('temperaturna-lista-parser-provenance-v1'), 'Production bootstrap must include the field-level parser provenance schema.');
assert(!bootstrap.includes('function getUnconfirmedCriticalParserProvenanceIssues('), 'Production bootstrap must not block print on retired parser confirmation state.');
assert(!bootstrap.includes('function getClinicalOperatorName()'), 'Production bootstrap must not contain the retired print operator logic.');
assert(!bootstrap.includes("issues.push('ime i prezime operatera ispisa')"), 'Production print must not require a session operator.');
assert(!bootstrap.includes('print-page-meta'), 'Printed pages must not include a technical metadata row above the temperature-list form.');
assert(bootstrap.includes('parserProvenance: serializeCurrentParserProvenance()'), 'ClinicalRecordV1 must retain parser provenance metadata.');
assert(bootstrap.includes("const FHIR_VERSION = '4.0.1';"), 'Production bootstrap must declare the experimental FHIR R4 version.');
assert(bootstrap.includes("resourceType: 'Provenance'"), 'Production FHIR export must include Provenance.');
assert(bootstrap.includes("code: 'experimental'"), 'Production FHIR export must carry an experimental tag.');
assert(indexHtml.includes("'firebasePatientDialog'"), 'Production startup must remove the legacy Firebase patient dialog.');
assert(indexHtml.includes("'firebaseLoginGate'"), 'Production startup must remove the legacy Firebase login gate.');
assert(indexHtml.includes("'firebaseUserPanel'"), 'Production startup must remove the legacy Firebase account panel.');
assert(qaBootstrap.includes('function captureParserTestCaseFromShortcut()'), 'QA bootstrap must include parser-test capture implementation.');
assert(qaBootstrap.includes('function renderAdminOverlays()'), 'QA bootstrap must include admin preview overlays.');
assert(qaBootstrap.includes('function toggleAdminMode()'), 'QA bootstrap must include admin mode implementation.');
assert(qaBootstrap.includes('function getSpeechRecognitionConstructor()'), 'QA bootstrap must include speech recognition implementation.');
assert(qaBootstrap.includes('parseByMode: (raw, mode = PATIENT_MODES.INPATIENT)'), 'QA bootstrap must expose parser fuzz helpers only in the QA artifact.');
assert(!bootstrap.includes('parseByMode: (raw, mode = PATIENT_MODES.INPATIENT)'), 'Production bootstrap must not expose parser fuzz helpers.');

if (failures.length) {
  console.error('Static app validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Static app validation passed.');
