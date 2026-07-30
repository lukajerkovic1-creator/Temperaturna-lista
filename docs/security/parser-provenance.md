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
- a hash of the parsed field value.

The current parser version is `temperaturna-lista-parser-v2`.

## Review and printing

Parser provenance is informational. It helps the user compare an automatically
populated field with its bounded source excerpt and confidence estimate. It does
not contain a confirmation state, operator identity or print guard.

Clinical validation and medication warnings remain independent from parser
provenance. Removing parser confirmation does not suppress those findings.

## Local persistence

Parser provenance can be included in a user-requested local patient JSON,
encrypted local recovery draft and encrypted downtime backup. It is never sent
to Firebase in the local-only production model.

Legacy confirmation fields are silently discarded during import and are not
written by new exports.

## Limitations

- Confidence is a parser heuristic, not a probability of clinical correctness.
- A source excerpt supports human review but does not prove that extraction is correct.
- The value hash is an integrity comparison inside the client, not a digital signature.
- Parser behavior and the surrounding clinical workflow require clinical and hospital governance review before use with real patient data.
