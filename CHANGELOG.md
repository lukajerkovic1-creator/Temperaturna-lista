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

### Changed

### Fixed

- OHBP parser now continues past overly broad leading text and correctly recognizes patient names from synthetic lines such as `TESTIC PARSERICA, rođena ...`, while keeping protocol and MBOO identifiers.

### Security

- Release candidates now run a basic secret/credential smoke check before a
  GitHub release is created.
- Blocked clinical printing while admin/service mode is active; users must exit
  service mode before producing a clinical printout.
- Blocked clinical printing when text overflow warnings are present; overflow
  must be fixed before print can proceed.
- Blocked clinical printing until required patient identifiers, encounter date,
  diagnosis, allergy status and therapy are explicitly present.
- Blocked clinical printing until MBO/MRN or equivalent patient identifier and
  encounter/protocol identifier are explicitly present.
