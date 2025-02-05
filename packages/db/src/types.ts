import type { roleEnum, user } from "./schema";

export type User = typeof user.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
