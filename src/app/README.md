# App

Application startup, shared state, configuration, and the generated runtime
bundle live here.

- Edit `00-core-ui-state.js` for version, global state, shared configuration,
  DOM references, and common app helpers.
- Do not edit `bootstrap.js` directly unless making an emergency generated
  bundle fix. Prefer changing the module sources and running
  `npm run build:bootstrap`.
