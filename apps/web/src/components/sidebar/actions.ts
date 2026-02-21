"use server";

import { auth } from "@/server/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthDomainUrl } from "@/lib/auth";

export async function logoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  const cookieStore = await cookies();
  const domain = process.env.NODE_ENV === "production" ? "tutly.in" : undefined;
  const options = {
    path: "/",
    domain,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set("better-auth.session_token", "", { ...options, maxAge: 0 });
  cookieStore.set("better-auth.session_data", "", { ...options, maxAge: 0 });
  cookieStore.set("better-auth.dont_remember", "", { ...options, maxAge: 0 });

  const authUrl = await getAuthDomainUrl("/sign-in");

  if (process.env.NODE_ENV !== "production") {
    const parsed = new URL(authUrl);
    parsed.searchParams.set("sync_logout", "true");
    redirect(parsed.toString());
  }

  redirect(authUrl);
}
