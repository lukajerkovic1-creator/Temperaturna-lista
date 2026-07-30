# Legacy Patient Import

Status: technical migration note.

The active patient model stores only fields currently supported by the form and
local export workflow. Retired hospital identification and location fields are
not part of the DOM, parser output, ClinicalRecordV1, FHIR export, preview, print
or PDF pipeline.

Old local JSON backups remain importable. Before schema validation, the single
`sanitizeLegacyPatientDataForImport` boundary recursively removes retired keys.
The remaining supported patient data is validated and loaded normally. Saving
the imported patient produces a clean current-schema file, so retired values
cannot return on the next import.

The sanitizer is intentionally one-way. It does not show, migrate, log or retain
discarded values, and no other production module may interpret those legacy
keys.
