# web

## 4.6.0

### Minor Changes

- [#113](https://github.com/TutlyLabs/Tutly/pull/113) [`e6e3690`](https://github.com/TutlyLabs/Tutly/commit/e6e36909eee80bf7db445b330884d78e264d77d2) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Server-side Jest test runner for SANDBOX assignments.

  - new `runner-orchestrator` worker runs each student submission in a locked-down `tutly-jest-runner` container (--network=none, memory/cpu/pids caps, no-new-privileges, cap-drop=ALL)
  - visible tests run in-browser as before for fast feedback; submit now also enqueues a `SubmissionTestRun` that the orchestrator picks up via `/api/test-runner/claim` and reports back via `/api/test-runner/callback` with an HMAC service token
  - instructors author hidden tests in a new "Hidden Tests" dialog in the sandbox editor; files live in `Attachment.hiddenTestFiles` and never reach the student
  - admin dashboard gets live status badge, per-row "Rerun tests" and "View report" buttons, and a top-bar "Rerun all submissions" action (instructor-only, 5-minute soft rate limit)
  - mentor dashboard shows per-student tests passed/failed counts
  - student view shows aggregate-only counts until the assignment deadline; visible-test failures unlock after the deadline; hidden tests never leak to students
  - schema additions: `Attachment.hiddenTestFiles`, `SubmissionTestRun.jestReport / errorMessage / attempt / triggeredByUserId`, index `(assignmentId, createdAt)`
  - new GH Action `deploy-runner-orchestrator-production.yml` builds both images and pings Coolify

## 4.5.0

### Minor Changes

- [#111](https://github.com/TutlyLabs/Tutly/pull/111) [`5e56701`](https://github.com/TutlyLabs/Tutly/commit/5e5670103bdb349dfee3f70e36ac95a16ead71fd) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - UX pass across instructor and student surfaces, plus a sandbox privacy fix.

  - **Sandbox**: solution files marked `hidden: true` or under `/solution/` are now stripped server-side for students who haven't submitted yet. Settings dialog hidden from students; IDE file explorer locked in student mode.
  - **Assignment IDE**: the brief now lives in the IDE sidebar as the default tab instead of a separate left panel, freeing ~30% horizontal room for the editor. Works from `submissionId` alone — no `assignmentId` required.
  - **Tutor activity**: list view is now the default. Added last-seen preset chips (Online / Last hour / Last 24h / Last 7d / Idle 24h+ / Never logged in) backed by new API filter operators and live counts. Search refetches inline instead of unmounting the page. "Notify" is now a community DM.
  - **Tutor statistics**: stacked Submissions bar (evaluated / pending / not-submitted) with rich tooltips showing submit % and eval %. Attendance bar tooltip shows present / absent / eligible / rate. Pie chart legend. Opaque centre card. Full-width attendance heatmap. Fixed a mentor-side 404 caused by a bad server redirect path.
  - **Tutor report**: pill-style course nav, themed Select filters, uniform table styling.
  - **Courses**: filter / sort toolbar on course detail; manage page defaults to Enrolled tab with a Notify-in-community CTA and a slimmer projected query; New course card matches row height.
  - **Coding leaderboard**: cohort-scoped (students see only their same-mentor cohort, mentors see mentees), respects `isProfilePublic`, default list view rendered as a column-aligned table with one column per platform.
  - **Dashboard**: student mentor inline under greeting; removed the standalone "Your Mentor" banner.
  - **Theme + chrome**: tightened dark surface hierarchy, lighter default Card shadow, header padding so it doesn't bump against the sidebar, sidebar reservation breakpoint moved to `md:` so tablet widths don't leave dead space, Downloads hidden from desktop sidebar, Workspace Providers gated behind a feature flag, `/tutor/video-runs` hidden from mentors and role-guarded.

## 4.4.0

### Minor Changes

- [`120e164`](https://github.com/TutlyLabs/Tutly/commit/120e164ee828687f459f722ef3280d01548abf30) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Playground IDE rewrite on a self-hosted Sandpack bundler.

  - New IDE (file tree, Monaco editor with tabs + split panes, console / problems / tests panel, preview, settings, command palette, optional 2-way local folder sync) replacing the old `SandpackCodeEditor` + `SandpackPreview` layout at `/playgrounds` and `/playgrounds/sandbox`.
  - Sandpack bundler is now served from `/sandpack` on the same origin, built from `ghcr.io/tutlylabs/sandbox` and copied into `apps/web/public/sandpack` at image build time. `NEXT_PUBLIC_SANDPACK_BUNDLER_URL` controls the iframe URL; `NEXT_PUBLIC_SANDPACK_STATIC_BUNDLER_URL` is no longer read.
  - Template chooser now lists only browser-runnable templates (static, vanilla, react, vue, svelte, solid, angular, …). Legacy keys (`vite-*`, `nextjs`, `node`, `astro`) are aliased to the closest equivalent so existing assignments keep loading.
  - Static-template preview rendered via `srcDoc` with debounced updates and a per-file inline CSS / JS pipeline — strips root-relative `<link>` / `<script>` refs that would 404 inside the sandboxed iframe.
  - Submission flow (`Submit.tsx`, `SubmitAssignment`, `SandboxHeader`) is unchanged; the new IDE just consumes the same `useSandpack()` files.

## 4.3.0

### Minor Changes

- [#105](https://github.com/TutlyLabs/Tutly/pull/105) [`383a90d`](https://github.com/TutlyLabs/Tutly/commit/383a90df626c3da5f9e9a35c85b3859cba59def8) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Self-hosted HLS class video pipeline.

  - New `video-worker` package: BullMQ + ffmpeg transcoder that consumes raw uploads from S3 and produces adaptive HLS (480p / 720p / 1080p) with a source-aware ladder.
  - Web: HLS upload UI with drag/drop and multipart resumable upload (≥50 MB); Vidstack-based player with server-side resume position and `captionsUrl` support; offline downloads on Capacitor with quality picker, pause / resume / ETA, and a per-viewer watermark on the offline page.
  - New `/tutor/video-runs` admin view for monitoring transcode jobs; in-app notifications when a transcode finishes or fails; stuck-job watchdog.
  - Access scoping on `videos.getStatus` by enrollment; HEAD-based size verification on upload; timing-safe worker secret compare.
  - "Add class" CTA on the course detail page so freshly created courses aren't a dead-end for instructors.
  - `dev:video-worker` script in the root `package.json` mirroring `dev:web` / `dev:landing`.

## 4.2.0

### Minor Changes

- [#101](https://github.com/TutlyLabs/Tutly/pull/101) [`dafc3c7`](https://github.com/TutlyLabs/Tutly/commit/dafc3c785da41c1d956a0bdafec445b721795fe8) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - - **Workspace Mode**: Implemented complete workspace assignment submission mode allowing students to code directly in a browser-embedded VS Code connected to a local agent.
  - **S3 Architecture**: Refactored S3 client for MinIO and Cloudflare R2 compatibility, automatically omitting unsupported encryption headers locally.
  - **Data Models**: Added 8 new database schema models to track workspace configurations, test runs, and instructor reviews.
  - **Security & Stability**: Fixed codeQL alerts by parsing endpoint URLs strictly and rate-limiting the local development server.

## 4.1.0

### Minor Changes

- [#99](https://github.com/TutlyLabs/Tutly/pull/99) [`5862164`](https://github.com/TutlyLabs/Tutly/commit/5862164433a7dddd54eb5f2076bff807361512c7) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Community + public profile rebuild.

  - Community: course channels (admins post), per-mentor cohort groups, configurable posting policy, audit messages, search, replies, reactions, pinning, file uploads, @mentions.
  - Public profile at `/u/[username]`: hero, projects, experience, education, coding profiles with brand icons, GitHub-style activity heatmap, verified badge, ghost-preview placeholders that open inline editors.
  - Reusable `UserAvatar` and `UserLink` components used everywhere users are rendered.
  - Sidebar: notifications dot, mentor cohort section, polished user menu.
  - Dashboard: instructor and mentor stat cards refreshed to match student layout.
  - Backfill script `db:sync-groups` to populate course + mentor groups for existing courses.

## 4.0.1

### Patch Changes

- [`88390ce`](https://github.com/TutlyLabs/Tutly/commit/88390ce989f572e727959a6af4b66026d7c39312) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Native OAuth + auth-state fixes for the mobile app.

  - **Push notifications**: fix infinite `deviceTokens.register` loop. The mutation hook return value was in the effect's dep array, so every mutation re-render re-armed the listeners and re-triggered registration. Effect now depends on `[userId]` only, mutating handlers are read via a ref, and a module-level `{ userId, token }` cache dedupes across remounts and account switches.
  - **Biometric lock**: fix infinite re-prompt after unlock. The `appStateChange` listener was registered _after_ the first biometric prompt opened, so we missed the `isActive: false` event; on return `lastBackgroundedAt` was `null` and the `Infinity` fallback always re-locked. Listener now armed before the first prompt, `null` means "don't lock", state resets after each consumed background event. Added a `promptingRef` reentrancy guard.
  - **Biometric prompt title**: removed the duplicate "Unlock Tutly" caused by passing both `androidSubtitle` and `reason`. Now only `androidTitle: reason`.
  - **Logout cleanup**: `useLogout` now also clears the biometric-lock preference, the React Query cache (in-memory + persisted), and resets the Crisp session so the chat on the sign-in screen no longer carries the previous user's identity.
  - **Crisp on public pages**: the mobile-hide CSS was being applied by the root-layout `<Crisp />` instance (which has no `user`), hiding Crisp on every mobile page including sign-in. Now only applies when `user` is provided (protected layout).
  - **Sign-in / sign-up logo**: replaced the hardcoded `T` placeholder with the actual `/icon.png`.
  - **Native OAuth (Google / GitHub)**: rebuilt the flow to actually sign users in instead of stranding them on `learn.tutly.in` after the redirect.
    - `tutly://` deep-link scheme registered (`AndroidManifest`, `Info.plist`).
    - New `/auth/native-oauth-start` route handler initiates the OAuth flow on the server so the state cookie lands in the in-app browser's cookie jar (fixes `state_mismatch`).
    - New `/auth/native-bridge` page reads the just-set Better-Auth session cookie and 302s to `tutly://auth/callback?token=…&next=…`.
    - `SocialSignin` opens the start URL in `@capacitor/browser` on native instead of redirecting the WebView.
    - `AppLifecycle` catches the `tutly://auth/callback` deep link, stores the bearer token in localStorage, closes the in-app browser, and navigates to `next`.
  - **Sidebar header**: clicking the org/logo header now navigates to `/dashboard`.
  - **Header polish**: full segmented sun/moon switch + role label on desktop, single icon-button toggle on mobile; rounded `cmd+k` search trigger.
  - **Tooling**: added `apps/web/.prettierignore` and expanded `eslint.config.mjs` ignores so `android/`, `ios/`, `out/`, `.next/`, `dist/`, `build/`, `.cap-stash/`, vscode public assets, lockfiles, and minified files are skipped — speeds up format/lint runs and keeps Turbo cache stable.

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
