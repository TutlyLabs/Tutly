---
"web": minor
---

Add API-key authentication and an agent-facing tRPC surface.

Requests to `/api/trpc` now authenticate with a browser cookie, a session
bearer token, or a `tutly_sk_*` API key. All three resolve to an identically
enriched session, and `ctx.authMethod` records which was used.

Adds `agent.*` procedures for class and assignment authoring: name-to-id
lookup, plus list/get/upsert/delete for both. `agent.assignments.upsert`
creates an assignment, its workspace config and its whole test suite in one
transaction. Writes accept `dryRun` and deletes report their blast radius
first.
