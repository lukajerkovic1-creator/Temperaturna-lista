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

### Changed

### Fixed

### Security

- Release candidates now run a basic secret/credential smoke check before a
  GitHub release is created.
