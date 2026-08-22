# @tutly/mcp

MCP server exposing Tutly's class, assignment and attendance tools to AI agents.

Wraps the `agent.*` tRPC router. Permissions, validation and transactions all
live server-side, so this package is a transport — an agent can do exactly what
the signed-in instructor could do in the UI, and nothing more.

## Setup

1. Create an API key at `https://<your-tutly>/tutor/api-keys` (instructors
   only). It is shown once.
2. Point your MCP client at the server.

### Claude Code

```bash
claude mcp add tutly --env TUTLY_API_KEY=tutly_sk_... -- npx -y @tutly/mcp
```

### Claude Desktop / Cursor

`claude_desktop_config.json` (or Cursor's `mcp.json`):

```json
{
  "mcpServers": {
    "tutly": {
      "command": "npx",
      "args": ["-y", "@tutly/mcp"],
      "env": { "TUTLY_API_KEY": "tutly_sk_..." }
    }
  }
}
```

### Environment

| Variable         | Required | Default                  |
| ---------------- | -------- | ------------------------ |
| `TUTLY_API_KEY`  | yes      | —                        |
| `TUTLY_BASE_URL` | no       | `https://learn.tutly.in` |

`TUTLY_BASE_URL` accepts a bare origin or one ending in `/api`. Self-hosted
instances should set it.

## Tools

| Tool                       | Writes | What it does                                                   |
| -------------------------- | ------ | -------------------------------------------------------------- |
| `tutly_whoami`             |        | Who you are, and which courses you can act on                  |
| `tutly_resolve`            |        | Name → id for courses, classes, assignments                    |
| `tutly_list_classes`       |        | Classes in a course                                            |
| `tutly_get_class`          |        | One class, with video, folder and attached assignments         |
| `tutly_upsert_class`       | ✓      | Create/update a class, its video and folder in one transaction |
| `tutly_delete_class`       | ✓      | Delete a class                                                 |
| `tutly_list_assignments`   |        | Assignments in a course or class                               |
| `tutly_get_assignment`     |        | One assignment, with workspace config and every test case      |
| `tutly_upsert_assignment`  | ✓      | Create/update an assignment **and its whole test suite**       |
| `tutly_delete_assignment`  | ✓      | Delete an assignment                                           |
| `tutly_attendance_summary` |        | What is recorded for a class                                   |
| `tutly_import_attendance`  | ✓      | Reconcile a meeting report against the roster and record it    |
| `tutly_clear_attendance`   | ✓      | Delete a class's attendance                                    |

## Two things worth knowing

**Every write takes `dryRun`.** Call it with `dryRun: true` first, show the user
the plan, then commit. Deletes report their blast radius (how many submissions,
attendance rows and attachments would go) before touching anything.

**`tutly_upsert_assignment` replaces the test suite** when `testCases` is
passed — it does not merge. Read the assignment first and resend the cases you
want to keep, or omit `testCases` to leave the suite alone. Diffing by title
would silently keep a stale case whose command the author meant to change.

## Attendance import

You parse the export; the server resolves identities. Zoom, Meet and Teams all
export differently, and a model reading a spreadsheet handles that better than a
fixed parser — but matching names to students is where mistakes get silently
baked in, so that happens server-side.

Identities resolve in confidence order: **email → username → full name →
roll-number prefix**. The response sorts every row into `matched`, `ambiguous`
or `unmatched`, lists enrolled students absent from the report, and reports
`weakMatches` — rows matched only by name prefix. That last count matters: a
student who renames themselves in the meeting is exactly the case the old
spreadsheet flow dropped without warning.

Re-importing is safe. It overwrites existing rows for the same students by
default.

## Development

```bash
pnpm --filter @tutly/mcp build
pnpm --filter @tutly/mcp test
```

Smoke-test the stdio transport without a live server:

```bash
printf '%s\n%s\n%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' \
 '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 | TUTLY_API_KEY=dummy node dist/index.js
```
