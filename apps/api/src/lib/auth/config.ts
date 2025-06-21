import type { Course, Organization, Role, Session, User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { compare } from "bcryptjs";

import { db } from "@tutly/db";

import { generateRandomPassword } from "./utils";

export type SessionUser = Omit<User, "password" | "oneTimePassword"> & {
  organization: Organization | null;
  role: Role;
  adminForCourses: Course[];
};

export type SessionWithUser = Session & {
  user: SessionUser;
};

export interface SessionValidationResult {
  session: SessionWithUser | null;
  user: SessionUser | null;
}

export const AUTH_COOKIE_NAME = "tutly_session";

export const isSecureContext = process.env.NODE_ENV !== "development";

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  try {
    const session = await db.session.findUnique({
      where: { id: token },
      include: {
        user: {
          include: {
            organization: true,
            profile: true,
            adminForCourses: true,
          },
        },
      },
    });

    if (!session?.user) {
      return { session: null, user: null };
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { lastSeen: new Date() },
    });

    if (Date.now() >= session.expiresAt.getTime()) {
      await db.session.delete({ where: { id: token } });
      return { session: null, user: null };
    }

    return {
      session: session as SessionWithUser,
      user: session.user as SessionUser,
    };
  } catch (error) {
    console.error("[Session] Error validating session:", error);
    return { session: null, user: null };
  }
}

export async function getServerSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const { session, user } = await validateSessionToken(sessionId);
  return { session, user };
}

export async function getServerSessionOrRedirect(
  redirectTo = "/sign-in",
): Promise<{ session: SessionWithUser; user: SessionUser }> {
  const result = await getServerSession();

  if (!result?.user) {
    redirect(redirectTo);
  }

  return result as { session: SessionWithUser; user: SessionUser };
}

export async function validateCredentials(
  identifier: string,
  password: string,
) {
  const isEmail = identifier.includes("@");
  const query = isEmail
    ? { email: identifier.toLowerCase() }
    : { username: identifier.toUpperCase() };

  const user = await db.user.findFirst({
    where: query,
    select: {
      id: true,
      email: true,
      username: true,
      password: true,
      oneTimePassword: true,
      name: true,
      image: true,
      role: true,
      organization: true,
    },
  });

  if (!user) {
    throw new Error(isEmail ? "Email not found" : "Username not found");
  }

  if (password === user.oneTimePassword) {
    await db.user.update({
      where: { id: user.id },
      data: {
        oneTimePassword: generateRandomPassword(8),
      },
    });
    return { user, isOneTimePassword: true };
  }

  if (!user.password) {
    throw new Error("Password not set for this account");
  }

  const isValidPassword = await compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid password");
  }

  return { user, isOneTimePassword: false };
}

export async function signInWithCredentials(
  identifier: string,
  password: string,
  userAgent?: string | null,
) {
  const { user, isOneTimePassword } = await validateCredentials(
    identifier,
    password,
  );

  const session = await db.session.create({
    data: {
      userId: user.id,
      userAgent: userAgent ?? "Unknown Device",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    },
    include: {
      user: {
        include: {
          organization: true,
          profile: true,
        },
      },
    },
  });

  return {
    sessionId: session.id,
    user: session.user,
    isPasswordSet: !!user.password && !isOneTimePassword,
  };
}
