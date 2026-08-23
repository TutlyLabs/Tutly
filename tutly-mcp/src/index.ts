#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

// Load .env from the project root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../..", ".env") });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TOOLS } from "./tools.js";
import { TutlyApiError, TutlyClient } from "./client.js";

const DEFAULT_BASE_URL = "http://localhost:3000";

function readConfig() {
  const apiKey = process.env.TUTLY_API_KEY?.trim();
  if (!apiKey) {
    // stdout is the JSON-RPC channel; a stray byte there breaks the transport.
    console.error(
      "TUTLY_API_KEY is not set. Create a key at <your-tutly>/tutor/api-keys and set it in your .env file.",
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
    { name: "tutly-mcp", version: "1.0.0" },
    {
      instructions:
        "Tools for running a Tutly course: courses, classes, assignments and attendance.\n\n" +
        "Resolve names to ids with tutly_resolve before calling anything else. " +
        "For any write, call it once with dryRun true, show the user what would change, and only then commit. " +
        "tutly_upsert_assignment replaces the whole test suite when testCases is passed, so read the assignment first if you mean to keep existing cases. " +
        "To link an assignment to a class, use tutly_upsert_assignment with the classId field.",
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
          const invoke =
            tool.kind === "query"
              ? client.query.bind(client)
              : client.mutate.bind(client);
          return toResult(await invoke(tool.procedure, cleaned));
        } catch (error) {
          return toErrorResult(error);
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());
  console.error(
    `Tutly MCP server started (stdio transport) | ${TOOLS.length} tools registered | API: ${baseUrl}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
