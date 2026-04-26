# Tutly Mobile

Capacitor wrapper around a small Vite + React + react-router SPA. Authenticates
against the same Better Auth + tRPC backend that powers `apps/web` (remotely at
`https://learn.tutly.in`).

## Local development

```bash
pnpm install
pnpm -F mobile dev      # opens http://localhost:5173 in a browser
```

The browser dev loop is the fastest way to iterate. `VITE_API_URL` defaults to
`http://localhost:3000` in `.env.development`, so run `pnpm -F web dev` in
parallel if you want a local backend.

## Native projects

The `ios/` and `android/` folders are **not** committed yet — generate them on a
machine with Xcode and Android Studio installed:

```bash
pnpm -F mobile build
cd apps/mobile
pnpm dlx @capacitor/cli@latest add ios
pnpm dlx @capacitor/cli@latest add android
pnpm cap:sync
pnpm cap:open:ios       # or cap:open:android
```

After the first `cap add`, commit the generated folders. Subsequent web bundle
changes need only `pnpm -F mobile build && pnpm -F mobile cap:sync`.

## Architecture in one paragraph

`webDir` points at Vite's `dist/`, so the SPA ships **inside** the native app
and launches even when the network is down. All data calls go to
`VITE_API_URL/api/trpc` and `VITE_API_URL/api/auth/*` over HTTPS. The bearer
token is mirrored from Capacitor Preferences into an in-memory cache at boot
(`src/native/storage.ts`) so Better Auth's synchronous `token()` callback can
return it on every request. Capacitor APIs are isolated to `src/native/*`; an
ESLint rule enforces the boundary.

## Adding a screen

1. Create `src/routes/<name>.tsx`.
2. Register it in `src/App.tsx` under `<ProtectedShell>` (or outside it for
   public routes).
3. Use `trpc.<router>.<procedure>.useQuery()` — types come from
   `@tutly/types` which re-exports `AppRouter` from `apps/web`.

## Adding a native plugin

Drop the wrapper in `src/native/<name>.ts`, importing from `@capacitor/<plugin>`.
Anywhere else, the ESLint rule will flag the import.
