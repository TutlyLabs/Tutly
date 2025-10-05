import { db } from "@/lib/db";

export type FeatureUser = {
  id: string | number;
  role: string;
};

export async function isFeatureEnabled(
  flagKey: string,
  user: FeatureUser,
): Promise<boolean> {
  try {
    const flag = await db.featureFlag.findUnique({ where: { key: flagKey } });
    if (flag) {
      const roles = flag.allowedRoles as string[] | undefined;
      const roleAllowed =
        !roles || roles.length === 0 || roles.includes(user.role);
      return Boolean(flag.enabled && roleAllowed);
    }
  } catch {}
  return false;
}

export async function getFeatureFlagPayload<T = unknown>(
  flagKey: string,
  _user: FeatureUser,
): Promise<T | undefined> {
  try {
    const flag = await db.featureFlag.findUnique({ where: { key: flagKey } });
    if (flag && flag.payload != null) {
      return flag.payload as T;
    }
  } catch {}
  return undefined;
}
