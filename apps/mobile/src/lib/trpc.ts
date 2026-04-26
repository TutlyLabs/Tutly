import { createTRPCReact } from "@trpc/react-query";
import { createTrpcClientConfig } from "@tutly/api-client";
import type { AppRouter } from "@tutly/types";

import { nativeBearerStorage } from "@/native/storage";
import { API_BASE_URL, IS_DEV } from "@/lib/env";

// Phase 1: AppRouter is a generic AnyTRPCRouter, which trips tRPC's
// procedure-name-collision detection. The result is cast to `unknown` and
// then to a permissive proxy shape so call sites compile. Phase 2 (when
// routers move to a self-contained @tutly/api package) replaces this with
// full procedure-level types.
type TrpcProxy = {
  Provider: React.ComponentType<{
    client: unknown;
    queryClient: unknown;
    children: React.ReactNode;
  }>;
  createClient: (config: unknown) => unknown;
} & {
  [router: string]: {
    [procedure: string]: {
      // Procedure return shape is intentionally permissive in Phase 1.
      useQuery: <T = unknown>(input?: unknown) => {
        data?: T;
        error?: { message: string } | null;
        isLoading: boolean;
      };
    };
  };
};

export const trpc = createTRPCReact<AppRouter>() as unknown as TrpcProxy;

export function createMobileTrpcClient() {
  return trpc.createClient(
    createTrpcClientConfig({
      baseUrl: API_BASE_URL,
      getToken: () => nativeBearerStorage.getToken(),
      source: "mobile",
      isDev: IS_DEV,
    }),
  );
}
