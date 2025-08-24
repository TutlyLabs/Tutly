import { redirect } from "next/navigation";
import { authClient } from "@/server/auth/client";
import { headers } from "next/headers";
import type { Course, Organization, Role, User } from "@prisma/client";
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

export async function getServerSession(): Promise<SessionWithUser | null> {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });
  if (session.error) {
    return null;
  }
  return session.data as any;
}

export async function getServerSessionOrRedirect(
  redirectTo = "/sign-in",
): Promise<SessionWithUser> {
  const session = await getServerSession();

  if (!session?.user) {
    redirect(redirectTo);
  }

  return session;
}
