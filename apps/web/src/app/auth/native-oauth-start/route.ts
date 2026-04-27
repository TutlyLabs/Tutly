import type { NextRequest } from "next/server";

import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider");
  const next = req.nextUrl.searchParams.get("next") ?? "/auth/post-login";

  if (provider !== "google" && provider !== "github") {
    return new Response("Invalid provider", { status: 400 });
  }

  const callbackURL = `/auth/native-bridge?next=${encodeURIComponent(next)}`;

  const upstream = await auth.api.signInSocial({
    body: { provider, callbackURL },
    headers: req.headers,
    asResponse: true,
  });

  let oauthUrl: string | undefined;
  try {
    const data = (await upstream.clone().json()) as { url?: string };
    oauthUrl = data?.url;
  } catch {
    // upstream may already be a redirect; fall through
  }

  if (!oauthUrl) {
    const loc = upstream.headers.get("location");
    if (loc) oauthUrl = loc;
  }

  if (!oauthUrl) {
    return new Response("Failed to start OAuth", { status: 500 });
  }

  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") headers.append(key, value);
  });
  headers.set("Location", oauthUrl);
  return new Response(null, { status: 302, headers });
}
