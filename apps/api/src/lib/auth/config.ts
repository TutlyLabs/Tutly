import { randomBytes } from 'crypto';

import type { Course, Organization, Role, Session, User } from '@prisma/client';
import { compare } from 'bcryptjs';

import { db } from '../db';

import { generateRandomPassword } from './utils.js';

export type SessionUser = Omit<User, 'oneTimePassword'> & {
  organization: Organization | null;
  role: Role;
  adminForCourses: Array<Course>;
};

export type SessionWithUser = Session & {
  user: SessionUser;
};

export type SessionValidationResult = {
  session: SessionWithUser | null;
  user: SessionUser | null;
};

export const AUTH_COOKIE_NAME = 'tutly_session';

export const isSecureContext = process.env.NODE_ENV !== 'development';

export async function validateSessionToken(token: string): Promise<SessionValidationResult> {
  try {
    const session = await db.session.findUnique({
      where: { token },
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
      await db.session.delete({ where: { id: session.id } });
      return { session: null, user: null };
    }

    return {
      session: session as SessionWithUser,
      user: session.user as SessionUser,
    };
  } catch (error) {
    console.error('[Session] Error validating session:', error);
    return { session: null, user: null };
  }
}

export async function validateCredentials(identifier: string, password: string) {
  const isEmail = identifier.includes('@');
  const query = isEmail ? { email: identifier.toLowerCase() } : { username: identifier.toUpperCase() };

  const user = await db.user.findFirst({
    where: query,
    include: {
      organization: true,
    },
  });

  if (!user) {
    throw new Error(isEmail ? 'Email not found' : 'Username not found');
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

  const account = await db.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
  });

  if (!account?.password) {
    throw new Error('Password not set for this account');
  }

  const isValidPassword = await compare(password, account.password);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  return { user, isOneTimePassword: false };
}

export async function signInWithCredentials(identifier: string, password: string, userAgent?: string | null) {
  const { user, isOneTimePassword } = await validateCredentials(identifier, password);

  const sessionToken = randomBytes(32).toString('hex');

  const session = await db.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      userAgent: userAgent ?? 'Unknown Device',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    },
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

  const account = await db.account.findFirst({
    where: {
      userId: user.id,
      providerId: 'credential',
    },
  });

  return {
    sessionId: session.token,
    user: session.user as SessionUser,
    isPasswordSet: !!account?.password && !isOneTimePassword,
  };
}
