---
"web": minor
"@tutly/mcp": minor
---

Add attendance import and ship the Tutly MCP server.

`agent.attendance.import` reconciles a meeting participant report against the
course roster. Identities resolve in confidence order (email, username, full
name, roll-number prefix) and every row is reported as matched, ambiguous or
unmatched, with absentees listed and prefix-only matches counted separately.
Re-importing overwrites instead of failing.

`@tutly/mcp` exposes the `agent.*` router as 13 MCP tools over stdio, so Claude
Code, Claude Desktop, Cursor and other MCP clients can drive class, assignment
and attendance work with an API key.
