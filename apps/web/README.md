# Tutly

Learning Management System (LMS) with attendance tracking, assignment management, interactive code playgrounds, real-time notifications, and many more.

## Links

- Learning Platform: https://learn.tutly.in

## Development

```bash
pnpm dev    # http://localhost:3000
```

## Mobile (iOS / Android via Capacitor)

The same Next.js codebase ships as a native mobile app via Capacitor. The build target is gated by `NEXT_PUBLIC_BUILD_TARGET=capacitor` (set automatically by `pnpm build:cap`), which switches Next to `output: "export"` and stashes `src/app/api` aside.

### Prerequisites

| Tool | iOS | Android |
|---|---|---|
| Xcode (App Store) + `sudo xcodebuild -license accept` | yes | – |
| `brew install cocoapods` | yes | – |
| Android Studio + Android SDK | – | yes |

### One-time setup

```bash
# From apps/web. Make sure your dev API is running (pnpm -F web dev) before:
NEXT_PUBLIC_API_URL=http://localhost:3000 pnpm build:cap

# Scaffold native projects
pnpm cap:add:ios
pnpm cap:add:android
```

For physical device testing, replace `localhost` with your Mac's LAN IP and add that pattern to `DEV_ORIGIN_PATTERNS` in `src/lib/cors.ts`.

For production builds, omit `NEXT_PUBLIC_API_URL` (defaults to `https://learn.tutly.in`).

### Run

```bash
pnpm cap:ios       # build + copy assets + open Xcode
pnpm cap:android   # build + copy assets + open Android Studio
```

In Xcode / Android Studio: pick a simulator/emulator and hit run.

### Iteration

After web code changes, rerun:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000 pnpm cap:ios
```

then re-run from the IDE (`Cmd+R` in Xcode).

For native plugin or `capacitor.config.ts` changes, use the heavier sync:

```bash
pnpm cap; true   # the trailing `; true` ignores a known wrap-ansi cosmetic crash
```

The crash is in `@ionic/cli-framework-output`'s log formatter (CJS `wrap-ansi@7` ends up with an ESM `string-width@7` due to pnpm hoisting). The actual sync (asset copy, plugin update, pod install) completes before the logger crashes — the work is done. `pnpm cap:ios` avoids it by using `cap copy` instead of `cap sync`, which skips the offending log step.

### Troubleshooting simulator launch

```bash
xcrun simctl shutdown all
xcrun simctl erase all
killall Simulator
```

Then in Xcode: Product → Clean Build Folder (`Shift+Cmd+K`) → Run (`Cmd+R`).

## Web build

```bash
pnpm build         # production build (standalone)
pnpm build:cap     # static export for capacitor
```

## Android APK release

Push to `main` triggers `.github/workflows/release-android.yml`. It uses Changesets for version management:

1. In your PR, run `pnpm changeset` from repo root and pick `web` + bump type. Commit the generated file.
2. When the PR merges, the workflow opens a "Version Packages" PR that bumps `apps/web/package.json` and updates `apps/web/CHANGELOG.md`.
3. **Merging the Version Packages PR** triggers an APK build. The signed APK is attached to a GitHub Release tagged `tutly-mobile-vX.Y.Z`.

`versionName` comes from `package.json`. `versionCode` is computed as `MAJOR*10000 + MINOR*100 + PATCH` (e.g. `3.4.1` → `30401`).

### Keystore (one-time setup)

Generate the release keystore (do this once, store the file securely — losing it means losing the ability to push updates to existing installs):

```bash
keytool -genkey -v \
  -keystore tutly-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias tutly-release
```

Encode it to base64 for GitHub Secrets:

```bash
base64 -i tutly-release.jks | pbcopy   # macOS
```

In repo settings → Secrets and variables → Actions, add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | base64 of the `.jks` file (paste from clipboard) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password you set during `keytool` |
| `ANDROID_KEY_ALIAS` | `tutly-release` |
| `ANDROID_KEY_PASSWORD` | the key password (often same as keystore password) |

### Local release build

To build a signed APK locally (skip the workflow):

```bash
export ANDROID_KEYSTORE_BASE64=$(base64 -i path/to/tutly-release.jks)
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=tutly-release
export ANDROID_KEY_PASSWORD=...
pnpm release:android
# → apps/web/tutly-X.Y.Z.apk
```

Local debug builds (no keystore needed) still work via `pnpm cap:android` → run from Android Studio.

## Deep links (universal / app links)

Tapping `https://learn.tutly.in/<path>` outside the app routes into the app instead of the browser, once the AASA + assetlinks files below are populated and the app is signed with the release keystore.

### iOS — fill in your Team ID

1. Apple Developer portal → Membership → copy the 10-character Team ID.
2. Edit `apps/web/public/.well-known/apple-app-site-association` and replace `REPLACE_WITH_TEAM_ID` with it (so `appID` becomes e.g. `ABC1234567.in.tutly.app`).
3. Deploy `learn.tutly.in`.
4. In Xcode: Signing & Capabilities → "+" → Associated Domains is already wired via `App.entitlements`, but you must select your Team in the Signing dropdown so provisioning includes the entitlement.

### Android — fill in the keystore SHA256

```bash
keytool -list -v -keystore tutly-release.jks -alias tutly-release | grep "SHA256:"
```

Paste the colon-separated hex into `apps/web/public/.well-known/assetlinks.json` (`sha256_cert_fingerprints`). For Play App Signing, also paste the upload + app signing SHA256 from Play Console.

Verify after deploy:

```bash
# AASA
curl -I https://learn.tutly.in/.well-known/apple-app-site-association
# expects Content-Type: application/json
```
