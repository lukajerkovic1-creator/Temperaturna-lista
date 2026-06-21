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
