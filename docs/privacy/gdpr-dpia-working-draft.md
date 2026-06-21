# GDPR/DPIA Working Draft

Status: working draft. This is not legal advice and does not certify compliance. It must be reviewed by the DPO, legal service, hospital information security, and clinical leadership before production use with real patients.

## Processing Context

Temperaturna lista is a browser application for preparing a temperature chart and related clinical working notes. It may process patient identifiers, admission dates, diagnoses, therapy, allergies, laboratory text, microbiology, vital signs, and operational metadata.

The intended production deployment must define:

- data controller and processor roles;
- approved Firebase project and region;
- authorized hospital departments and users;
- role-based access rules;
- support and incident contacts;
- backup and downtime procedure;
- retention and deletion procedure.

## Main Privacy Risks

- Real patient data entered in a browser can be exposed if stored in cleartext browser storage.
- Incorrect Firebase rules can expose records across users, departments, or organizations.
- Manual JSON backups can leave the controlled hospital environment.
- Parser regression cases can accidentally contain real clinical text.
- Shared workstations can expose logged-in sessions.
- Print/export actions can create uncontrolled paper or file copies.

## Current Technical Controls

- Local patient auto-save is disabled by default.
- Optional local recovery uses encrypted storage with a user-provided passphrase.
- Firebase patient records are scoped by organization, ward, roles, and clinical partition.
- Patient delete is implemented as soft-delete/archive with audit events.
- Print requires Firebase sync or explicit confirmation for a local unsynced copy.
- Downtime backup files are explicit JSON exports and are not silently stored in browser storage.

## Required Review Before Real Use

- Confirm Firebase Authentication provider, authorized domains, and session policy.
- Confirm Firestore rules enforce organization, ward, role, soft-delete, parser-test, audit-log, and backup assumptions.
- Confirm workstation security, screen lock, browser profile, and shared device procedures.
- Confirm retention requirements with hospital policy and local law.
- Confirm that export/import workflows are allowed and define approved storage locations.
- Confirm incident response: lost backup, wrong recipient, unauthorized access, failed sync, and printer error.

