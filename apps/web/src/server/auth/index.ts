import { compare, hash } from "bcryptjs";
import { betterAuth, type Session, type User } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  username,
  admin,
  apiKey,
  customSession,
  bearer,
} from "better-auth/plugins";

import { getPreviewUrl } from "@/lib/constants";
import { db } from "../../lib/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date() },
      });

      if (updatedUser.disabledAt) {
        await db.session.deleteMany({ where: { userId: user.id } });
        return null;
      }

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
  roles: ["STUDENT", "INSTRUCTOR", "ADMIN"],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    },
    zoom: {
      clientId: process.env.ZOOM_CLIENT_ID ?? "",
      clientSecret: process.env.ZOOM_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    username(),
    admin({
      defaultRole: "STUDENT",
    }),
    apiKey(),
    bearer(),
    customSession(async ({ user, session }) => {
      const prismaUser = await db.user.findUnique({
        where: { id: user.id },
        include: {
          organization: true,
          adminForCourses: true,
        },
      });
      if (!prismaUser) return { user: null, session: null };

      if (prismaUser.disabledAt) {
        await db.session.deleteMany({ where: { userId: user.id } });
        return { session: null, user: null };
      }

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
  trustedOrigins: [getPreviewUrl() || "http://localhost:3000"],
});
