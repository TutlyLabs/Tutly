import { randomUUID } from "crypto";
import type { BetterAuthPlugin, User } from "better-auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { apiKey, mcp } from "better-auth/plugins";
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
  /**
   * Makes this instance the OAuth authorization server for a remote MCP
   * endpoint. Omit it where nothing serves one.
   */
  mcp?: {
    /**
     * Canonical MCP endpoint URL (RFC 8707), and the `aud` of every issued
     * token — changing it invalidates existing grants.
     */
    resource: string;
    loginPage?: string;
    consentPage?: string;
    /**
     * Off by default: Claude and ChatGPT both accept pre-registered
     * credentials, and DCR lets anyone who reaches the endpoint mint them.
     */
    allowDynamicClientRegistration?: boolean;
  };
}

export const API_KEY_PREFIX = "tutly_sk_";

/** 90 days, so a leaked key ages out. */
export const API_KEY_DEFAULT_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * The only scopes the plugin advertises — it hardcodes `scopes_supported`, so a
 * custom scope could never be discovered. Authorization is enforced by role
 * grants in the router regardless.
 *
 * `offline_access` matters: without a refresh token ChatGPT loses access when
 * the access token expires.
 */
export const MCP_SCOPES = ["openid", "profile", "email", "offline_access"];

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
      apiKey({
        defaultPrefix: API_KEY_PREFIX,
        requireName: true,
        // Records which client a key was minted for, for revocation.
        enableMetadata: true,
        keyExpiration: {
          defaultExpiresIn: API_KEY_DEFAULT_EXPIRY_MS,
          maxExpiresIn: 365,
        },
        rateLimit: {
          enabled: true,
          // The plugin default of 10/day would not survive one agent run.
          timeWindow: 60 * 60 * 1000,
          maxRequests: 3600,
        },
        // Would short-circuit /get-session and bypass customSession below,
        // yielding a user with no role. `resolveSession` handles keys instead.
        enableSessionForAPIKeys: false,
      }),
      admin({
        ac,
        adminRoles: ["ADMIN", "INSTRUCTOR", "SUPER_ADMIN"],
        impersonationSessionDuration: 60 * 60,
        roles: ROLES,
      }),
      ...(opts.mcp
        ? [
            // Widened deliberately: the plugin's types reference `MCPOptions`,
            // which 1.4.22 only exposes on an unexported subpath, making this
            // function's return type unnameable. `./mcp` re-declares what
            // callers need.
            mcp({
              loginPage: opts.mcp.loginPage ?? "/sign-in",
              resource: opts.mcp.resource,
              oidcConfig: {
                loginPage: opts.mcp.loginPage ?? "/sign-in",
                consentPage: opts.mcp.consentPage,
                scopes: MCP_SCOPES,
                allowDynamicClientRegistration:
                  opts.mcp.allowDynamicClientRegistration ?? false,
                // So a database leak cannot impersonate a client.
                storeClientSecret: "hashed",
                requirePKCE: true,
              },
            }) as BetterAuthPlugin,
          ]
        : []),
      // Must stay last: it overrides /get-session, which the MCP plugin reads.
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
