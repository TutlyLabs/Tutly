# Changesets

Versioning for the mobile app release. Only the `web` package is versioned; that version drives the Android APK's `versionName`.

## Adding a changeset

When your PR includes changes that should bump the mobile app version:

```bash
pnpm changeset
```

Pick `web`, choose bump type (patch/minor/major), and write a one-line summary. Commit the generated `.changeset/*.md` file with your PR.

## Releasing

When PRs with changesets land on `main`, the GitHub Action opens a "Version Packages" PR that bumps `apps/web/package.json` and updates the changelog. **Merging that PR triggers the Android APK build** and creates a GitHub Release with the signed APK attached.
