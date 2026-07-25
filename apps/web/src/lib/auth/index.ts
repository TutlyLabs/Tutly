"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { cache } from "react";
import type { SessionUser, SessionWithUser } from "@tutly/auth/session";

export type { SessionUser, SessionWithUser };

export const getServerSession = cache(
  async (): Promise<SessionWithUser | null> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session?.user) {
        return null;
      }
      return session as SessionWithUser;
    } catch {
      return null;
    }
  },
);

export async function getServerSessionOrRedirect(): Promise<SessionWithUser> {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return session;
}
