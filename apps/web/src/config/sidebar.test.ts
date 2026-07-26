import { describe, expect, it } from "vitest";

import type { Role } from "@tutly/db/browser";
import { ROLE_NAMES } from "@tutly/auth/permissions";

import { getDefaultSidebarItems } from "./sidebar";

interface NavShape {
  title: string;
  url: string;
  items?: NavShape[];
}

/**
 * The nav each role rendered before visibility was derived from permissions,
 * transcribed from the hand-written per-role tables. The derived nav must
 * reproduce it exactly, entry for entry, in order.
 */
const LEGACY_NAV: Record<Role, NavShape[]> = {
  SUPER_ADMIN: [
    { title: "Dashboard", url: "/super-admin" },
    { title: "Organizations", url: "/super-admin/organizations" },
    { title: "Users", url: "/super-admin/users" },
    { title: "Domains", url: "/super-admin/domains" },
  ],
  INSTRUCTOR: [
    { title: "Dashboard", url: "/dashboard" },
    { title: "Schedule", url: "/schedule" },
    { title: "Learning", url: "#", items: [
        { title: "Courses", url: "/courses" },
        { title: "Notes", url: "/notes" },
    ] },
    { title: "Assessment", url: "#", items: [
        { title: "Assignments", url: "/tutor/assignments" },
        { title: "Submissions", url: "/tutor/assignments/submissions" },
        { title: "Leaderboard", url: "/tutor/leaderboard" },
        { title: "Attendance", url: "/tutor/attendance" },
        { title: "Video runs", url: "/tutor/video-runs" },
    ] },
    { title: "Analytics", url: "#", items: [
        { title: "Glimpse", url: "/tutor/glimpse" },
        { title: "Statistics", url: "/tutor/statistics" },
        { title: "Report", url: "/tutor/report" },
    ] },
    { title: "Community", url: "/community" },
    { title: "Notifications", url: "/notifications" },
    { title: "Management", url: "#", items: [
        { title: "Activity", url: "/tutor/activity" },
        { title: "Manage", url: "/tutor/manage-users" },
    ] },
    { title: "Bookmarks", url: "/bookmarks" },
    { title: "Downloads", url: "/downloads" },
    { title: "Playgrounds", url: "/playgrounds" },
    { title: "Drive", url: "/drive" },
  ],
  ADMIN: [
    { title: "Dashboard", url: "/dashboard" },
    { title: "Schedule", url: "/schedule" },
    { title: "Learning", url: "#", items: [
        { title: "Courses", url: "/courses" },
        { title: "Notes", url: "/notes" },
    ] },
    { title: "Assessment", url: "#", items: [
        { title: "Assignments", url: "/tutor/assignments" },
        { title: "Submissions", url: "/tutor/assignments/submissions" },
        { title: "Leaderboard", url: "/tutor/leaderboard" },
        { title: "Attendance", url: "/tutor/attendance" },
        { title: "Video runs", url: "/tutor/video-runs" },
    ] },
    { title: "Analytics", url: "#", items: [
        { title: "Glimpse", url: "/tutor/glimpse" },
        { title: "Statistics", url: "/tutor/statistics" },
        { title: "Report", url: "/tutor/report" },
    ] },
    { title: "Community", url: "/community" },
    { title: "Notifications", url: "/notifications" },
    { title: "Management", url: "#", items: [
        { title: "Activity", url: "/tutor/activity" },
        { title: "Manage", url: "/tutor/manage-users" },
    ] },
    { title: "Bookmarks", url: "/bookmarks" },
    { title: "Downloads", url: "/downloads" },
    { title: "Playgrounds", url: "/playgrounds" },
    { title: "Drive", url: "/drive" },
  ],
  MENTOR: [
    { title: "Dashboard", url: "/dashboard" },
    { title: "Schedule", url: "/schedule" },
    { title: "Learning", url: "#", items: [
        { title: "Courses", url: "/courses" },
        { title: "Notes", url: "/notes" },
    ] },
    { title: "Assessment", url: "#", items: [
        { title: "Assignments", url: "/tutor/assignments" },
        { title: "Submissions", url: "/tutor/assignments/submissions" },
        { title: "Leaderboard", url: "/tutor/leaderboard" },
        { title: "Attendance", url: "/tutor/attendance" },
    ] },
    { title: "Analytics", url: "#", items: [
        { title: "Glimpse", url: "/tutor/glimpse" },
        { title: "Statistics", url: "/tutor/statistics" },
        { title: "Report", url: "/tutor/report" },
    ] },
    { title: "Community", url: "/community" },
    { title: "Notifications", url: "/notifications" },
    { title: "Management", url: "#", items: [
        { title: "Activity", url: "/tutor/activity" },
        { title: "Manage", url: "/tutor/manage-users" },
    ] },
    { title: "Bookmarks", url: "/bookmarks" },
    { title: "Downloads", url: "/downloads" },
    { title: "Playgrounds", url: "/playgrounds" },
    { title: "Drive", url: "/drive" },
  ],
  STUDENT: [
    { title: "Dashboard", url: "/dashboard" },
    { title: "Schedule", url: "/schedule" },
    { title: "Learning", url: "#", items: [
        { title: "Courses", url: "/courses" },
        { title: "Notes", url: "/notes" },
    ] },
    { title: "Assessment", url: "#", items: [
        { title: "Assignments", url: "/assignments" },
        { title: "Leaderboard", url: "/leaderboard" },
        { title: "Coding Profiles", url: "/coding-platforms/leaderboard" },
    ] },
    { title: "Analytics", url: "#", items: [
        { title: "Statistics", url: "/statistics" },
    ] },
    { title: "Community", url: "/community" },
    { title: "Notifications", url: "/notifications" },
    { title: "Bookmarks", url: "/bookmarks" },
    { title: "Downloads", url: "/downloads" },
    { title: "Playgrounds", url: "/playgrounds" },
    { title: "Drive", url: "/drive" },
  ],
};

/** Titles and urls only — icons are React components and never varied by role. */
function shape(items: readonly NavShape[]): NavShape[] {
  return items.map(({ title, url, items: children }) =>
    children
      ? { title, url, items: shape(children) }
      : { title, url },
  );
}

describe("getDefaultSidebarItems", () => {
  it.each(ROLE_NAMES)("reproduces the legacy nav for %s", (role) => {
    expect(shape(getDefaultSidebarItems({ role }))).toEqual(LEGACY_NAV[role]);
  });

  it("ignores isAdmin, which the legacy tables also did", () => {
    for (const role of ROLE_NAMES) {
      expect(getDefaultSidebarItems({ role, isAdmin: true })).toEqual(
        getDefaultSidebarItems({ role, isAdmin: false }),
      );
    }
  });

  it("appends the feature-flagged extras for every role", () => {
    for (const role of ROLE_NAMES) {
      const items = getDefaultSidebarItems({
        role,
        isIntegrationsEnabled: true,
        isAIAssistantEnabled: true,
      });
      expect(items.map((i) => i.url).slice(-2)).toEqual([
        "/integrations",
        "/ai",
      ]);
    }
  });

  it("never leaks the staff console into a learner nav", () => {
    const urls = getDefaultSidebarItems({ role: "STUDENT" }).flatMap((item) => [
      item.url,
      ...(item.items ?? []).map((child) => child.url),
    ]);
    expect(urls.filter((url) => url.startsWith("/tutor"))).toEqual([]);
    expect(urls.filter((url) => url.startsWith("/super-admin"))).toEqual([]);
  });

  it("gives SUPER_ADMIN the console instead of the application nav", () => {
    const urls = getDefaultSidebarItems({ role: "SUPER_ADMIN" }).map(
      (i) => i.url,
    );
    expect(urls.every((url) => url.startsWith("/super-admin"))).toBe(true);
  });
});
