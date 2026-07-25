# Production Readiness Checklist

Status: working draft. This checklist blocks production use until reviewed and signed off by the hospital owner, DPO/legal service, and IT/security team.

## Before Real Patient Use

- Production bundle contains no online patient-storage client and Firestore deny-all rules remain deployed.
- Approved workstations, encrypted disks, local JSON folders, access control and secure deletion are documented.
- Authorized users and departmental handling of local patient files are managed through an approved process.
- Local draft recovery is encrypted and disabled by default.
- Parser test capture stores only synthetic/anonymized cases.
- Non-PHI operational audit and local revision handling are tested.
- Local-save status and print confirmation behavior are tested.
- Encrypted downtime backup location, passphrase transfer and restore procedure are approved.
- Printer workflow and paper handling are documented.
- Incident response procedure is documented.
- A named clinical owner accepts known limitations.

## Not Yet A Compliance Claim

Passing this checklist does not mean the application is GDPR-compliant. It only records that the listed technical and operational controls were reviewed.
