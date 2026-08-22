import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter, createTRPCContext } from "@tutly/api";
import { resolveSession } from "@tutly/auth/api-key-session";
import { db } from "@tutly/db";
import { createLogger } from "@tutly/logger";
import { auth } from "@/server/auth";

const logger = createLogger("web:api:trpc");

const handler = async (req: NextRequest) => {
  // Accepts a browser cookie, a session bearer token, or an API key. All three
  // arrive here as an equally enriched session.
  const { user, session, authMethod } = await resolveSession({
    auth,
    db,
    headers: req.headers,
    onError: (err) => logger.error({ err }, "session resolution failed"),
  });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: req.headers,
        session: user && session ? { user, session } : null,
        authMethod,
      }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            logger.error(
              { err: error, path: path ?? "<no-path>" },
              "trpc handler failed",
            );
          }
        : undefined,
  });
};

export { handler as GET, handler as POST };
