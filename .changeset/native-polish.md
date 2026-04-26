---
"web": minor
---

Native mobile polish — push notifications, deep links, biometric lock, offline cache, haptics, native share, app icon badge.

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
