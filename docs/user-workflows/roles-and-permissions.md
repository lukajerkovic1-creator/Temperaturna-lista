# Roles And Permissions

Status: working draft. Final role mapping must be approved by hospital administration and IT.

## Clinical Context

Every Firebase user is normalized into a clinical context:

- organization or institution;
- ward or working unit;
- active ward;
- role list;
- authenticated status;
- valid clinical context flag.

If the context is missing or invalid, the application must fail closed: patient save/open actions are disabled and Firestore rules should reject access.

## Roles

| Role | Typical user | Allowed actions |
| --- | --- | --- |
| clinician | doctor | Create, edit, save, open, print, archive active patients in assigned wards. |
| nurse | nurse | Open and review assigned-ward patients; edit only if hospital policy allows it. |
| admin | clinical/IT administrator | Manage profiles, view archived patients, restore soft-deleted records, review audit events. |
| auditor | DPO/security/quality reviewer | Review audit and policy evidence without routine clinical editing. |
| viewer | read-only clinical user | Open assigned-ward patients when explicitly permitted. |
| developer | test/development account | Work only with synthetic or deidentified data. |

## Department Boundary

Patients are saved with organization and ward metadata. Opening patients must use the active ward context by default. Users should only see patients from wards assigned to their profile.

Changing the active ward changes which patient list is opened and where new saves go. A user must not assign themselves new wards in production; ward assignment should come from an administrator or trusted identity provider.

## Archived Records

Patient deletion from the client is soft-delete. Archived records are hidden by default. Only admin or another explicitly approved role should use "Prikaži arhivirane" and restore actions.

## Audit Expectations

Important actions create audit events where implemented:

- create and update;
- rename;
- archive and restore;
- open/view when feasible;
- print;
- failed save;
- print without sync confirmation.

Audit logs are for traceability. They do not replace hospital incident, documentation, or medical-record procedures.

