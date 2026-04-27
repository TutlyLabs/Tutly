---
"web": patch
---

Native OAuth + auth-state fixes for the mobile app.

- **Push notifications**: fix infinite `deviceTokens.register` loop. The mutation hook return value was in the effect's dep array, so every mutation re-render re-armed the listeners and re-triggered registration. Effect now depends on `[userId]` only, mutating handlers are read via a ref, and a module-level `{ userId, token }` cache dedupes across remounts and account switches.
- **Biometric lock**: fix infinite re-prompt after unlock. The `appStateChange` listener was registered *after* the first biometric prompt opened, so we missed the `isActive: false` event; on return `lastBackgroundedAt` was `null` and the `Infinity` fallback always re-locked. Listener now armed before the first prompt, `null` means "don't lock", state resets after each consumed background event. Added a `promptingRef` reentrancy guard.
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
