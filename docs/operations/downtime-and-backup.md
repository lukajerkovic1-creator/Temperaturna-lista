# Downtime And Backup Procedure

Status: working draft. This procedure must be reviewed by hospital IT/security before real production use.

## Downtime Mode

The application shows a central availability status:

- network status: online/offline;
- Firebase status: available/unavailable/unknown;
- app shell status: loaded/degraded;
- last successful Firebase check;
- last error.

When the browser is offline or Firebase is unavailable, Firebase save/open actions are not considered safe sync. Local cleartext auto-save remains disabled. Optional local recovery remains encrypted and time-limited.

## User Procedure During Downtime

1. Continue editing only if clinically necessary.
2. Do not assume the current patient is saved unless the sync indicator says it is saved in Firebase.
3. If data must be preserved during downtime, use `Preuzmi downtime backup`.
4. Store the backup only in an approved hospital location.
5. When Firebase returns, restore the backup through the JSON import workflow, verify the patient, and save to Firebase.
6. Delete the manual backup according to hospital policy after verified restore.

## Backup JSON

Downtime backup uses schema `temperaturna-lista-downtime-backup-v1`.

It contains:

- app version;
- exported timestamp;
- retention policy snapshot;
- availability status at export time;
- limited auth context metadata;
- current patient form data.

It is not encrypted by the app. Treat the downloaded file as PHI/PII.

## Restore

The import workflow accepts downtime backup JSON only when the schema and authorized-use flags are present. Restore does not silently mark the patient as Firebase-synced. The user must verify and save to Firebase.

## Admin Notes

- Test downtime by simulating browser offline mode and Firebase permission failures.
- Confirm Firestore rules before enabling real deployment.
- Confirm approved storage for backup files.
- Confirm who may perform restore and who reviews audit events after downtime.

