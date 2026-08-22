import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { TRPCError } from "@trpc/server";
import { createCaller, createTRPCContext } from "@tutly/api";
import { enrichSession } from "@tutly/auth/enrich-session";
import { withTutlyMcpAuth } from "@tutly/auth/mcp";
import { db } from "@tutly/db";
import { createLogger } from "@tutly/logger";
import { TOOLS, type ToolDefinition } from "@tutly/mcp-tools";
import { auth } from "@/server/auth";

const logger = createLogger("web:mcp");

type Caller = ReturnType<typeof createCaller>;

/** Tool definitions name procedures as strings; the router is nested. */
function resolveProcedure(caller: Caller, path: string) {
  const fn = path
    .split(".")
    .reduce<unknown>(
      (node, key) => (node as Record<string, unknown> | undefined)?.[key],
      caller,
    );
  if (typeof fn !== "function") {
    throw new Error(`Unknown procedure: ${path}`);
  }
  return fn as (input: unknown) => Promise<unknown>;
}

function toResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** Returned as results, not thrown, so the model can read and correct. */
function toErrorResult(error: unknown) {
  const text =
    error instanceof TRPCError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
  return { isError: true, content: [{ type: "text" as const, text }] };
}

function buildServer(caller: Caller, tools: ToolDefinition[]) {
  const server = new McpServer(
    { name: "tutly", version: "0.1.0" },
    {
      instructions:
        "Tools for running a Tutly course: classes, assignments and attendance.\n\n" +
        "Resolve names to ids with tutly_resolve before calling anything else. " +
        "For any write, call it once with dryRun true, show the user what would change, and only then commit. " +
        "tutly_upsert_assignment replaces the whole test suite when testCases is passed, so read the assignment first if you mean to keep existing cases.",
    },
  );

  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.readOnly,
          destructiveHint:
            tool.name.includes("delete") || tool.name.includes("clear"),
        },
      },
      async (input: Record<string, unknown>) => {
        try {
          // zod treats an absent optional differently from an explicit null.
          const cleaned = Object.fromEntries(
            Object.entries(input ?? {}).filter(
              ([, value]) => value !== undefined,
            ),
          );
          const procedure = resolveProcedure(caller, tool.procedure);
          return toResult(await procedure(cleaned));
        } catch (error) {
          logger.warn({ err: error, tool: tool.name }, "mcp tool call failed");
          return toErrorResult(error);
        }
      },
    );
  }

  return server;
}

/**
 * Remote MCP endpoint, authorized by OAuth rather than an API key. Tokens are
 * issued by this app, so a connector never holds a long-lived credential.
 * Procedures run in-process — no second network hop, no serialization.
 */
const handler = withTutlyMcpAuth(auth, async (req, token) => {
  const user = await db.user.findUnique({ where: { id: token.userId } });
  if (!user) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized: unknown user" },
        id: null,
      },
      { status: 401 },
    );
  }

  // Same enrichment as the browser and API-key paths; authorization needs
  // `role`, `organization` and `adminForCourses`.
  const enriched = await enrichSession({
    db,
    user: { id: user.id } as Parameters<typeof enrichSession>[0]["user"],
    session: {
      id: token.accessToken,
      token: token.accessToken,
      userId: token.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: token.accessTokenExpiresAt,
      ipAddress: req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    },
    // Background polling should not make a user look online.
    touchLastSeen: false,
    onError: (err) => logger.error({ err }, "mcp session enrichment failed"),
  });

  if (!enriched.user || !enriched.session) {
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Unauthorized: account unavailable" },
        id: null,
      },
      { status: 403 },
    );
  }

  const ctx = await createTRPCContext({
    headers: req.headers,
    session: { user: enriched.user, session: enriched.session },
    authMethod: "oauth",
  });

  const server = buildServer(createCaller(ctx), TOOLS);

  // Stateless: a route handler does not outlive the request.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
});

export { handler as POST };
