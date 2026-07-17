# User Workflows

Status: working draft. This documentation is practical guidance for testing and pilot use. Before use with real patient data, hospital DPO/legal/security/IT and clinical leadership must approve the deployment, Firebase rules, retention, downtime procedure, and user onboarding.

## Who Uses The Application

- Doctors use the application to prepare, verify, save, open, and print temperature-list sheets.
- Nurses may review printed output, vital signs, microbiology samples, and workflow status according to local policy.
- Administrators manage user profiles, department context, archived records, and audit review.
- Hospital IT manages Firebase configuration, GitHub Pages deployment, backups, downtime procedures, and incident response.

## Core Documents

- [Roles and permissions](roles-and-permissions.md)
- [Standard patient workflow](standard-patient-workflow.md)
- [Clinical data entry](clinical-data-entry.md)
- [Firebase sync, print, and downtime](firebase-sync-print-downtime.md)
- [Troubleshooting](troubleshooting.md)

## Safety Rules For Real Data

- Do not use real patient data until the production checklist is approved.
- Do not paste screenshots or patient data into email, chat, issue trackers, or parser test cases.
- Do not rely on autocomplete as a clinical safety check.
- Always verify parser output manually before saving or printing.
- Print only after Firebase sync is clearly confirmed, or after an explicit local-unsynced print confirmation in downtime.
- Local cleartext auto-save of patient data is not allowed. Optional recovery must be encrypted and time-limited.

