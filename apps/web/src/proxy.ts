import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildCorsHeaders, isTrustedOrigin } from "@/lib/cors";

const CORS_PATH_RE = /^\/api\//;

export function proxy(request: NextRequest) {
  const url = new URL(request.url);

  if (CORS_PATH_RE.test(url.pathname)) {
    const origin = request.headers.get("origin");
    if (!origin || !isTrustedOrigin(origin)) return NextResponse.next();

    const corsHeaders = buildCorsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const response = NextResponse.next();
    for (const [k, v] of Object.entries(corsHeaders)) {
      response.headers.set(k, v);
    }
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
