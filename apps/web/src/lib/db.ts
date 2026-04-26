// db lives in @tutly/db; this shim preserves apps/web's existing import path
// (`@/lib/db`) so the existing call sites compile unchanged.
export { db, PrismaClient } from "@tutly/db";
export * from "@tutly/db/browser";
