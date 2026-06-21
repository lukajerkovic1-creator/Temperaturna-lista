# TypeScript type layer

This folder contains the first TypeScript contracts for the application.

The browser runtime still uses the existing JavaScript bundle. These files are
type-only and are meant to support gradual migration of one module at a time.

Covered areas:

- clinical record and patient state
- validation and medication safety results
- Firebase patient payloads, audit events and access context
- parser results and sanitized parser regression cases
- FHIR-compatible export structures

Do not store secrets, passphrases or real patient examples in these files.
