import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { serve } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { AppRouter } from "./trpc/root";
import { AUTH_COOKIE_NAME, validateSessionToken } from "./lib/auth";
import { createTRPCContext } from "./trpc";
import { appRouter } from "./trpc/root";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "https://tutly.vercel.app"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["*"],
  }),
);

app.get("/", async (c) => {
  const cookieStore = c.req.raw.headers.get("cookie");
  const sessionId = cookieStore
    ?.split(";")
    .find((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split("=")[1];

  let session = null;
  if (sessionId) {
    try {
      const result = await validateSessionToken(sessionId);
      session = result.session;
    } catch (error) {
      console.error("Session validation error:", error);
    }
  }

  return c.text(
    JSON.stringify({
      status: "ok",
      user: session?.user,
    }),
  );
});

app.all("/trpc/*", async (c) => {
  const cookieStore = c.req.raw.headers.get("cookie");
  const sessionId = cookieStore
    ?.split(";")
    .find((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split("=")[1];

  let session = null;
  if (sessionId) {
    try {
      const result = await validateSessionToken(sessionId);
      session = result.session;
    } catch (error) {
      console.error("Session validation error:", error);
    }
  }

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        headers: c.req.raw.headers,
        session,
      }),
  });
});

type RouterInputs = inferRouterInputs<AppRouter>;
type RouterOutputs = inferRouterOutputs<AppRouter>;

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`API Server is running on http://localhost:${info.port}`);
  },
).on("error", (err: Error & { code?: string }) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Please try a different port or kill the process using this port.`,
    );
    process.exit(1);
  } else {
    console.error("Server error:", err);
    process.exit(1);
  }
});

export { createTRPCContext, appRouter };
export type { AppRouter, RouterInputs, RouterOutputs };
