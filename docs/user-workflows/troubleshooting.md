# Troubleshooting

Status: working draft.

## I Cannot Sign In

- Confirm that the browser allows popups for Firebase/Google sign-in.
- Confirm that the GitHub Pages domain is authorized in Firebase Authentication.
- Try a hard refresh.
- If this is a new user, create or complete the user profile with name, department, Gmail, organization, ward, and role.

## Firebase Save Failed

- Check the sync indicator and online status.
- Confirm that the user is signed in and has a valid ward context.
- Confirm that Firestore rules are deployed.
- Do not print silently if the patient is unsaved.
- If downtime procedure is active, use the approved backup workflow.

## Patient Is Missing From Open Dialog

- Confirm whether the dialog is showing ambulatory or ward patients.
- Confirm the active ward.
- Ask an admin whether the patient was archived.
- If the patient was saved under a wrong ward, follow admin procedure; do not duplicate records manually unless conflict workflow explicitly creates a copy.

## Parser Filled Wrong Data

- Correct the form manually before saving.
- Do not store real patient text as a parser regression case.
- Use `Ctrl+Alt+P` only for synthetic or anonymized parser test capture.
- Add a short description of what the parser did wrong.

## Autocomplete Suggested The Wrong Therapy Or Diagnosis

- Do not select it.
- If it is a saved local suggestion, delete it from the suggestion menu and confirm deletion.
- If it came from the embedded database, document the issue for review; do not edit clinical truth around the suggestion.

## Accessibility Or Keyboard Issue

- Use Tab and Shift+Tab through the form.
- Chronic therapy and diagnosis fields should be reachable by keyboard.
- The preview page cards are focusable for keyboard users.
- Report the exact field where focus jumps unexpectedly.

