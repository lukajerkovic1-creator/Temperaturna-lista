# Production Readiness Checklist

Status: working draft. This checklist blocks production use until reviewed and signed off by the hospital owner, DPO/legal service, and IT/security team.

## Before Real Patient Use

- Firebase project, domains, authentication provider, and Firestore rules are reviewed.
- Firestore rules fail closed when user profile, organization, ward, or role is missing.
- Authorized users and ward membership are managed through an approved process.
- Local draft recovery is encrypted and disabled by default.
- Parser test capture stores only synthetic/anonymized cases.
- Audit log and soft-delete behavior are enabled and tested.
- Sync status and print confirmation behavior are tested.
- Downtime backup location and restore procedure are approved.
- Printer workflow and paper handling are documented.
- Incident response procedure is documented.
- A named clinical owner accepts known limitations.

## Not Yet A Compliance Claim

Passing this checklist does not mean the application is GDPR-compliant. It only records that the listed technical and operational controls were reviewed.

