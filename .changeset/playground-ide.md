---
"web": minor
---

Playground IDE rewrite on a self-hosted Sandpack bundler.

- New IDE (file tree, Monaco editor with tabs + split panes, console / problems / tests panel, preview, settings, command palette, optional 2-way local folder sync) replacing the old `SandpackCodeEditor` + `SandpackPreview` layout at `/playgrounds` and `/playgrounds/sandbox`.
- Sandpack bundler is now served from `/sandpack` on the same origin, built from `ghcr.io/tutlylabs/sandbox` and copied into `apps/web/public/sandpack` at image build time. `NEXT_PUBLIC_SANDPACK_BUNDLER_URL` controls the iframe URL; `NEXT_PUBLIC_SANDPACK_STATIC_BUNDLER_URL` is no longer read.
- Template chooser now lists only browser-runnable templates (static, vanilla, react, vue, svelte, solid, angular, …). Legacy keys (`vite-*`, `nextjs`, `node`, `astro`) are aliased to the closest equivalent so existing assignments keep loading.
- Static-template preview rendered via `srcDoc` with debounced updates and a per-file inline CSS / JS pipeline — strips root-relative `<link>` / `<script>` refs that would 404 inside the sandboxed iframe.
- Submission flow (`Submit.tsx`, `SubmitAssignment`, `SandboxHeader`) is unchanged; the new IDE just consumes the same `useSandpack()` files.
