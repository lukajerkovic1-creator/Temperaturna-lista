# Parser

Parser-related code lives here.

- `20-ohbp-parser.js` parses OHBP text and normalizes patient data.
- `30-parser-tests.js` contains parser regression helpers, Ctrl+Alt+P capture,
  Firebase/local parser test writes, and parser test privacy sanitization.

Parser test storage must remain synthetic or anonymized. See
`docs/security/parser-test-privacy.md`.
