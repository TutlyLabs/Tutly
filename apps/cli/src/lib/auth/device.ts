import { z } from "zod";
import { input } from "@inquirer/prompts";

import {
  clearAuthTokens,
  getAuthTokens,
  getGlobalConfig,
  setAuthTokens,
} from "../config/global";

const SignInResponse = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  session: z.object({
    id: z.string(),
    token: z.string(),
    expiresAt: z.string(),
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

  // Sign in with Better Auth
  const response = await fetch(`${config.apiBaseUrl}/auth/sign-in/username`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Authentication failed" }));
    throw new Error(error.message || "Authentication failed");
  }

  const data = SignInResponse.parse(await response.json());
  
  const bearerToken = response.headers.get("set-auth-token");
  
  if (!bearerToken) {
    throw new Error("No authentication token received");
  }

  // Store tokens
  const authTokens: AuthTokens = {
    accessToken: bearerToken,
    expiresAt: new Date(data.session.expiresAt).getTime(),
  };

  await setAuthTokens(authTokens);
  return authTokens;
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
        },
      });
    } catch {
    }
  }

  await clearAuthTokens();
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
  username: string;
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
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
