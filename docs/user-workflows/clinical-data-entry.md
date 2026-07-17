# Clinical Data Entry

Status: working draft. The application helps format a temperature-list sheet; it does not make clinical decisions.

## Identity And Encounter

Enter only the minimum data needed for the list:

- full name;
- birth year;
- admission date;
- patient source/location;
- active department/ward context.

Do not put OIB, MBO, telephone number, address, or unneeded identifiers into free-text fields unless hospital policy explicitly requires it.

## Diagnosis

Enter one diagnosis per line where practical. Autocomplete may help with frequent local phrases, but every selected diagnosis must be clinically verified by the user.

## Allergies

Use `nema` only when allergies were actively checked. If an allergy is suspected, write the substance and reaction when known. The medication safety panel can detect simple text matches, but it cannot prove that therapy is safe.

## Therapy

Autocomplete helps with names and common text patterns only. It does not verify dose, interactions, allergies, renal adjustment, antimicrobial appropriateness, or duration.

Use clear dose schedules such as:

- `amlodipin 5 mg 1,0,0 tbl`
- `pantoprazol 40 mg 1,0,0 tbl`
- `ceftriakson 2 g i.v. 1,0,0, review 03.01.2030.`

For antimicrobial therapy, include indication and planned review/duration when known.

## Vital Signs

Use consistent text that the parser can structure:

```text
T 38.4, RR 135/85, puls 96, SpO2 93%
```

Validation flags impossible values such as very high temperature, impossible SpO2, or extreme heart rate. A warning does not replace clinical review.

## Laboratory

Paste or type only the relevant laboratory values needed for the list. Keep units where important. Follow-up laboratory chips format common control labs; KKS expands on the list to E, Hb, Trc, and L.

## Microbiology

Use the microbiology checkboxes for planned samples such as hemocultures, urine culture, stool bacteriology, C. difficile, or stool virology. Detailed organism/susceptibility support is still limited and should be verified manually.

## Isolation And Epidemiology

When isolation or epidemiology measures are present in the workflow, document only the relevant type, indication, and dates. The current structured model has an infection-control field, but local procedure determines what must be printed or saved.

