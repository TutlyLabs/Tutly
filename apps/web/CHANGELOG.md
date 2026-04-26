# web

## 3.6.0

### Minor Changes

- [#94](https://github.com/TutlyLabs/Tutly/pull/94) [`c8bc8af`](https://github.com/TutlyLabs/Tutly/commit/c8bc8af2d6af2a06dca021efb873ad88ee6b823c) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Native mobile polish — push notifications, deep links, biometric lock, offline cache, haptics, native share, app icon badge.

  - Capacitor platform detection (`isNative`, `useIsNative`, `usePlatform`)
  - StatusBar follows app theme; safe-area insets on header + bottom nav (top/bottom/left/right)
  - Android back button → router.back() / exitApp; foreground refresh; cold-start launch URL routing
  - Keyboard scroll-into-view on focus; tap-outside dismiss
  - Haptics on toasts (success/warning/error) + bottom nav tab clicks
  - Native share sheet for certificate downloads; in-app browser for drive presigned URLs
  - Biometric lock with 60s background timeout; toggle in user menu
  - Universal/app links (AASA + assetlinks.json + Associated Domains entitlement + autoVerify intent-filter)
  - Push notifications end-to-end: `DeviceToken` model + tRPC router + `firebase-admin` sender wired into existing notify flow
  - Offline cache via TanStack `persistQueryClient` with Capacitor Preferences; offline banner; auto-pause + resume mutations
  - App icon badge synced to unread notification count
  - iOS deployment target bumped 13.0 → 15.0 (badge plugin requirement)
  - Release pipeline: APK now actually attaches to GitHub Release on every main push (was gated on `published == 'true'` which `changesets/action` only sets for npm publishes)

## 3.5.0

### Minor Changes

- [#92](https://github.com/TutlyLabs/Tutly/pull/92) [`ee9e798`](https://github.com/TutlyLabs/Tutly/commit/ee9e79836dfd103aa4d3d8acfabee6c543c79bc1) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Launch native iOS and Android mobile apps via Capacitor. The Next.js codebase ships unchanged on the web (`output: "standalone"`) and as a static export inside the native shell (`output: "export"`, gated by `NEXT_PUBLIC_BUILD_TARGET=capacitor`).

  - iOS + Android scaffolds (`apps/web/{ios,android}`) with `in.tutly.app` bundle ID
  - Auto-generated app icons + splash screens (light + dark) for all densities
  - Bearer-token auth + tRPC over CORS-protected `/api/*` middleware
  - All `(protected)` pages converted to client components; dynamic routes flattened to `?id=` siblings
  - Android APK release pipeline: changeset merge → signed APK attached to GitHub Release `tutly-mobile-vX.Y.Z`
  - Monorepo packages extracted: `@tutly/{api,auth,db,hooks,ui,utils}`
  - CI hardening: CodeQL fixes for password generation, command injection, URL scheme checks, request forgery
