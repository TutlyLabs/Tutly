import type { Role } from "@tutly/db/browser";
import {
  BarChart,
  Bell,
  Bookmark,
  Brain,
  Building2,
  Calendar,
  ClipboardList,
  Download,
  Globe,
  GraduationCap,
  HardDrive,
  Home,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Terminal,
  Users,
  Users2,
} from "lucide-react";

import type { SidebarItem } from "@/components/sidebar/AppSidebar";
import type {
  PermissionCheck,
  PermissionContext,
} from "@/lib/permissions/core";
import { can } from "@/lib/permissions/core";

/**
 * A nav entry declares the permission it needs; visibility is derived, never
 * hand-written per role. Children carry no icon — `AppSidebar` only renders the
 * top-level one.
 */
export interface NavItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  /** Gate for this entry. A group is shown when any child survives the filter. */
  permission?: PermissionCheck;
  items?: NavItem[];
}

/*
 * Role grants are strict supersets (STUDENT ⊆ MENTOR ⊆ ... ⊆ SUPER_ADMIN), so a
 * learner-only entry cannot be expressed as a grant the learner uniquely holds.
 * Those entries instead use `none`: hidden from anyone holding the staff
 * counterpart. `submission:list` is the staff marker — the lowest grant that
 * separates MENTOR+ from STUDENT.
 */
const STAFF_MARKER: PermissionCheck["none"] = [{ submission: ["list"] }];

/**
 * The whole application nav in display order. Every role's menu is a filtered
 * view of this one table.
 */
const APP_NAV: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    permission: { all: [{ dashboard: ["read"] }] },
  },
  {
    title: "Schedule",
    url: "/schedule",
    icon: Calendar,
    permission: { all: [{ schedule: ["list"] }] },
  },
  {
    title: "Learning",
    url: "#",
    icon: GraduationCap,
    items: [
      {
        title: "Courses",
        url: "/courses",
        permission: { all: [{ course: ["list"] }] },
      },
      {
        title: "Notes",
        url: "/notes",
        permission: { all: [{ note: ["list"] }] },
      },
    ],
  },
  {
    title: "Assessment",
    url: "#",
    icon: ClipboardList,
    items: [
      {
        title: "Assignments",
        url: "/tutor/assignments",
        permission: { all: [{ assignment: ["evaluate"] }] },
      },
      {
        title: "Assignments",
        url: "/assignments",
        permission: { all: [{ assignment: ["list"] }], none: STAFF_MARKER },
      },
      {
        title: "Submissions",
        url: "/tutor/assignments/submissions",
        permission: { all: [{ submission: ["list"] }] },
      },
      {
        title: "Leaderboard",
        url: "/tutor/leaderboard",
        permission: {
          all: [{ leaderboard: ["read"] }, { submission: ["list"] }],
        },
      },
      {
        title: "Leaderboard",
        url: "/leaderboard",
        permission: { all: [{ leaderboard: ["read"] }], none: STAFF_MARKER },
      },
      {
        title: "Attendance",
        url: "/tutor/attendance",
        permission: { all: [{ attendance: ["list"] }] },
      },
      {
        title: "Coding Profiles",
        url: "/coding-platforms/leaderboard",
        permission: { all: [{ codingProfile: ["list"] }], none: STAFF_MARKER },
      },
      {
        // `video:list` is a MENTOR grant, but the runs console exists to
        // re-render, so it keys off `video:retry` (INSTRUCTOR+).
        title: "Video runs",
        url: "/tutor/video-runs",
        permission: { all: [{ video: ["retry"] }] },
      },
    ],
  },
  {
    title: "Analytics",
    url: "#",
    icon: BarChart,
    items: [
      {
        title: "Glimpse",
        url: "/tutor/glimpse",
        permission: { all: [{ glimpse: ["read"] }] },
      },
      {
        title: "Statistics",
        url: "/tutor/statistics",
        permission: {
          all: [{ statistics: ["read"] }, { submission: ["list"] }],
        },
      },
      {
        title: "Report",
        url: "/tutor/report",
        permission: { all: [{ report: ["read"] }] },
      },
      {
        title: "Statistics",
        url: "/statistics",
        permission: { all: [{ statistics: ["read"] }], none: STAFF_MARKER },
      },
    ],
  },
  {
    title: "Community",
    url: "/community",
    icon: MessageSquare,
    permission: { all: [{ chat: ["list"] }] },
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    permission: { all: [{ notification: ["list"] }] },
  },
  {
    title: "Management",
    url: "#",
    icon: Users2,
    items: [
      {
        title: "Activity",
        url: "/tutor/activity",
        permission: { all: [{ user: ["list"] }] },
      },
      {
        title: "Manage",
        url: "/tutor/manage-users",
        permission: { all: [{ user: ["list"] }] },
      },
    ],
  },
  {
    title: "Bookmarks",
    url: "/bookmarks",
    icon: Bookmark,
    permission: { all: [{ bookmark: ["list"] }] },
  },
  {
    title: "Downloads",
    url: "/downloads",
    icon: Download,
    permission: { all: [{ file: ["list"] }] },
  },
  {
    title: "Playgrounds",
    url: "/playgrounds",
    icon: Terminal,
    permission: { all: [{ sandbox: ["read"] }] },
  },
  {
    title: "Drive",
    url: "/drive",
    icon: HardDrive,
    permission: { all: [{ file: ["list"] }] },
  },
];

/**
 * The super-admin console replaces the application nav rather than extending
 * it, so it lives in its own table. `organization:list` is a SUPER_ADMIN-only
 * grant, which is what selects it.
 */
const SUPER_ADMIN_CONSOLE: NavItem[] = [
  {
    title: "Dashboard",
    url: "/super-admin",
    icon: LayoutDashboard,
    permission: { all: [{ organization: ["list"] }] },
  },
  {
    title: "Organizations",
    url: "/super-admin/organizations",
    icon: Building2,
    permission: { all: [{ organization: ["list"] }] },
  },
  {
    title: "Users",
    url: "/super-admin/users",
    icon: Users,
    permission: { all: [{ user: ["list"] }] },
  },
  {
    title: "Domains",
    url: "/super-admin/domains",
    icon: Globe,
    permission: { all: [{ domain: ["list"] }] },
  },
];

/** Selects the super-admin console over the application nav. */
const SUPER_ADMIN_CONSOLE_CHECK: PermissionCheck = {
  all: [{ organization: ["list"] }],
};

/**
 * Keeps the entries the context is allowed to see. A group with children is
 * kept only when at least one child survives; a group never inherits its
 * children's permissions.
 */
export function filterNavItems(
  items: readonly NavItem[],
  ctx: PermissionContext,
): NavItem[] {
  return items.flatMap((item) => {
    if (item.permission && !can(ctx, item.permission)) return [];
    if (!item.items) return [item];

    const children = filterNavItems(item.items, ctx);
    if (children.length === 0) return [];
    return [{ ...item, items: children }];
  });
}

/*
 * `SidebarItem` requires `icon`, but children have never had one and it is
 * never read for them — the previous revision papered over the same gap with
 * `AdminItems as SidebarItem[]`. One cast, at the boundary.
 */
const toSidebarItems = (items: NavItem[]): SidebarItem[] =>
  items as SidebarItem[];

export function getDefaultSidebarItems({
  role,
  isIntegrationsEnabled = false,
  isAIAssistantEnabled = false,
}: {
  role: Role;
  /**
   * Accepted and ignored. The previous revision branched an `isAdmin`
   * INSTRUCTOR onto an `AdminItems` table that was byte-identical to
   * `InstructorItems`, so the branch never changed the rendered nav. See
   * `docs/permissions.md`.
   */
  isAdmin?: boolean;
  isIntegrationsEnabled?: boolean;
  isAIAssistantEnabled?: boolean;
}): SidebarItem[] {
  const ctx: PermissionContext = {
    role,
    isAdmin: false,
    adminForCourseIds: [],
  };

  const base = can(ctx, SUPER_ADMIN_CONSOLE_CHECK)
    ? SUPER_ADMIN_CONSOLE
    : APP_NAV;
  const items = filterNavItems(base, ctx);

  /*
   * Feature-flagged extras. Both are appended for every role today, gated only
   * by the flag; adding a permission gate would change behaviour, so it is
   * deferred and recorded in `docs/permissions.md`.
   */
  if (isIntegrationsEnabled) {
    items.push({ title: "Integrations", url: "/integrations", icon: Plug });
  }
  if (isAIAssistantEnabled) {
    items.push({ title: "AI Assistant", url: "/ai", icon: Brain });
  }

  return toSidebarItems(items);
}

export { APP_NAV, SUPER_ADMIN_CONSOLE };
