import { randomUUID } from "crypto";
import type { User } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { customSession } from "better-auth/plugins/custom-session";
import { username } from "better-auth/plugins/username";

import type { Db } from "@tutly/db";

import type { CustomSessionInput, CustomSessionResult } from "./session";
import { ac, ROLES } from "./permissions";

export interface CreateServerAuthOptions {
  secret: string;
  baseURL: string;
  db: Db;
  useSecureCookies: boolean;
  sendResetPassword: (params: {
    user: { id: string; email: string };
    url: string;
  }) => Promise<void>;
  customSessionHandler: (
    input: CustomSessionInput,
  ) => Promise<CustomSessionResult>;
  google?: { clientId: string; clientSecret: string };
  github?: { clientId: string; clientSecret: string };
  zoom?: { clientId: string; clientSecret: string };
  password: {
    hash: (plaintext: string) => Promise<string>;
    verify: (data: { password: string; hash: string }) => Promise<boolean>;
  };
  afterEmailVerification?: (user: User) => Promise<void>;
  trustedOrigins?: (request?: Request) => string[];
}

const NATIVE_TRUSTED_ORIGINS = [
  "tutly://",
  "tutly://*",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
];

export function createServerAuth(opts: CreateServerAuthOptions) {
  return betterAuth({
    secret: opts.secret,
    baseURL: opts.baseURL,
    database: prismaAdapter(opts.db, { provider: "postgresql" }),
    advanced: {
      useSecureCookies: opts.useSecureCookies,
      database: { generateId: () => randomUUID() },
      ipAddress: {
        ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
        disableIpTracking: false,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 30,
      },
    },
    user: {
      modelName: "User",
      fields: { emailVerified: "isEmailVerified" },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      password: opts.password,
      sendResetPassword: opts.sendResetPassword,
    },
    emailVerification: {
      afterEmailVerification: opts.afterEmailVerification,
    },
    socialProviders: {
      ...(opts.google?.clientId &&
        opts.google.clientSecret && {
          google: {
            clientId: opts.google.clientId,
            clientSecret: opts.google.clientSecret,
            disableSignUp: true,
          },
        }),
      ...(opts.github?.clientId &&
        opts.github.clientSecret && {
          github: {
            clientId: opts.github.clientId,
            clientSecret: opts.github.clientSecret,
            disableSignUp: true,
          },
        }),
      ...(opts.zoom?.clientId &&
        opts.zoom.clientSecret && {
          zoom: {
            clientId: opts.zoom.clientId,
            clientSecret: opts.zoom.clientSecret,
            disableSignUp: true,
          },
        }),
    },
    plugins: [
      expo(),
      username({
        usernameNormalization: (u) => u.toUpperCase(),
        displayUsernameNormalization: false,
        usernameValidator: (u) => Boolean(u && u.trim().length),
        displayUsernameValidator: (displayUsername) => {
          if (displayUsername) {
            throw new Error(
              "displayUsername is not allowed. Please use username only.",
            );
          }
          return true;
        },
      }),
      bearer(),
      admin({
        ac,
        adminRoles: ["ADMIN", "INSTRUCTOR", "SUPER_ADMIN"],
        impersonationSessionDuration: 60 * 60,
        roles: ROLES,
      }),
      customSession(opts.customSessionHandler),
    ],
    trustedOrigins: (request) => {
      const base = opts.trustedOrigins?.(request) ?? [];
      const all = [...base, ...NATIVE_TRUSTED_ORIGINS];
      const origin = request?.headers.get("origin");
      if (origin?.endsWith(".vercel.app")) all.push(origin);
      return all;
    },
  });
}

export type ServerAuth = ReturnType<typeof createServerAuth>;
