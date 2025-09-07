import { z } from "zod";

import {
  clearAuthTokens,
  getAuthTokens,
  getGlobalConfig,
  setAuthTokens,
} from "../config/global";

const DeviceCodeResponse = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  verification_uri_complete: z.string().optional(),
  expires_in: z.number(),
  interval: z.number(),
});

const TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});

const TokenError = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export async function login(): Promise<AuthTokens> {
  const config = await getGlobalConfig();

  // Start device flow
  const deviceResponse = await fetch(`${config.apiBaseUrl}/oauth/device-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.TUTLY_CLIENT_ID || "tutly-cli",
      scope: "read write",
    }),
  });

  if (!deviceResponse.ok) {
    throw new Error(
      `Failed to start device flow: ${deviceResponse.statusText}`,
    );
  }

  const deviceData = DeviceCodeResponse.parse(await deviceResponse.json());

  console.log(`\nPlease visit: ${deviceData.verification_uri}`);
  console.log(`Enter code: ${deviceData.user_code}\n`);

  // Open browser if possible
  try {
    const { default: open } = await import("open");
    await open(
      deviceData.verification_uri_complete || deviceData.verification_uri,
    );
  } catch (error) {
    // Ignore if we can't open browser
  }

  // Poll for token
  const startTime = Date.now();
  const expiresAt = startTime + deviceData.expires_in * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) =>
      setTimeout(resolve, deviceData.interval * 1000),
    );

    const tokenResponse = await fetch(`${config.apiBaseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceData.device_code,
        client_id: process.env.TUTLY_CLIENT_ID || "tutly-cli",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenResponse.ok) {
      const tokens = TokenResponse.parse(tokenData);
      const authTokens: AuthTokens = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      await setAuthTokens(authTokens);
      return authTokens;
    }

    const error = TokenError.parse(tokenData);
    if (error.error === "authorization_pending") {
      continue;
    }

    throw new Error(
      `Authentication failed: ${error.error_description || error.error}`,
    );
  }

  throw new Error("Authentication timed out");
}

export async function logout(): Promise<void> {
  await clearAuthTokens();
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  const tokens = await getAuthTokens();
  if (!tokens || Date.now() >= tokens.expiresAt) {
    return null;
  }

  const config = await getGlobalConfig();

  try {
    const response = await fetch(`${config.apiBaseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
