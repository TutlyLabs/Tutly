import type { OAuthAccessToken } from "better-auth/plugins/oidc-provider";
import {
  oAuthDiscoveryMetadata,
  oAuthProtectedResourceMetadata,
  withMcpAuth,
} from "better-auth/plugins";

import type { ServerAuth } from "./server";

export type { OAuthAccessToken };

/**
 * Endpoints the `mcp` plugin adds. Re-declared because `./server` registers it
 * as a widened `BetterAuthPlugin` (see the note there), and so callers never
 * import better-auth themselves.
 */
interface McpAuthApi {
  api: {
    getMcpSession: (opts: {
      headers: Headers;
    }) => Promise<OAuthAccessToken | null>;
    getMcpOAuthConfig: (...args: unknown[]) => unknown;
    getMCPProtectedResource: (...args: unknown[]) => unknown;
  };
  options: ServerAuth["options"];
}

const asMcpAuth = (auth: ServerAuth) => auth as unknown as McpAuthApi;

/**
 * Runs a handler only for a request with a valid MCP token. Otherwise returns
 * the 401 + `WWW-Authenticate` challenge that starts the OAuth flow.
 */
export function withTutlyMcpAuth(
  auth: ServerAuth,
  handler: (
    req: Request,
    token: OAuthAccessToken,
  ) => Response | Promise<Response>,
) {
  return withMcpAuth(asMcpAuth(auth), handler);
}

/** RFC 8414 authorization server metadata. */
export const mcpDiscoveryMetadata = (auth: ServerAuth) =>
  oAuthDiscoveryMetadata(asMcpAuth(auth));

/** RFC 9728 protected resource metadata, required by the MCP spec. */
export const mcpProtectedResourceMetadata = (auth: ServerAuth) =>
  oAuthProtectedResourceMetadata(asMcpAuth(auth));
