# Parser provenance

This document describes the technical parser review control. It is not evidence
of clinical validation or production readiness.

## Recorded data

Each automatically applied field can carry a
`temperaturna-lista-parser-provenance-v1` entry with:

- field and review group;
- a bounded source excerpt (maximum 240 characters), not the complete pasted report;
- parser version and parse time;
- a confidence value between 0 and 1;
- a hash of the parsed field value;
- confirmation status, actor and time for the current session.

The current parser version is `temperaturna-lista-parser-v2`.

## Confirmation and print blocking

Identity/encounter, allergy and critical clinical confirmations update the
matching provenance entries. Editing a covered field invalidates its review
group. Printing is blocked while a current critical parser-derived field is
unconfirmed or its value does not match the recorded value hash.

The medication validator independently blocks a medication line without a
recognizable dose or route. Provenance confirmation does not override clinical
validation findings.

## Local persistence

Parser provenance can be included in a user-requested local patient JSON,
encrypted local recovery draft and encrypted downtime backup. It is never sent
to Firebase in the local-only production model.

Confirmation state is never trusted after persistence. During export it is
reset, and after import or recovery every entry is restored as unconfirmed.
The user must review the current values again before printing.

## Limitations

- Confidence is a parser heuristic, not a probability of clinical correctness.
- A source excerpt supports human review but does not prove that extraction is correct.
- The value hash is an integrity comparison inside the client, not a digital signature.
- Parser behavior and the confirmation workflow require clinical and hospital governance review before use with real patient data.
