---
"@tutly/mcp": patch
---

Build `dist` before packing so the published tarball is not empty.

`changeset publish` runs `npm publish`, which does not build. Without a
`prepack` script the tarball contained only `README.md` and `package.json`,
so the `bin` entry pointed at a file that was never shipped. Mirrors the
`prepack` that `apps/cli` already uses.
