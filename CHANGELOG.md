# Changelog

All notable changes to this project should be documented here.

The format follows Keep a Changelog, and release tags should use semantic
versioning such as `v0.1.0`.

## [Unreleased]

### Added

- CI workflow for pull requests and pushes to `main`.
- Release workflow for version tags.
- Static app validation and basic security smoke checks.
- Initial TypeScript typecheck gate.
- Playwright quality suites for security, accessibility, privacy and performance regressions.
- MBO/MRN, encounter/protocol, room and bed fields in the patient form, local JSON payload, ClinicalRecordV1 and FHIR export.
- Print-page metadata with patient, encounter, room/bed, app version, build, sync state and user context.
- Session-only final clinical review controls for identity/encounter, allergy status and critical diagnosis/medication fields. Confirmations are bound to hashed data signatures and are not persisted.
- Field-level parser provenance with bounded source excerpts, confidence, parser version, value hashes and visible confirmation status for automatically populated clinical fields.
- Mandatory dependency-free source linting and Node unit tests for SemVer validation and deterministic build fingerprints; CI can no longer skip either gate when a package script is missing.
- Deterministic parser fuzz/property coverage for synthetic OHBP records: harmless formatting mutations must preserve critical fields, and bounded random input must never throw or return an invalid result shape. The parser test API exists only in the localhost QA bundle.
- Experimental FHIR R4 4.0.1 profile manifest, resource-level profile tags, export `Provenance`, internal-reference validation and positive/negative synthetic fixture checks. Documentation explicitly states that this is not an official HL7 or hospital profile validation.
- Fingerprinted static asset boundary for the application icon, blank form background and local medication database, including file-signature, load-order, decoded-byte and size-budget validation.
- Required session-only print operator identity. It binds final clinical/parser confirmations to a named operator and is never saved to JSON, browser storage, or a network service.
- A pre-print identifier warning that lists unavailable MBO/MRN and encounter/protocol numbers and requires an explicit `Nastavi bez broja` confirmation.

### Changed

- Application version now comes from `package.json` (`0.4.0`), and the build injects one deterministic 12-character source fingerprint into the production and QA artifacts. The same version/build identity is shown in the UI and carried by local JSON, encrypted recovery, local operational audit and ClinicalRecordV1 metadata.
- The generated browser bootstrap is split into a clinical production bundle and an explicit localhost QA bundle. Admin/calibration, parser-test capture, speech recognition and FHIR clipboard implementation code exists only in the QA artifact.
- Medication lines without a recognizable dose or route are critical validation findings. Common oral dosage forms such as tablets and capsules imply the oral route for validation purposes.
- Local JSON-only availability status now explicitly identifies offline operation and instructs the user to save patient data manually to JSON; Firebase patient storage remains identified as disabled rather than unavailable.
- Historical Firebase patient-storage smoke scenarios are retained as explicitly skipped documentation after the local-only policy change, while active tests continue to prove that patient and parser-test workflows do not write to Firebase.
- Admin print calibration now persists only in local browser settings; it no longer reads or writes the Firestore `appConfig` document.
- The separate downtime backup workflow now asks for a passphrase in a password dialog and uses identity-free filenames. Regular user-requested local patient JSON save/open remains unchanged.
- `index.html` is now a small application shell rather than a duplicated single-file payload. Images and the local medication alias dataset load from `assets/`, while their bytes remain part of the deterministic build SHA.
- Production persistence is now strictly manual local JSON file download/upload. The former optional encrypted browser patient draft remains available only in the synthetic localhost QA artifact.
- Missing patient or encounter numbers no longer block an otherwise valid print, and all missing clinical data remains listed in the explicit pre-print warning.
- All pre-print validation findings are now warnings rather than hard stops. Missing or unconfirmed clinical data, text overflow and service/admin mode are collected in one dialog that always offers `Svejedno ispiši`; cancelling leaves the form unchanged for correction.
- Removed the technical metadata row above every printed temperature-list page. The form image now uses the complete A4 landscape page without an added patient/version/build/sync line.
- GitHub Pages deployment now uses the official artifact-based Actions workflow instead of the intermittently stuck legacy branch builder.

### Fixed

- Local JSON export now records an exact-version `exported/local-json` state, changes after export become visibly unsaved, duplicate save attempts are serialized, and unnamed patients are rejected instead of producing ambiguous files.
- Local-only printing now requires an explicit confirmation when the current patient version has not been exported to JSON; an unchanged exported version prints without the unsaved-copy warning.
- Restored the complete reviewed medication dataset after detecting that the former inline Base64 array had lost 439 chunks. The application now loads all 10,257 medication aliases and the smoke test asserts that full count.
- Resolved blank-form and print asset URLs from the document base URL so local preview, GitHub Pages and the print iframe do not emit missing-resource errors.
- Build metadata injection no longer rewrites the runtime build-global name into invalid JavaScript. Static validation now syntax-parses both generated bundles before a build can pass.
- Continuation-page selection still preserves the actual document sequence internally while printing only the active page pair.
- Regular local JSON export, successful restore and rejected restore now add bounded non-PHI operational audit events; filenames, patient identifiers and clinical text are deliberately excluded.
- OHBP parser now continues past overly broad leading text and correctly recognizes patient names from synthetic lines such as `TESTIC PARSERICA, rođena ...`, while keeping protocol and MBOO identifiers.

### Security

- Release candidates now run a basic secret/credential smoke check before a
  GitHub release is created.
- Pre-print checks remain visible and explicit, but no validation finding silently prevents urgent printing. The user must choose between returning to the form and `Svejedno ispiši`.
- Added a fail-closed production runtime policy that blocks admin shortcuts,
  parser-test capture, therapy speech input and FHIR clipboard export at both
  the UI and function-handler layers, and removes production browser test hooks.
- Production startup no longer mounts admin, parser-test, speech or FHIR
  clipboard controls; static build validation fails if their implementation or
  hidden development shortcuts reappear in `src/app/bootstrap.js`.
- Clinical printing now requires explicit final review confirmations and no
  critical structured record or medication-safety findings. Relevant form
  changes automatically invalidate the corresponding confirmation.
- The production bundle no longer contains a Firebase SDK import and replaces
  its online-storage client boundary with a fail-closed stub. Production startup
  removes legacy Firebase login, patient and account controls rather than merely
  hiding them. Local JSON save has a desktop/mobile network regression proving
  no request reaches Firebase, Firestore, Google APIs or the Firebase SDK CDN.
- Firestore deny-all rules were deployed to `temperaturna-lista-dev`; the
  all-collections deletion command completed without reporting a remaining
  collection.
- Downtime backups now encrypt the complete patient payload with AES-GCM-256
  and a PBKDF2/SHA-256 passphrase-derived key using a random salt and IV.
  Passphrases and derived keys are not stored; expired, tampered and legacy
  cleartext downtime backups are rejected. Export, failed restore, successful
  restore and print events use a bounded local operational audit containing no
  patient identifier or clinical text.
- Critical parsed identity, encounter/date, allergy and medication fields now
  independently block printing until their current value is confirmed. The
  confirmation records local actor/time for the session, is invalidated after
  edits and is deliberately reset when provenance is restored from local JSON
  or encrypted recovery.
