# Storage

Target home for Firebase, audit, local draft, sync, and backup storage modules.

During this transitional refactor, much of this code still lives in
`src/ui/40-rendering-ui.js` because those functions are tightly coupled to the
current shared closure. Move these pieces here in small follow-up refactors:

- Firebase app/client helpers.
- Patient save/open/rename/archive/restore workflows.
- Audit event writing.
- Encrypted local draft storage.
- Downtime backup import/export helpers.
