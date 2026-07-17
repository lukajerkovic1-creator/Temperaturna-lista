# Retention Policy Working Draft

Status: working draft. The values below are technical defaults, not legal approval.

The application centralizes current retention defaults in `RETENTION_POLICY`:

```js
const RETENTION_POLICY = {
  patientDays: 90,
  localDraftHours: 12,
  parserTestDays: 30,
  auditDays: 3650
};
```

## Current Defaults

| Data type | Default | Technical behavior |
| --- | ---: | --- |
| Firebase patient records | 90 days | Active records receive `expiresAt`; expired records are archived/soft-deleted by the client when encountered. |
| Encrypted local draft | 12 hours | Local encrypted draft expires and is removed/refused after TTL. |
| Parser test cases | 30 days | Firebase parser test payload receives `expiresAt`; test cases must be synthetic or anonymized. |
| Audit events | 3650 days | Long retention for accountability; deletion/export requires administrator policy. |

## Open Decisions

- Whether patient records must be archived, deleted, or exported to another official hospital system after 90 days.
- Whether audit retention must follow a longer statutory hospital record retention period.
- Whether downtime backup JSON files are allowed and where they may be stored.
- Who may restore archived patients and under what documented reason.

## Operational Rule

Do not use these defaults with real patients until the DPO/legal/IT review confirms the retention schedule and Firebase TTL/index/rules configuration.

