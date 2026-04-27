---
"web": major
---

End-to-end UI overhaul — every page made fully responsive on mobile + desktop, with a native-app feel on small screens.

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
