# Downtime And Backup Procedure

Status: working draft. This procedure must be reviewed by hospital IT/security before real production use.

## Downtime Mode

The application shows a central availability status:

- network status: online/offline;
- online patient storage status: disabled;
- app shell status: loaded/degraded;
- last error.

Patient storage is local-JSON-only whether the browser is online or offline. Local cleartext auto-save remains disabled. Optional local recovery remains encrypted and time-limited.

## User Procedure During Downtime

1. Continue editing only if clinically necessary.
2. Do not assume the current patient is saved until a local JSON download has completed.
3. Use normal `Spremi JSON` for the regular local patient file.
4. If a separate downtime copy is required, use `Preuzmi šifrirani backup`, set a unique passphrase of at least 12 characters, and keep the passphrase separately.
5. Store files only in an approved hospital location and verify the patient after restore.
6. Delete temporary files according to the approved retention policy.

## Backup JSON

Downtime backup uses schema `temperaturna-lista-encrypted-downtime-backup-v2`.

Visible envelope metadata contains only:

- app version;
- exported timestamp;
- expiry timestamp;
- AES-GCM and PBKDF2 parameters;
- random salt and IV;
- encrypted payload.

Patient and clinical data are inside the AES-GCM encrypted payload. PBKDF2/SHA-256 derives the key from the passphrase; neither the passphrase nor key is stored. The filename contains no patient identity. A forgotten passphrase cannot be recovered.

## Restore

Restore requires the correct passphrase and rejects expired, malformed, legacy cleartext, or tampered backup files. Restored data remain local and unsaved until the user explicitly downloads the regular patient JSON.

## Local Operational Audit

Successful regular JSON export, regular JSON restore, rejected JSON restore,
encrypted downtime export/restore and print create a bounded local operational
event. The event contains only event type, timestamp, app version/build,
trigger and outcome. It never contains patient identity, filename, identifiers,
diagnosis, therapy or other clinical text. This browser-local log is not an
immutable institutional audit trail and must not be treated as one.

## Admin Notes

- Test downtime by simulating browser offline mode and loss of the GitHub Pages connection after the app shell has loaded.
- Keep Firestore rules fail-closed; patient storage must not be re-enabled from client code.
- Confirm approved storage for backup files.
- Confirm who may perform restore and who reviews audit events after downtime.
