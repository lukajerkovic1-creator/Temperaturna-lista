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
| Local patient JSON files | 90 days | Technical default used for encrypted downtime backup expiry; deletion of regular downloaded JSON files depends on the approved workstation/file procedure. |
| Encrypted local draft | 12 hours | Local encrypted draft expires and is removed/refused after TTL. |
| Parser test cases | 30 days | Local parser test captures must be synthetic or anonymized and are outside the clinical patient-save workflow. |
| Non-PHI operational audit events | 3650 days | Browser audit stores event type/time/build only; it contains no patient identifier or clinical text. |

## Open Decisions

- How downloaded patient JSON files are inventoried and securely deleted after the approved period.
- Whether audit retention must follow a longer statutory hospital record retention period.
- Whether AES-GCM encrypted downtime backup JSON files are allowed, how passphrases are transferred and where files may be stored.
- Who may restore archived patients and under what documented reason.

## Operational Rule

Do not use these defaults with real patients until the DPO/legal/IT review confirms the retention schedule, endpoint encryption, approved folders, secure deletion and passphrase procedure.
