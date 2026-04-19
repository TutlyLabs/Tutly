"use server";

import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
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

export async function getServerSessionOrRedirect(): Promise<SessionWithUser> {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return session;
}
