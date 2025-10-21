import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface GlobalConfig {
  apiBaseUrl: string;
  telemetry: boolean;
  updateNotifications: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

const CONFIG_DIR =
  process.platform === "win32"
    ? join(process.env.APPDATA || "", "tutly")
    : join(homedir(), ".config", "tutly");

const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");

export async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function getGlobalConfig(): Promise<GlobalConfig> {
  await ensureConfigDir();

  if (!existsSync(CONFIG_FILE)) {
    const defaultConfig: GlobalConfig = {
      apiBaseUrl: "https://learn.tutly.in/api",
      telemetry: true,
      updateNotifications: true,
    };
    await writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  const content = await readFile(CONFIG_FILE, "utf-8");
  return JSON.parse(content);
}

export async function setGlobalConfig(
  config: Partial<GlobalConfig>,
): Promise<void> {
  await ensureConfigDir();
  const current = await getGlobalConfig();
  const updated = { ...current, ...config };
  await writeFile(CONFIG_FILE, JSON.stringify(updated, null, 2));
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  await ensureConfigDir();

  if (!existsSync(AUTH_FILE)) {
    return null;
  }

  const content = await readFile(AUTH_FILE, "utf-8");
  return JSON.parse(content);
}

export async function setAuthTokens(tokens: AuthTokens): Promise<void> {
  await ensureConfigDir();
  await writeFile(AUTH_FILE, JSON.stringify(tokens, null, 2));
}

export async function clearAuthTokens(): Promise<void> {
  await ensureConfigDir();
  if (existsSync(AUTH_FILE)) {
    await writeFile(AUTH_FILE, "{}");
  }
}
