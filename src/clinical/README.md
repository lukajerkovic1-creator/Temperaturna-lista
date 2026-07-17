# Clinical

Clinical data adapters and checks live here.

Current source:

- `10-therapy-validation.js`

This transitional module currently contains the clinical record model adapter,
validation engine, medication autocomplete support, medication safety checks,
FHIR export helpers, hashes used for sync/conflict detection, and clinical test
exposure. FHIR helpers should move to `src/integration/` in a later focused
refactor.
