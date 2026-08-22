import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@tutly/auth/access-control";
import type { Role } from "@tutly/db/browser";
import { auth } from "@/server/auth";

const handlers = toNextJsHandler(auth);

/**
 * The api-key plugin mounts `/api-key/create|list|delete|update|get|verify`
 * here, and its own only requirement is *a* session — so without this gate any
 * signed-in student could mint a key. Gating the UI would not help: the
 * endpoints are reachable directly.
 *
 * A key inherits its owner's role, so this is not privilege escalation, but
 * issuing long-lived credentials is INSTRUCTOR+ by policy.
 *
 * `verifyApiKey` is covered too. It is an oracle for whether a key is valid,
 * and nothing needs it over HTTP: `resolveSession` calls it in-process.
 */
async function denyUnlessKeyIssuer(req: NextRequest) {
  if (!req.nextUrl.pathname.includes("/api-key/")) return null;

  const session = await auth.api.getSession({ headers: req.headers });
  const role = session?.user?.role as Role | undefined;

  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPermission(role, { apiKey: ["create"] })) {
    return NextResponse.json(
      { error: "API keys are available to instructors only" },
      { status: 403 },
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  return (await denyUnlessKeyIssuer(req)) ?? handlers.POST(req);
}

export async function GET(req: NextRequest) {
  return (await denyUnlessKeyIssuer(req)) ?? handlers.GET(req);
}
