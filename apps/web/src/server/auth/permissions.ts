import { createAccessControl } from "better-auth/plugins/access";

export const statement = {
  user: [
    "create",
    "list",
    "get",
    "update",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
  ],
  session: ["list", "revoke", "delete"],
} as const;

export const ac = createAccessControl(statement);

export const adminRole = ac.newRole({
  user: [
    "create",
    "list",
    "get",
    "update",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
  ],
  session: ["list", "revoke", "delete"],
});

export const instructorRole = ac.newRole({
  user: [
    "create",
    "list",
    "get",
    "update",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
  ],
  session: ["list", "revoke", "delete"],
});

export const mentorRole = ac.newRole({
  user: ["list", "get"],
  session: [],
});

export const studentRole = ac.newRole({
  user: [],
  session: [],
});
