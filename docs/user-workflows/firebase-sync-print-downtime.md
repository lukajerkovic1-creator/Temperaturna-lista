# Local JSON Save, Print, And Downtime

Status: working draft. Follow hospital downtime and backup policy first.

## Sync States

The patient status indicator tells the user whether the current form differs from the last explicit local save:

- empty: no current patient data;
- dirty: local changes are not saved yet;
- saving: a local file operation is in progress;
- synced: retained for legacy compatibility and must not imply online storage;
- failed: last save failed;
- offline: the network is unavailable, while the loaded app may continue locally;
- localOnly: the application uses local JSON only.

## Save

Use `Spremi JSON` for patient records and verify that the browser completed the download. There is no Firebase or other online patient save. After further edits, download a new JSON revision before relying on the file.

## Print

Before print:

1. enter the operator's full name; it exists only in the current browser tab and is not saved to JSON, browser storage, or a network service;
2. verify identity and admission date;
3. verify diagnosis, allergies, therapy, vital signs, labs, and microbiology;
4. complete all three final clinical confirmations;
5. confirm whether the latest local JSON revision has been downloaded;
6. select the correct page pair in the preview;
7. print only the currently selected pages.

If the app warns that the latest changes are not saved, download JSON or follow the explicit local-unsaved print confirmation workflow.

## Downtime

If the network is unavailable:

1. continue editing only if clinically necessary;
2. remember that no online patient storage exists even when the network is available;
3. use the approved AES-GCM encrypted downtime backup only if allowed;
4. keep its passphrase separate and store both only in approved hospital storage;
5. after restore, verify the patient and explicitly download a current local JSON file;
6. delete temporary files according to retention policy.

## Browser Draft Recovery

Production has no patient draft recovery in `localStorage`, `sessionStorage`, or IndexedDB. Startup removes both historical patient-draft keys and never restores or migrates them. Recovery is performed only by explicitly opening a previously downloaded local JSON file. The separate passphrase-protected downtime backup is also an explicit downloaded file, not a browser draft.
