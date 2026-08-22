# @tutly/mcp

## 0.2.0

### Minor Changes

- [#159](https://github.com/TutlyLabs/Tutly/pull/159) [`62920bd`](https://github.com/TutlyLabs/Tutly/commit/62920bd006db6daebf7c2a2e6ea12a03a4bbbb01) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Add attendance import and ship the Tutly MCP server.

  `agent.attendance.import` reconciles a meeting participant report against the
  course roster. Identities resolve in confidence order (email, username, full
  name, roll-number prefix) and every row is reported as matched, ambiguous or
  unmatched, with absentees listed and prefix-only matches counted separately.
  Re-importing overwrites instead of failing.

  `@tutly/mcp` exposes the `agent.*` router as 13 MCP tools over stdio, so Claude
  Code, Claude Desktop, Cursor and other MCP clients can drive class, assignment
  and attendance work with an API key.

### Patch Changes

- [#161](https://github.com/TutlyLabs/Tutly/pull/161) [`3fefa25`](https://github.com/TutlyLabs/Tutly/commit/3fefa251df6e443fc91f55631cf31c9050257c87) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Build `dist` before packing so the published tarball is not empty.

  `changeset publish` runs `npm publish`, which does not build. Without a
  `prepack` script the tarball contained only `README.md` and `package.json`,
  so the `bin` entry pointed at a file that was never shipped. Mirrors the
  `prepack` that `apps/cli` already uses.
