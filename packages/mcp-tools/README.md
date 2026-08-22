# @tutly/mcp-tools

Transport-free MCP tool definitions over the `agent.*` tRPC router.

Both MCP hosts read this list:

- `apps/mcp` — stdio server, calls procedures over HTTP with an API key
- `apps/web/src/app/mcp` — remote server, calls procedures in-process behind OAuth

Each entry names its procedure as a dotted string (`agent.classes.list`) and
whether it is a query or a mutation. Nothing here knows how the call is made,
which is what keeps the two hosts from drifting apart.

Permissions, validation and transactions belong to the router, not here.
