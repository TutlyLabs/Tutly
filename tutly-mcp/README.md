# tutly-mcp

MCP server exposing Tutly's course, class, assignment and attendance tools to AI agents.

Calls the `agent.*` tRPC router on the Tutly web app via HTTP. Permissions,
validation and transactions all live server-side, so this package is a
transport — an agent can do exactly what the signed-in instructor could do in
the UI, and nothing more.

## Setup

1. Create an API key at `https://<your-tutly>/tutor/api-keys` (instructors
   only). It is shown once.
2. Open the project root `.env` (or copy `.env.example` if it doesn't exist) and fill in your `TUTLY_API_KEY`.
3. Install dependencies and run:

```bash
npm install
npm start
```

### Claude Code

```bash
claude mcp add tutly --env TUTLY_API_KEY=tutly_sk_... -- npx tsx /path/to/tutly-mcp/src/index.ts
```

### Claude Desktop / Cursor

`claude_desktop_config.json` (or Cursor's `mcp.json`):

```json
{
  "mcpServers": {
    "tutly": {
      "command": "npx",
      "args": ["tsx", "/path/to/tutly-mcp/src/index.ts"],
      "env": { "TUTLY_API_KEY": "tutly_sk_..." }
    }
  }
}
```

### Environment

| Variable         | Required | Default                  |
| ---------------- | -------- | ------------------------ |
| `TUTLY_API_KEY`  | yes      | —                        |
| `TUTLY_BASE_URL` | no       | `http://localhost:3000`  |

`TUTLY_BASE_URL` accepts a bare origin or one ending in `/api`.

## Tools

| Tool                       | Writes | What it does                                                   |
| -------------------------- | ------ | -------------------------------------------------------------- |
| `tutly_whoami`             |        | Who you are, and which courses you can act on                  |
| `tutly_resolve`            |        | Name → id for courses, classes, assignments                    |
| `tutly_list_courses`       |        | Courses you can manage                                         |
| `tutly_upsert_course`      | ✓      | Create/update a course                                         |
| `tutly_delete_course`      | ✓      | Delete a course                                                |
| `tutly_list_classes`       |        | Classes in a course                                            |
| `tutly_get_class`          |        | One class, with video, folder and attached assignments         |
| `tutly_upsert_class`       | ✓      | Create/update a class, its video and folder in one transaction |
| `tutly_delete_class`       | ✓      | Delete a class                                                 |
| `tutly_list_assignments`   |        | Assignments in a course or class                               |
| `tutly_get_assignment`     |        | One assignment, with workspace config and every test case      |
| `tutly_upsert_assignment`  | ✓      | Create/update an assignment **and its whole test suite**        |
| `tutly_delete_assignment`  | ✓      | Delete an assignment                                           |
| `tutly_attendance_summary` |        | What is recorded for a class                                   |
| `tutly_import_attendance`  | ✓      | Reconcile a meeting report against the roster and record it    |
| `tutly_clear_attendance`   | ✓      | Delete a class's attendance                                    |

## Key Patterns

**Every write takes `dryRun`.** Call it with `dryRun: true` first, show the user
the plan, then commit. Deletes report their blast radius before touching anything.

**`tutly_upsert_assignment` replaces the test suite** when `testCases` is
passed — it does not merge. Read the assignment first and resend the cases you
want to keep, or omit `testCases` to leave the suite alone.

**Linking assignments to classes** — use `tutly_upsert_assignment` with a
`classId` field to re-parent an assignment onto a class.

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌────┐
│ tutly-mcp   │────▶│ tRPC agent.*    │────▶│ Prisma       │────▶│ DB │
│ (stdio)     │ HTTP│ router (Next.js)│     │ (server-side)│     │    │
└─────────────┘     └─────────────────┘     └──────────────┘     └────┘
```

No direct database access. The MCP server is a thin HTTP client that calls the
Tutly web app's `agent.*` tRPC router, which handles all permissions, validation
and transactions.
