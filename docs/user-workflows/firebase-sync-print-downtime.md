# Firebase Sync, Print, And Downtime

Status: working draft. Follow hospital downtime and backup policy first.

## Sync States

The patient sync indicator tells the user whether the current form is safe to rely on:

- empty: no current patient data;
- dirty: local changes are not saved yet;
- saving: Firebase save is in progress;
- synced: Firebase save completed;
- failed: last save failed;
- offline: browser or Firebase is unavailable;
- localOnly: the user is working without Firebase sync.

## Save

Use Firebase save for patient records. Wait for a synced status before assuming the patient is stored. If saving fails, do not print silently; resolve the error or explicitly confirm a local-unsynced print when the app asks.

## Print

Before print:

1. verify identity and admission date;
2. verify diagnosis, allergies, therapy, vital signs, labs, and microbiology;
3. confirm sync state;
4. select the correct page pair in the preview;
5. print only the currently selected pages.

If the app warns that the patient is not synchronized, do not continue unless downtime procedure requires a local copy.

## Downtime

If Firebase or network is unavailable:

1. continue editing only if clinically necessary;
2. do not assume Firebase has saved anything;
3. use the approved downtime backup export only if allowed;
4. store backup files only in approved hospital storage;
5. restore and save to Firebase when service returns;
6. delete temporary backup files according to retention policy.

## Local Draft Recovery

Local cleartext auto-save is disabled. Optional local recovery, when enabled, is encrypted with a user passphrase and expires after the configured TTL. The passphrase is not stored by the app. If the passphrase is forgotten, the encrypted local draft cannot be restored.

