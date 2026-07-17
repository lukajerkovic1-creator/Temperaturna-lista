# Synthetic Clinical Fixtures

These fixtures are for regression testing only. They must never contain real patient data.

## Rules

- Patient names must start with `TEST PACIJENT`.
- Do not use real OIB, MBO, hospital numbers, phone numbers, e-mail addresses, addresses, or copied clinical text.
- Dates must be synthetic and should not describe a real encounter.
- Text may mimic structure and clinical patterns, but not real notes.
- If a scenario comes from a real bug, rewrite it into a synthetic case before committing it.

## How To Add A Scenario

1. Add a new patient object to `synthetic-patients.v1.json`.
2. Add at least one `coverage` tag.
3. Keep all identifiers synthetic.
4. Add expected safety or validation outcomes only when the current application supports them.
5. Run `npm run test:clinical`.

