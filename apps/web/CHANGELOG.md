# web

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
