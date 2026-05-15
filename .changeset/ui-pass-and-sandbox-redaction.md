---
"web": minor
---

UX pass across instructor and student surfaces, plus a sandbox privacy fix.

- **Sandbox**: solution files marked `hidden: true` or under `/solution/` are now stripped server-side for students who haven't submitted yet. Settings dialog hidden from students; IDE file explorer locked in student mode.
- **Assignment IDE**: the brief now lives in the IDE sidebar as the default tab instead of a separate left panel, freeing ~30% horizontal room for the editor. Works from `submissionId` alone — no `assignmentId` required.
- **Tutor activity**: list view is now the default. Added last-seen preset chips (Online / Last hour / Last 24h / Last 7d / Idle 24h+ / Never logged in) backed by new API filter operators and live counts. Search refetches inline instead of unmounting the page. "Notify" is now a community DM.
- **Tutor statistics**: stacked Submissions bar (evaluated / pending / not-submitted) with rich tooltips showing submit % and eval %. Attendance bar tooltip shows present / absent / eligible / rate. Pie chart legend. Opaque centre card. Full-width attendance heatmap. Fixed a mentor-side 404 caused by a bad server redirect path.
- **Tutor report**: pill-style course nav, themed Select filters, uniform table styling.
- **Courses**: filter / sort toolbar on course detail; manage page defaults to Enrolled tab with a Notify-in-community CTA and a slimmer projected query; New course card matches row height.
- **Coding leaderboard**: cohort-scoped (students see only their same-mentor cohort, mentors see mentees), respects `isProfilePublic`, default list view rendered as a column-aligned table with one column per platform.
- **Dashboard**: student mentor inline under greeting; removed the standalone "Your Mentor" banner.
- **Theme + chrome**: tightened dark surface hierarchy, lighter default Card shadow, header padding so it doesn't bump against the sidebar, sidebar reservation breakpoint moved to `md:` so tablet widths don't leave dead space, Downloads hidden from desktop sidebar, Workspace Providers gated behind a feature flag, `/tutor/video-runs` hidden from mentors and role-guarded.
