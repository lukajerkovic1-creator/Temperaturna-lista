# Clinical access context

## Model

Firebase Auth user is normalized into an application auth context:

```js
{
  uid,
  email,
  displayName,
  organizationId,
  wardIds,
  activeWardId,
  roles,
  isAuthenticated,
  hasValidClinicalContext
}
```

Patient and parser-test documents are stored with:

- `accessModel: "organization-ward-role-v1"`
- `organizationId`
- `wardId`
- `clinicalPartitionKey: "clinical-v1|{organizationId}|{wardId}"`
- `ownerUid`, `ownerEmail`, `ownerDisplayName` for audit only

`ownerUid` is no longer the access boundary for clinical documents.

## Legacy Patient Migration

Older patient documents may only contain `ownerUid` and may not yet have `accessModel`, `organizationId`, `wardId`, or `clinicalPartitionKey`.

To avoid hiding already saved personal test/pilot records after the ward-based model is introduced, the client performs a limited legacy recovery query for records owned by the signed-in Firebase user. These records are marked as legacy in the patient picker and should be opened and saved once so the app writes the current ward-based access fields.

This is a migration bridge only. New patient writes always use `organization-ward-role-v1`, and normal shared clinical access remains based on organization, ward, and role.

## Fail-Closed Behavior

The app disables Firebase patient save/open controls unless all are true:

- Firebase user is signed in.
- User profile is complete.
- Profile has `organizationId`.
- Profile has `activeWardId`.
- `activeWardId` is included in `wardIds`.
- User has a clinical role such as `clinician`.

Firestore rules also reject patient and parser-test reads/writes unless the user's profile allows access to the document organization and ward.

## Current Registration

The current static app still has a lightweight self-registration profile form. It derives `wardId` from the entered department and uses the non-secret default `organizationId` for this deployment. This is enough to prepare the data model and fail closed when context is missing.

For production hospital use, user profiles should be provisioned or approved by an administrator or SSO/identity provider. Self-selected wards and roles are not a final hospital access-control solution.

## Next Hardening Step

Move role and ward assignment out of self-registration:

- provision `userProfiles` server-side, or
- use Firebase custom claims from a trusted backend/SSO bridge, and
- change Firestore rules so ordinary users cannot grant themselves wards or roles.
