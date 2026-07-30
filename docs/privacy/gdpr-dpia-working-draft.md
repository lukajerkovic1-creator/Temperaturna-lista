# GDPR/DPIA Working Draft

Status: working draft. This is not legal advice and does not certify compliance. It must be reviewed by the DPO, legal service, hospital information security, and clinical leadership before production use with real patients.

## Processing Context

Temperaturna lista is a browser application for preparing a temperature chart and related clinical working notes. It may process patient identifiers, admission dates, diagnoses, therapy, allergies, laboratory text, microbiology, vital signs, and operational metadata.

The intended production deployment must define:

- data controller and processor roles;
- approved local workstation and storage locations;
- authorized hospital departments and users of downloaded files;
- support and incident contacts;
- backup and downtime procedure;
- retention and deletion procedure.

## Main Privacy Risks

- Real patient data entered in a browser can be exposed if stored in cleartext browser storage.
- Accidental reintroduction of online patient storage can expose records outside the approved local workflow.
- Manual JSON backups can leave the controlled hospital environment.
- Parser regression cases can accidentally contain real clinical text.
- Shared workstations can expose logged-in sessions.
- Print/export actions can create uncontrolled paper or file copies.

## Current Technical Controls

- Local patient auto-save is disabled by default.
- Optional local recovery uses encrypted storage with a user-provided passphrase.
- Production patient storage is local-JSON-only; Firebase patient reads and writes are disabled in the bundle and Firestore rules are fail-closed.
- Print retains clinical validation warnings and requires an explicit local-unsaved decision when applicable.
- Downtime backup files use AES-GCM with a PBKDF2/SHA-256 passphrase-derived key and are not silently stored in browser storage.
- Downtime backup filenames do not contain patient identity; legacy cleartext downtime backups are rejected.

## Required Review Before Real Use

- Confirm that Firestore deny-all rules remain deployed and online patient storage is not reintroduced.
- Confirm workstation identity, access control, approved local folders, endpoint encryption, backup handling, and session policy.
- Confirm workstation security, screen lock, browser profile, and shared device procedures.
- Confirm retention requirements with hospital policy and local law.
- Confirm that export/import workflows are allowed and define approved storage locations.
- Confirm incident response: lost backup, wrong recipient, unauthorized access, failed sync, and printer error.
