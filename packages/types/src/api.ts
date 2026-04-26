import type { AnyTRPCRouter } from "@trpc/server";

/**
 * Phase 1: AppRouter is typed as a generic tRPC router so consumers (apps/mobile)
 * don't have to typecheck the entire `apps/web` source tree, which uses Next.js
 * path aliases (`@/...`) and Node-only imports (Prisma, S3) that won't resolve
 * outside of `apps/web/tsconfig.json`.
 *
 * Phase 2 will move the routers themselves into a `@tutly/api` package whose
 * tsconfig is self-contained, and this file will switch to:
 *
 *   export type { AppRouter } from "@tutly/api";
 *
 * giving mobile full procedure-level autocomplete back. Until then, mobile
 * call sites work at runtime but procedure inputs/outputs are typed as `any`.
 */
export type AppRouter = AnyTRPCRouter;
