import { describe, expect, it } from "vitest";

import type { Grants, PermissionRequest, RoleName } from "./permissions";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from "./access-control";
import { ROLE_GRANTS, ROLE_NAMES, ROLES, statement } from "./permissions";

/** Roles ordered weakest to strongest; the superset chain follows this order. */
const HIERARCHY = [
  "STUDENT",
  "MENTOR",
  "INSTRUCTOR",
  "ADMIN",
  "SUPER_ADMIN",
] as const satisfies readonly RoleName[];

/**
 * Representative actions, one per interesting boundary. Each entry lists the
 * roles expected to hold it; every other role must be denied.
 */
const EXPECTED: {
  name: string;
  request: PermissionRequest;
  allowed: readonly RoleName[];
}[] = [
  {
    name: "course:read",
    request: { course: ["read"] },
    allowed: HIERARCHY,
  },
  {
    name: "course:create",
    request: { course: ["create"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "submission:submit",
    request: { submission: ["submit"] },
    allowed: HIERARCHY,
  },
  {
    name: "submission:evaluate",
    request: { submission: ["evaluate"] },
    allowed: ["MENTOR", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "submission:update",
    request: { submission: ["update"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "assignment:evaluate",
    request: { assignment: ["evaluate"] },
    allowed: ["MENTOR", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "enrollment:read",
    request: { enrollment: ["read"] },
    allowed: ["MENTOR", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "enrollment:assignMentor",
    request: { enrollment: ["assignMentor"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "attendance:create",
    request: { attendance: ["create"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "doubt:delete",
    request: { doubt: ["delete"] },
    allowed: HIERARCHY,
  },
  {
    name: "doubt:deleteAny",
    request: { doubt: ["deleteAny"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "testRun:rerun",
    request: { testRun: ["rerun"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "report:export",
    request: { report: ["export"] },
    allowed: ["MENTOR", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "user:updateProfile",
    request: { user: ["updateProfile"] },
    allowed: HIERARCHY,
  },
  {
    name: "user:bulkUpsert",
    request: { user: ["bulkUpsert"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "user:impersonate",
    request: { user: ["impersonate"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "chat:manage",
    request: { chat: ["manage"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "ai:execute",
    request: { ai: ["execute"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "video:captions",
    request: { video: ["captions"] },
    allowed: ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    name: "certificate:read",
    request: { certificate: ["read"] },
    allowed: HIERARCHY,
  },
  {
    name: "sandbox:cleanup",
    request: { sandbox: ["cleanup"] },
    allowed: HIERARCHY,
  },
  {
    name: "organization:create",
    request: { organization: ["create"] },
    allowed: ["SUPER_ADMIN"],
  },
  {
    name: "domain:provision",
    request: { domain: ["provision"] },
    allowed: ["SUPER_ADMIN"],
  },
];

function grantSet(grants: Grants): Set<string> {
  const entries = Object.entries(grants) as [string, readonly string[]][];
  return new Set(
    entries.flatMap(([resource, actions]) =>
      actions.map((action) => `${resource}:${action}`),
    ),
  );
}

describe("statement", () => {
  it("keeps better-auth's admin actions alongside Tutly's user actions", () => {
    for (const action of [
      "set-role",
      "ban",
      "impersonate",
      "set-password",
      "get",
    ]) {
      expect(statement.user).toContain(action);
    }
    for (const action of ["readProfile", "updateProfile", "bulkUpsert"]) {
      expect(statement.user).toContain(action);
    }
  });

  it("declares no duplicate actions within a resource", () => {
    for (const [resource, actions] of Object.entries(statement)) {
      expect(new Set(actions).size, resource).toBe(actions.length);
    }
  });
});

describe("ROLE_NAMES", () => {
  it("covers exactly the roles in the grant table", () => {
    expect([...ROLE_NAMES].sort()).toEqual(Object.keys(ROLES).sort());
    expect([...ROLE_NAMES].sort()).toEqual(Object.keys(ROLE_GRANTS).sort());
  });
});

describe("grant table", () => {
  for (const { name, request, allowed } of EXPECTED) {
    it(`${name} is held by exactly [${allowed.join(", ")}]`, () => {
      for (const role of ROLE_NAMES) {
        expect(hasPermission(role, request), `${role} -> ${name}`).toBe(
          allowed.includes(role),
        );
      }
    });
  }
});

describe("role hierarchy", () => {
  for (let i = 1; i < HIERARCHY.length; i++) {
    const lower = HIERARCHY[i - 1]!;
    const higher = HIERARCHY[i]!;

    it(`${higher} grants are a superset of ${lower}`, () => {
      const lowerGrants = grantSet(ROLE_GRANTS[lower]);
      const higherGrants = grantSet(ROLE_GRANTS[higher]);
      const missing = [...lowerGrants].filter((g) => !higherGrants.has(g));
      expect(missing).toEqual([]);
    });

    it(`${higher} authorizes everything ${lower} authorizes`, () => {
      for (const permission of grantSet(ROLE_GRANTS[lower])) {
        const [resource, action] = permission.split(":") as [string, string];
        const request = { [resource]: [action] } as PermissionRequest;
        expect(hasPermission(higher, request), permission).toBe(true);
      }
    });
  }

  it("SUPER_ADMIN is strictly stronger than ADMIN", () => {
    const admin = grantSet(ROLE_GRANTS.ADMIN);
    const superAdmin = grantSet(ROLE_GRANTS.SUPER_ADMIN);
    expect(superAdmin.size).toBeGreaterThan(admin.size);
  });

  it("ADMIN is at least as strong as INSTRUCTOR", () => {
    expect(grantSet(ROLE_GRANTS.ADMIN)).toEqual(
      grantSet(ROLE_GRANTS.INSTRUCTOR),
    );
  });
});

describe("hasPermission", () => {
  it("denies null, undefined and unknown roles", () => {
    const request: PermissionRequest = { course: ["read"] };
    expect(hasPermission(null, request)).toBe(false);
    expect(hasPermission(undefined, request)).toBe(false);
    // Roles arriving from untrusted input are not guaranteed to be valid.
    expect(hasPermission("GUEST" as unknown as RoleName, request)).toBe(false);
    expect(hasPermission("" as unknown as RoleName, request)).toBe(false);
  });

  it("denies an unknown action on a known resource", () => {
    expect(
      hasPermission("SUPER_ADMIN", {
        course: ["teleport"],
      } as unknown as PermissionRequest),
    ).toBe(false);
  });
});

describe("hasAnyPermission / hasAllPermissions", () => {
  const requests: PermissionRequest[] = [
    { course: ["read"] },
    { organization: ["create"] },
  ];

  it("combines requests correctly", () => {
    expect(hasAnyPermission("STUDENT", requests)).toBe(true);
    expect(hasAllPermissions("STUDENT", requests)).toBe(false);
    expect(hasAllPermissions("SUPER_ADMIN", requests)).toBe(true);
  });

  it("denies everything for a missing role", () => {
    expect(hasAnyPermission(null, requests)).toBe(false);
    expect(hasAllPermissions(null, requests)).toBe(false);
    // Vacuous truth is the documented behaviour for an empty request list.
    expect(hasAllPermissions(null, [])).toBe(true);
  });
});
