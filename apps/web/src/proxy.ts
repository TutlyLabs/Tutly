import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (process.env.NODE_ENV !== "production") {
    const syncSession = url.searchParams.get("sync_session");
    const syncData = url.searchParams.get("sync_data");

    const syncLogout = url.searchParams.get("sync_logout");

    if (syncLogout) {
      url.searchParams.delete("sync_logout");

      const response = NextResponse.redirect(url);
      const cookieOptions = {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: false,
        maxAge: 0,
      };

      response.cookies.set("better-auth.session_token", "", cookieOptions);
      response.cookies.set("better-auth.session_data", "", cookieOptions);
      response.cookies.set("better-auth.dont_remember", "", cookieOptions);

      return response;
    }

    if (syncSession) {
      url.searchParams.delete("sync_session");
      if (syncData) url.searchParams.delete("sync_data");

      const response = NextResponse.redirect(url);
      const cookieOptions = {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        secure: false,
      };

      response.cookies.set(
        "better-auth.session_token",
        syncSession,
        cookieOptions,
      );
      if (syncData) {
        response.cookies.set(
          "better-auth.session_data",
          syncData,
          cookieOptions,
        );
      }

      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-url", request.url);
  requestHeaders.set("x-forwarded-host", request.headers.get("host") || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export default proxy;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
