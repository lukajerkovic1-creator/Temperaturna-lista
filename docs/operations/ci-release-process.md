# CI, release tags and changelog

This application is a static GitHub Pages/Firebase app. The repository now has
two release safety layers:

- `CI` runs on pull requests, pushes to `main`, and manual dispatch.
- `Release` runs when a version tag such as `v0.1.0` is pushed.

## CI checks

The CI workflow installs dependencies with `npm ci` and then runs:

- `npm run typecheck`
- `npm run build`
- `npm run security:check`
- Playwright smoke tests against a local static preview

If Playwright fails, the workflow uploads the Playwright report and test
artifacts.

There is no ESLint gate yet. The current JavaScript source is still large and
partly generated into `src/app/bootstrap.js`, so adding ESLint should be a
separate cleanup step after more modules are migrated to TypeScript.

## GitHub Pages deployment

This change does not replace the existing GitHub Pages deployment mechanism.
The repository already has a deployed-pages smoke workflow that runs after a
successful `github-pages` deployment.

Because the app is already published from GitHub Pages, changing the deployment
source automatically would be risky. Keep the existing Pages settings until the
deployment source is intentionally migrated.

## Release process

Before a release intended for clinical use:

1. Move relevant items from `CHANGELOG.md` `[Unreleased]` into a new version
   section, for example `## [0.1.0] - 2026-06-21`.
2. Commit the changelog and application changes.
3. Create an annotated tag:

   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   ```

4. Push the tag:

   ```bash
   git push origin v0.1.0
   ```

5. Wait for the `Release` workflow to pass. It verifies the app again before it
   creates the GitHub release.
6. Confirm the deployed GitHub Pages smoke workflow passes after deployment.

## Versioning rule

Use semantic versioning:

- patch version for small bug fixes and UI corrections;
- minor version for new workflows or data model additions;
- major version for incompatible storage, Firebase, parser or clinical model
  changes.

Do not use an untagged commit as a clinical release.
