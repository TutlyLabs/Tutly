import { PrismaClient } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { betterAuth, Session, User } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username, admin, apiKey, customSession } from 'better-auth/plugins';

import { FRONTEND_URL } from '../lib/constants';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date() },
      });
      return session;
    },
  },
  emailAndPassword: {
    enabled: true,
    verifyPassword: async (password: string, hashedPassword: string) => {
      const isValidPassword = await compare(password, hashedPassword);
      return isValidPassword;
    },
    hashPassword: async (password: string) => {
      const saltRounds = 10;
      return hash(password, saltRounds);
    },
  },
  roles: ['STUDENT', 'INSTRUCTOR', 'ADMIN'],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  plugins: [
    username(),
    admin({
      defaultRole: 'STUDENT',
    }),
    apiKey(),
    customSession(async ({ user, session }) => {
      const prismaUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          organization: true,
          adminForCourses: true,
        },
      });
      if (!prismaUser) return { user: null, session: null };

      return {
        user: {
          ...prismaUser,
          username: prismaUser.username,
          password: undefined,
          oneTimePassword: undefined,
        },
        session,
      };
    }),
  ],
  trustedOrigins: [FRONTEND_URL],
});
