import * as trpcExpress from '@trpc/server/adapters/express';
import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';

import { FRONTEND_URL } from './lib/constants';
import { createTRPCContext, getSessionFromRequest } from './trpc';
import { appRouter } from './trpc/root';
import { auth } from './utils/auth';

const app = express();

app.use(
  cors({
    origin: [FRONTEND_URL],
    credentials: true,
  }),
);

app.all('/api/auth/{*any}', toNodeHandler(auth));

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);

// @ts-expect-error Upgrade express to v5
app.use('/', async (req, res) => {
  let session = null;
  try {
    session = await getSessionFromRequest(req);
  } catch (error) {
    console.error('Session validation error:', error);
  }
  return res.send({
    status: 'ok',
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        }
      : null,
  });
});

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
