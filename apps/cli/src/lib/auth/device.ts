import { input } from "@inquirer/prompts";
import { z } from "zod";

import {
  clearAuthTokens,
  getAuthTokens,
  getGlobalConfig,
  setAuthTokens,
} from "../config/global";
import { CLI_USER_AGENT } from "../constants";

const SignInResponse = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    username: z.string(),
    image: z.string().nullable().optional(),
    emailVerified: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

const SessionResponse = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    username: z.string(),
    role: z.string().optional(),
    organizationId: z.string().optional(),
    organization: z
      .object({
        id: z.string(),
        orgCode: z.string(),
        name: z.string(),
      })
      .nullable()
      .optional(),
  }),
  session: z.object({
    id: z.string(),
    token: z.string(),
    expiresAt: z.string(),
    userId: z.string(),
  }),
});

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export async function login(): Promise<AuthTokens> {
  const config = await getGlobalConfig();

  const username = await input({
    message: "Enter your username:",
    required: true,
  });

  const password = await input({
    message: "Enter your password:",
    required: true,
  });

  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/sign-in/username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": CLI_USER_AGENT,
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Authentication failed" }));
      throw new Error(error.message || "Authentication failed");
    }

    const data = SignInResponse.parse(await response.json());

    const bearerToken = response.headers.get("set-auth-token") || data.token;

    if (!bearerToken) {
      throw new Error("No authentication token received from server");
    }

    let expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // Default 7 days fallback

    try {
      const sessionResponse = await fetch(
        `${config.apiBaseUrl}/auth/get-session`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            "User-Agent": CLI_USER_AGENT,
          },
        },
      );

      if (sessionResponse.ok) {
        const sessionData = SessionResponse.parse(await sessionResponse.json());
        if (sessionData.session.expiresAt) {
          expiresAt = new Date(sessionData.session.expiresAt).getTime();
        }
      }
    } catch {}

    // Store tokens
    const authTokens: AuthTokens = {
      accessToken: bearerToken,
      expiresAt,
    };

    await setAuthTokens(authTokens);
    return authTokens;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("fetch failed")) {
        throw new Error(
          `Cannot connect to ${config.apiBaseUrl}. Is the server running?`,
        );
      }
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  const tokens = await getAuthTokens();
  const config = await getGlobalConfig();

  if (tokens) {
    try {
      await fetch(`${config.apiBaseUrl}/auth/sign-out`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "User-Agent": CLI_USER_AGENT,
        },
      });
    } catch {}
  }

  await clearAuthTokens();
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  username: string;
  role?: string;
  organizationId?: string;
  orgCode?: string;
  sessionId?: string;
} | null> {
  const tokens = await getAuthTokens();
  if (!tokens || Date.now() >= tokens.expiresAt) {
    return null;
  }

  const config = await getGlobalConfig();

  try {
    const response = await fetch(`${config.apiBaseUrl}/auth/get-session`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "User-Agent": CLI_USER_AGENT,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = SessionResponse.parse(await response.json());

    if (data.session.expiresAt) {
      const newExpiresAt = new Date(data.session.expiresAt).getTime();
      if (newExpiresAt !== tokens.expiresAt) {
        await setAuthTokens({
          ...tokens,
          expiresAt: newExpiresAt,
        });
      }
    }

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      username: data.user.username,
      role: data.user.role,
      organizationId: data.user.organizationId,
      orgCode: data.user.organization?.orgCode,
      sessionId: data.session.id,
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
