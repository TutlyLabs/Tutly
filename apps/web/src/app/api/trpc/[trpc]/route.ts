import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter, createTRPCContext } from "@tutly/api";
import { auth } from "@/server/auth";

const handler = async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: req.headers });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        // better-auth widens the customSession return to an index-signature
        // object; project the two fields the tRPC context actually declares.
        session: session
          ? { user: session.user, session: session.session }
          : null,
      }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
