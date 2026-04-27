# web

## 4.0.0

### Major Changes

- [#96](https://github.com/TutlyLabs/Tutly/pull/96) [`3c1e32b`](https://github.com/TutlyLabs/Tutly/commit/3c1e32bc739ace52ff66596512c1cd9a84e37e46) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - End-to-end UI overhaul — every page made fully responsive on mobile + desktop, with a native-app feel on small screens.

  **Shell & navigation**

  - `ProtectedShell` renders the full `AppShellSkeleton` (sidebar + header + padded body) while the session resolves, so users never see a blank screen on first load.
  - Mobile sidebar opens as a full sheet (was rendering as an icon-strip on `forceClose` pages); clicking the sidebar header logo navigates to `/dashboard`.
  - Standardized header — full segmented sun/moon switch + role label on desktop, single icon-button toggle on mobile; rounded `cmd+k` search trigger.
  - Crisp chat hidden on mobile signed-in pages and reachable from the user menu.

  **Dashboard**

  - Blue hero with stat cards overlapping into the bottom on desktop (white plates, blue accents, centered trio); 3-up grid on mobile with centered icon/value/label.
  - Assignments widget: mobile drops the search to its own row; table scrolls horizontally with a sticky header.

  **Class detail**

  - Notes header collapsed into a single row; "Add tag" pill reveals the tag input on demand.
  - Compact mobile title row with inline class-list trigger; class assignments rendered as single-row items (icon-only link button + 3-dot menu).
  - Removed double padding so assignments and notes sit cleanly without dead space.

  **Assignments**

  - Mobile: course picker is a `Select` on the right of the title; filter chips become a segmented pill bar below.
  - Desktop: courses chips on the left, filter pill bar on the right, all in one row.
  - Cards/rows now `cursor-pointer`.

  **Schedule**

  - Max-width container, denser month/week/year cells, narrow weekday labels on mobile.
  - Day view time labels (`12:00 AM` etc.) no longer wrap; right-aligned with proper `shrink-0`.
  - Year view rebuilt with circular date chips and `bg-primary` event dots.

  **Leaderboard**

  - Podium 2-1-3 with bottoms aligned flush (top-only padding, no scale transforms); subtle amber accent on rank 1; long names truncate.

  **Profile**

  - Hero avatar is the upload target with hover camera/spinner overlay; removed the duplicate 192px avatar inside BasicDetails.
  - Hardcoded grays swept to design tokens; tabs sit in a horizontal scroll area on mobile.

  **Cross-cutting**

  - Single `LayoutContent` gutter (`p-4 sm:p-6`) — pages that wrapped their own padding now use `!p-0` overrides where they need to be full-bleed.
  - Consistent `max-w-7xl` page widths; tightened `space-y-5` defaults to `space-y-4` on mobile.
  - Stat skeletons mirror final layouts (icon position, padding, card chrome) so the shimmer doesn't shift on hydration.
  - Replaced hardcoded `text-gray-*` / `border-gray-*` with `text-muted-foreground` / `border-border` across stats, tutor pages, schedule, etc.

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
