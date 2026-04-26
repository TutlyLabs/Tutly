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
