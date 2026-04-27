---
"web": minor
---

Community + public profile rebuild.

- Community: course channels (admins post), per-mentor cohort groups, configurable posting policy, audit messages, search, replies, reactions, pinning, file uploads, @mentions.
- Public profile at `/u/[username]`: hero, projects, experience, education, coding profiles with brand icons, GitHub-style activity heatmap, verified badge, ghost-preview placeholders that open inline editors.
- Reusable `UserAvatar` and `UserLink` components used everywhere users are rendered.
- Sidebar: notifications dot, mentor cohort section, polished user menu.
- Dashboard: instructor and mentor stat cards refreshed to match student layout.
- Backfill script `db:sync-groups` to populate course + mentor groups for existing courses.
