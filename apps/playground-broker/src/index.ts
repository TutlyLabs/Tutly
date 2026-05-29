import Fastify from "fastify";
import websocket from "@fastify/websocket";

import { log } from "./log.js";
import { registerAgentRoute } from "./agentRoute.js";
import { registerClientRoute } from "./clientRoute.js";

const PORT = parseInt(process.env.PORT ?? "4100", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ loggerInstance: log, disableRequestLogging: true });

await app.register(websocket, {
  options: { maxPayload: 16 * 1024 * 1024, perMessageDeflate: false },
});

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

registerAgentRoute(app);
registerClientRoute(app);

app.listen({ port: PORT, host: HOST }).then(
  () => log.info({ port: PORT, host: HOST }, "playground-broker listening"),
  (err) => {
    log.fatal({ err: String(err) }, "failed to start");
    process.exit(1);
  }
);
