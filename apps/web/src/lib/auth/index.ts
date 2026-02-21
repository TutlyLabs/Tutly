"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { headers, cookies } from "next/headers";
import { cache } from "react";
import type { Course, Organization, Role, User } from "@/lib/prisma";
import type { Session } from "better-auth";

export type SessionUser = Omit<User, "password" | "oneTimePassword"> & {
  organization: Organization | null;
  role: Role;
  adminForCourses: Course[];
};

export type SessionWithUser = {
  user: SessionUser;
  session: Session;
};

export const getServerSession = cache(
  async (): Promise<SessionWithUser | null> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session) {
        return null;
      }
      return session as any;
    } catch {
      return null;
    }
  },
);

export async function getBaseDomain() {
  return process.env.NODE_ENV === "production" ? "tutly.in" : "localhost:3000";
}

export async function getProtocol() {
  return process.env.NODE_ENV === "production" ? "https" : "http";
}

export async function getAuthDomainUrl(
  path: string = "/sign-in",
  callbackUrl?: string,
) {
  const baseDomain = await getBaseDomain();
  const protocol = await getProtocol();
  let url = `${protocol}://auth.${baseDomain}${path}`;
  if (callbackUrl) {
    url += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  }
  return url;
}

export async function getPostLoginRedirectUrl(
  user: SessionUser,
): Promise<string> {
  const baseDomain = await getBaseDomain();
  const protocol = await getProtocol();

  if (user.role === "SUPER_ADMIN") {
    return `${protocol}://admin.${baseDomain}/super-admin`;
  }

  const org = user.organization;
  if (org) {
    if (org.customDomain) {
      const port = process.env.NODE_ENV === "production" ? "" : ":3000";
      return `${protocol}://${org.customDomain}${port}/dashboard`;
    } else if (org.subdomain) {
      return `${protocol}://${org.subdomain}.${baseDomain}/dashboard`;
    }
  }

  return `${protocol}://learn.${baseDomain}/dashboard`;
}

export async function getSyncRedirectUrl(
  url: string,
  token?: string,
): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const sessionToken =
      token || cookieStore.get("better-auth.session_token")?.value;

    if (sessionToken) {
      const parsedUrl = new URL(url);
      parsedUrl.searchParams.set("sync_session", sessionToken);

      const sessionData = cookieStore.get("better-auth.session_data")?.value;
      if (sessionData) {
        parsedUrl.searchParams.set("sync_data", sessionData);
      }
      return parsedUrl.toString();
    }
  }
  return url;
}

export async function getServerSessionOrRedirect(): Promise<SessionWithUser> {
  const session = await getServerSession();

  if (!session?.user) {
    const headersList = await headers();
    const currentUrl = headersList.get("x-url");

    const host =
      headersList.get("x-forwarded-host") || headersList.get("host") || "";
    const baseDomain = await getBaseDomain();

    if (host.startsWith(`auth.${baseDomain.split(":")[0]}`)) {
      redirect("/sign-in");
    } else {
      const authUrl = await getAuthDomainUrl(
        "/sign-in",
        currentUrl || undefined,
      );
      redirect(authUrl);
    }
  }

  return session;
}
