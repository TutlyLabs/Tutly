import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import SuperJSON from "superjson";

import { authClient } from "~/lib/auth/auth-client";
import { getStoredBearerToken } from "~/lib/auth/secure-store";
import { env } from "~/lib/env";

type MobileRouter = any;

export const trpc: any = createTRPCProxyClient<MobileRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        __DEV__ || (op.direction === "down" && op.result instanceof Error),
    }),
    httpBatchLink({
      transformer: SuperJSON,
      url: `${env.apiUrl}/api/trpc`,
      headers: async () => {
        const token = await getStoredBearerToken();
        const cookie = authClient.getCookie();
        return {
          "x-trpc-source": "expo-mobile",
          ...(cookie ? { cookie } : {}),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        };
      },
    }),
  ],
});
