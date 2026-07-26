# Permissions

## The one rule

**Gating the UI is never a security boundary.** Hiding a button only stops an
honest user from clicking something that would fail anyway. Anyone can call the
endpoint directly. Every gate added in the UI must have a matching check on the
tRPC procedure, and the procedure is the one that counts.

Use UI gating for the affordance. Use the procedure for the guarantee.

## Where things live

| Module | Use from | Contents |
| --- | --- | --- |
| `@tutly/auth/permissions` | anywhere | `statement` (the resource/action table), `Resource`, `ActionsOf<R>`, `PermissionRequest`, `ROLES`, `ROLE_NAMES`, `ROLE_GRANTS` |
| `@tutly/auth/access-control` | anywhere | `hasPermission`, `hasAnyPermission`, `hasAllPermissions` — synchronous and browser-safe |
| `@/lib/permissions/core` | anywhere | `PermissionContext`, `PermissionCheck`, `can`, `canDo`, `isCourseAdmin` |
| `@/lib/permissions/client` | client components | `useCan`, `useCanAny`, `useCanAll`, `useIsCourseAdmin`, `usePermissionContext`, `<Can>` |
| `@/lib/permissions/server` | server components, layouts | `canServer`, `isCourseAdminServer`, `requirePermission`, `getPermissionContext` |

There is deliberately no barrel re-exporting both `client` and `server`: one is
`"use client"`, the other is `server-only`, and merging them poisons both.

## Roles are a strict hierarchy

```
STUDENT ⊆ MENTOR ⊆ INSTRUCTOR ⊆ ADMIN ⊆ SUPER_ADMIN
```

Each role's grants literally spread the one below, so the containment cannot
drift. Two consequences you will hit immediately:

1. **You cannot express "students only" as a grant.** Every grant a student
   holds, an instructor also holds. Learner-only UI uses `none` instead —
   "hidden from anyone holding the staff counterpart".
2. **ADMIN and INSTRUCTOR are currently indistinguishable.** `ADMIN_GRANTS` is
   `{ ...INSTRUCTOR_GRANTS }`. No permission check can separate them. Anywhere
   the UI must treat them differently, it still has to compare roles — and that
   is a signal the grant table needs a real ADMIN-only action, not that the
   helper is missing a feature.

## Gating a button

```tsx
import { Can } from "@/lib/permissions/client";

<Can resource="course" action="update">
  <Button onClick={editCourse}>Edit course</Button>
</Can>;
```

With a fallback:

```tsx
<Can resource="course" action="delete" fallback={<DisabledHint />}>
  <DeleteButton />
</Can>
```

When you need the boolean rather than the wrapper:

```tsx
const canEdit = useCan("course", "update");
```

`useCan("course", "nonsense")` is a compile error — actions are typed per
resource via `ActionsOf<R>`.

Multiple permissions:

```tsx
<Can any={[{ all: [{ course: ["update"] }] }, { all: [{ course: ["delete"] }] }]}>
<Can all={[{ all: [{ course: ["update"] }] }, { all: [{ class: ["create"] }] }]}>
```

Learner-only UI, using the staff marker:

```tsx
<Can check={{ none: [{ submission: ["list"] }] }}>
  <SubmitYourWork />
</Can>
```

## Gating a route

Server components and layouts should redirect rather than render a shell the
user cannot use:

```ts
import { requirePermission } from "@/lib/permissions/server";

export default async function Page() {
  const session = await requirePermission(
    { all: [{ course: ["manage"] }] },
    { redirectTo: "/dashboard" },
  );
  // ...
}
```

`requirePermission` sends anonymous visitors to `/sign-in` regardless of
`redirectTo`, and returns the session so you do not fetch it twice. For a plain
boolean, use `await canServer("course", "manage")`.

## Course-scoped admin

`user.adminForCourses` grants authority over specific courses and **cannot** be
expressed as a static role grant. Pass the course explicitly:

```tsx
<Can check={{ all: [{ class: ["create"] }], courseId }}>
  <AddClassButton />
</Can>
```

or `useIsCourseAdmin(courseId)` / `await isCourseAdminServer(courseId)`. Do not
approximate it with `role === "INSTRUCTOR"` — `courses/class/page.tsx:27` does
exactly that today and is wrong.

## `user.isAdmin` means two contradictory things

This is the single biggest trap in the codebase. `isAdmin` is a boolean column
on `User`, unrelated to the `ADMIN` role, and the two halves of the app read it
in opposite directions.

**It ESCALATES on the API.** `testRuns.reapStaleRuns` accepts
`INSTRUCTOR || isAdmin` — the flag *adds* a capability.

**It RESTRICTS in the UI.** `shouldAllowActions = role === "INSTRUCTOR" && !isAdmin`
— the flag *removes* affordances, treating an `isAdmin` instructor as a
read-only observer. Found at:

- `app/(protected)/tutor/manage-users/_components/UserPage.tsx:289` (gates five row-action buttons)
- `app/(protected)/courses/_components/CourseCard.tsx:32`
- `app/(protected)/courses/_components/CoursesPageClient.tsx:35`

And a third reading exists that is neither: in
`app/(protected)/community/_components/GroupInfoSheet.tsx` `isAdmin` means
*chat-group* admin, derived from group membership. Unrelated to the user column.

### The decision taken here

`isAdmin` is **not** modelled as a permission and is **not** folded into `can()`.
Folding it in would have to pick one meaning and would silently change the other
half of the app. Instead both readings are named explicitly in
`@/lib/permissions/core`, so a call site has to say which one it means and a
future cleanup can grep for them:

- `canActAsInstructor(ctx)` — the restricting reading, exactly `role === "INSTRUCTOR" && !isAdmin`
- `canEscalateViaIsAdmin(ctx, check)` — the escalating reading, exactly `isAdmin || can(ctx, check)`

Neither is used by the sidebar or by any converted call site yet; they exist so
the sweep does not have to re-invent the distinction per file.

### The sidebar's `isAdmin` branch was already dead

`getDefaultSidebarItems` previously routed an `isAdmin` INSTRUCTOR to a separate
`AdminItems` table. That table was **byte-identical** to `InstructorItems`, so
the branch never changed a single rendered entry. The parameter is still
accepted (so `AppSidebar` needs no change) and is now explicitly ignored;
`src/config/sidebar.test.ts` asserts `isAdmin: true` and `isAdmin: false` produce
identical navs for every role.

## The sidebar

`src/config/sidebar.ts` is now one ordered data table (`APP_NAV`) where each
entry declares the permission it needs, plus a pure `filterNavItems(items, ctx)`.
Groups are kept only when a child survives. Adding a nav item means adding a row,
not editing five per-role copies.

Two things the table cannot express purely, both documented in place:

- **The super-admin console replaces the app nav** rather than extending it, so
  it is a second table selected by `organization:list` (a SUPER_ADMIN-only
  grant).
- **The Integrations and AI Assistant entries are feature-flag gated only**, for
  every role, which is what the previous revision did. Gating "AI Assistant" on
  `ai:execute` (INSTRUCTOR+) would be more correct but would hide it from
  students who see it today, so it is deferred rather than changed silently.

`src/config/sidebar.test.ts` pins the derived nav against the previous
hand-written tables for all five roles, entry for entry, in order.

## Adding a resource or action

1. Add the action to the resource in `packages/auth/src/permissions.ts`
   (`statement`). Resources and actions are `as const`, so `Resource` and
   `ActionsOf<R>` pick it up immediately.
2. Grant it in the lowest role that should hold it, inside that role's
   `*_GRANTS`. Higher roles inherit it automatically via the spread — never add
   the same action to two tiers.
3. Enforce it on the tRPC procedure. **This is the security boundary.**
4. Only then gate the UI with `<Can>` / `useCan` / `requirePermission`.

If you find yourself wanting a grant that a *lower* role holds and a higher one
does not, stop: the hierarchy forbids it. Model it as a `none` check, or add a
distinguishing action to the higher role instead.

## Known disagreements, not yet resolved

These are places where the grant table and the shipped UI behaviour genuinely
conflict. Each preserves today's behaviour and is left for a follow-up.

| Site | Conflict |
| --- | --- |
| `app/(protected)/tutor/layout.tsx:7` | Allows `INSTRUCTOR`/`MENTOR` only, so `ADMIN` and `SUPER_ADMIN` are locked out of `/tutor/*` — but their sidebar still links there, so those links 404 for them. Inexpressible as a permission, since ADMIN and INSTRUCTOR hold identical grants. |
| `app/(protected)/tutor/glimpse/page.tsx:13`, `tutor/video-runs/page.tsx:126` | Additionally allow `ADMIN`/`SUPER_ADMIN`, but the parent layout has already rejected them — dead branches. |
| `app/(protected)/courses/manage/page.tsx:16` | `role !== "INSTRUCTOR"`. Converting to `course:manage` would newly admit `ADMIN`/`SUPER_ADMIN`. Correct under the new model, but a behaviour change. |
| `app/(protected)/ai/page.tsx:14` | Same shape: `role !== "INSTRUCTOR"` vs `ai:execute` (INSTRUCTOR+). |
| `app/(protected)/courses/class/page.tsx:27` | `isCourseAdmin = user.role === "INSTRUCTOR"` conflates global instructor with per-course admin. |
| `app/(protected)/courses/class/_components/Class.tsx:311` | Uses loose `==` for the role comparison. |
| `app/(protected)/tutor/manage-users/_components/UserPage.tsx:165` | `userRole` defaults to `"INSTRUCTOR"` when the prop is missing — fails **open**. |
| `app/(protected)/courses/manage/_components/UsersTable.tsx:53` | Role union omits `SUPER_ADMIN`. |
