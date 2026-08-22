import { mcpProtectedResourceMetadata } from "@tutly/auth/mcp";
import { auth } from "@/server/auth";

/** RFC 9728 protected resource metadata, required by the MCP spec. */
export const GET = mcpProtectedResourceMetadata(auth);
