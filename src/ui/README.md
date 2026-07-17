# UI

UI rendering, dialogs, status indicators, and event wiring live here.

- `40-rendering-ui.js` contains the main rendering/update flows, patient
  management dialogs, Firebase patient workflows, sync status UI, and local
  draft UI.
- `60-speech-ui-and-events.js` contains keyboard shortcuts, event listeners,
  speech helpers, drag/drop import, and app startup.

Storage-specific code inside `40-rendering-ui.js` is a known transitional
boundary and should move to `src/storage/` in a later no-behavior-change pass.
