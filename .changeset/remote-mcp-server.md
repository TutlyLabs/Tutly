---
"web": minor
---

Add a remote MCP server so Claude and ChatGPT can connect over OAuth.

`POST /mcp` serves the same 13 tools as `@tutly/mcp` using Streamable HTTP,
authorized by OAuth 2.1 rather than an API key. better-auth acts as the
authorization server, so a connector never holds a long-lived credential:
users click Connect, sign in with their Tutly account, and access is revoked
by revoking the grant. Adds the RFC 9728 and RFC 8414 discovery documents the
MCP spec requires.

Tool definitions move to `@tutly/mcp-tools` so the stdio and remote hosts
cannot drift; procedures run in-process here, so there is no second network
hop. Also reserves the `mcp` subdomain, which an organization could otherwise
claim.
