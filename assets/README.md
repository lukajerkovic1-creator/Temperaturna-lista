# Static Assets

These files are application resources, not patient records:

- `app-icon.png` is the reviewed 256x256 browser/application icon.
- `temperature-list-background.jpg` is the blank temperature-list form used by
  preview and print rendering.
- `data/therapy-database.js` exposes the reviewed local medication alias dataset
  before the application bootstrap starts.

Patient data must never be added to this directory. The production application
loads these resources locally from the same GitHub Pages deployment and does not
use them to enable online patient storage.

`tools/validate-static-app.js` validates file signatures, size budgets, therapy
dataset byte length, load order, and the absence of embedded `data:image` blobs.
All three assets are included in the deterministic application build SHA.
