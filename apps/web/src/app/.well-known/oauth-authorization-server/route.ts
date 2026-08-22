import { mcpDiscoveryMetadata } from "@tutly/auth/mcp";
import { auth } from "@/server/auth";

/** RFC 8414 authorization server metadata. */
export const GET = mcpDiscoveryMetadata(auth);
