# Audit

This audit tracks code-solvable P0/P1/P2 findings for the Temperaturna lista app. It does not claim clinical, legal, DPO, hospital IT, or production readiness.

| ID | Priority | Evidence | Risk | Reproduction | Plan | Status | Regression test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-P0-001 | P0 | `src/print/50-print-layout.js` allowed `printPages()` to proceed while `state.admin.enabled` was true. | A clinical printout could be produced from service/admin calibration mode without a hard stop. | Sign in as Luka/admin in the smoke client, open admin mode with `Ctrl+Alt+A`, click print. Before the fix the print workflow continued. | Add an early print guard that blocks service/admin mode and surfaces a visible error; add a Playwright regression test. | Closed in code; production audit remains open until a full P0/P1/P2 pass and hospital governance review. | `tests/github-pages.smoke.spec.js` -> `blocks printing while admin service mode is active` |
| AUD-P0-002 | P0 | `src/print/50-print-layout.js` displayed a print confirmation with `Nastavi ispis` when `state.lastTextOverflowWarnings` was non-empty. | A clinical printout could be produced even after the app detected text overflow into constrained list fields. | Create or inject an overflow warning, click print. Before the fix the workflow offered a continue path. | Convert overflow from confirmable warning to hard-stop; update overflow wording and add Playwright regression. | Closed in code; production audit remains open until full print/PDF regression coverage is complete. | `tests/github-pages.smoke.spec.js` -> `blocks printing when text overflow warnings are present` |
| AUD-P0-003 | P0 | `printPages()` relied on checklist UI but did not centrally block printing when required clinical prerequisites were missing. | A list could be printed without confirmed identifiers, encounter/admission date, diagnosis, allergy status, or therapy. | Fill only partial patient data and click print. Before the fix the workflow could continue to save/print confirmation instead of stopping. | Add a central print prerequisite guard and a Playwright regression that verifies no print occurs. | Closed in code; broader clinical validation and hospital governance remain production blockers. | `tests/github-pages.smoke.spec.js` -> `blocks printing when required clinical prerequisites are missing` |
| AUD-P0-004 | P0 | The form/model/print path did not carry a dedicated patient identifier or encounter/protocol identifier, and print pages lacked audit metadata. | Printed or exported lists could be harder to reconcile to the intended patient encounter, especially after local-only JSON workflows or multi-page prints. | Open a patient without MBO/MRN or protocol ID and print; before the fix the print path did not hard-stop on those missing identifiers and pages did not show the local app/version/sync metadata. | Add explicit MBO/MRN, encounter/protocol, room and bed fields; carry them into JSON, ClinicalRecordV1 and FHIR; hard-stop print when patient/encounter identifiers are missing; stamp print pages with metadata. | Closed in code; hospital-approved identifier policy and print-layout review remain production blockers. | `tests/github-pages.smoke.spec.js` -> `blocks printing when required clinical prerequisites are missing`, `builds ClinicalRecordV1, medication safety warnings and a basic FHIR Bundle`, `navigates preview page pairs and prints only the active pair` |

## Open Production Blockers

- Hospital DPO/legal/IT validation is not proven by this repository audit.
- Client-side checks are not a security boundary; production authorization must be enforced by server-side rules or an approved offline-only deployment model.
- Parser clinical correctness and medication validation require clinical validation before real patient use.
- Printed output still requires hospital review of identity, encounter, downtime, and version metadata across all page modes.

## Audit Log

- 2026-07-13: Started iterative P0/P1/P2 audit. First closed code finding: service/admin mode print block (`AUD-P0-001`).
- 2026-07-13: Closed code finding AUD-P0-002: text overflow warnings are now print hard-stops, not confirmable warnings.
- 2026-07-13: Closed code finding AUD-P0-003: print now hard-stops when required clinical prerequisites are missing.
- 2026-07-13: Closed code finding AUD-P0-004: patient identifier, encounter/protocol, room/bed and print-page metadata now flow through form data, JSON, ClinicalRecordV1/FHIR and print guards.
