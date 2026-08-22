import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@tutly/auth/access-control";
import type { Role } from "@tutly/db/browser";
import { auth } from "@/server/auth";

const handlers = toNextJsHandler(auth);

/**
 * The api-key plugin mounts `/api-key/*` here and requires only *a* session, so
 * without this any signed-in user could mint a key. Gating the UI alone would
 * not help — the endpoints are reachable directly.
 *
 * `/api-key/verify` is included: it reveals whether a key is valid, and
 * `resolveSession` calls it in-process rather than over HTTP.
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
