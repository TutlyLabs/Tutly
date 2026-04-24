export function unwrapData<T = unknown>(value: unknown): T | undefined {
  if (!value || typeof value !== "object") return undefined;
  if ("data" in value) return (value as { data?: T }).data;
  return value as T;
}

export function asArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const data = unwrapData(value);
  if (Array.isArray(data)) return data as T[];
  return [];
}

export function nestedArray<T = unknown>(value: unknown, keys: string[]): T[] {
  let cursor = unwrapData(value) as Record<string, unknown> | undefined;
  for (const key of keys) {
    if (!cursor || typeof cursor !== "object") return [];
    cursor = cursor[key] as Record<string, unknown> | undefined;
  }
  return Array.isArray(cursor) ? (cursor as T[]) : [];
}

export function formatCount(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value) || 0;
  return 0;
}
