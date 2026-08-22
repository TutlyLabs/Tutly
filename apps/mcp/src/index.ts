import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TutlyApiError, TutlyClient } from "./client.js";
import { TOOLS } from "./tools.js";

const DEFAULT_BASE_URL = "https://learn.tutly.in";

function readConfig() {
  const apiKey = process.env.TUTLY_API_KEY?.trim();
  if (!apiKey) {
    // stdout is the JSON-RPC channel; a stray byte there breaks the transport.
    console.error(
      "TUTLY_API_KEY is not set. Create a key at <your-tutly>/tutor/api-keys and set it in the MCP server config.",
    );
    process.exit(1);
  }
  return {
    apiKey,
    baseUrl: process.env.TUTLY_BASE_URL?.trim() ?? DEFAULT_BASE_URL,
  };
}

/**
 * Errors return as results rather than throwing, so the model can read the
 * tRPC message and correct itself.
 */
function toResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

function toErrorResult(error: unknown) {
  if (error instanceof TutlyApiError) {
    const hint =
      error.code === "UNAUTHORIZED"
        ? " The API key may be expired or revoked."
        : error.code === "FORBIDDEN"
          ? " This action needs instructor permissions on that course."
          : "";
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `${error.code}: ${error.message}${hint}`,
        },
      ],
    };
  }
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
  };
}

async function main() {
  const { apiKey, baseUrl } = readConfig();
  const client = new TutlyClient({ baseUrl, apiKey });

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

  for (const tool of TOOLS) {
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
          return toResult(await tool.run(client, cleaned));
        } catch (error) {
          return toErrorResult(error);
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
