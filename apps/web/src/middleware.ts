import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@tutly/auth";
import { NODE_ENV } from "@/lib/constants";

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;
  const publicRoutes = ["/sign-in", "/sign-up", "/forgot-password"];

  // Skip middleware for API routes and tRPC requests
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/trpc")
  ) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (sessionId) {
    // Forward the session ID to the API route for validation
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-id", sessionId);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    logRequest(
      request.method,
      pathname,
      response.status,
      Date.now() - start,
      "validating",
    );
    return response;
  }

  // No session cookie and trying to access protected route
  if (!publicRoutes.includes(pathname)) {
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    logRequest(
      request.method,
      pathname,
      response.status,
      Date.now() - start,
      null,
    );
    return response;
  }

  const response = NextResponse.next();
  logRequest(
    request.method,
    pathname,
    response.status,
    Date.now() - start,
    null,
  );
  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - trpc (tRPC requests)
     */
    "/((?!_next/static|_next/image|favicon.ico|public/|trpc/).*)",
  ],
};

function logRequest(
  method: string,
  path: string,
  status: number,
  time: number,
  userId: string | null,
) {
  if (NODE_ENV === "production") {
    console.log(
      `=>[${method}] ${path} - ${status} - ${time}ms - User: ${userId ?? "anonymous"}`,
    );

    if (status === 302) {
      console.log("Redirecting to:", path);
    }
  }
}
