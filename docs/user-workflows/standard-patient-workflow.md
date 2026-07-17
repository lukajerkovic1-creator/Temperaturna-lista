# Standard Patient Workflow

Status: working draft. Use this as an operational checklist during testing and pilot training.

## Start

1. Open the GitHub Pages application from the approved URL.
2. Sign in with Google.
3. Confirm that the user profile has the correct name, department, Gmail, organization, active ward, and role.
4. Confirm that the sync/status indicator does not show an error.
5. Choose the patient mode: ambulatory or ward patient.

## New Patient

1. Select `Novi unos`.
2. If a previous patient is unsaved, answer the save confirmation before clearing the form.
3. Enter identity fields: name, birth year, admission date, and source/location.
4. Enter diagnosis, allergies, chronic therapy, vital signs, microbiology, control plan, and other fields that apply to the chosen patient mode.
5. Verify the live preview.
6. Save to Firebase and wait until the sync indicator says the patient is synced.
7. Print only the current selected pages after sync is confirmed.

## Open Existing Patient

1. Select `Otvori pacijenta`.
2. Choose ambulatory or ward patient in the dialog.
3. Search by patient name or displayed metadata.
4. Open the patient and verify that the active ward context is correct.
5. If the application warns about a newer version, resolve the conflict before saving.

## OHBP Parser Workflow

1. Paste OHBP text only from an approved clinical source.
2. Review all fields that the parser fills.
3. Pay special attention to identity, admission date, diagnosis, allergies, therapy, vital signs, labs, and radiology.
4. Correct anything wrong before saving or printing.
5. Parser regression capture (`Ctrl+Alt+P`) must only save synthetic or anonymized cases.

## Continuation Pages

Use the page controls above the preview to choose the currently visible pair of pages. When moving to later pages, confirm whether therapy should be carried over from the previous page. Printing prints only the currently selected page pair.

