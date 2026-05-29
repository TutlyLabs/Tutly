import type { FastifyInstance } from "fastify";
import argon2 from "argon2";

import {
  AgentToBrokerFrame,
  BrokerToAgentFrame,
  PROTOCOL_VERSION,
  type AgentFrame,
  type BrokerFrame,
} from "@tutly/playground-protocol";

import { db } from "./db.js";
import { log } from "./log.js";
import { registry } from "./registry.js";

const HEARTBEAT_SEC = 20;
const STALE_MS = HEARTBEAT_SEC * 3 * 1000;

function makeStreamPrefix(clientId: string, streamId: string): string {
  return `${clientId}::${streamId}`;
}

function parseStreamPrefix(prefixed: string): { clientId: string; streamId: string } | null {
  const idx = prefixed.indexOf("::");
  if (idx < 0) return null;
  return { clientId: prefixed.slice(0, idx), streamId: prefixed.slice(idx + 2) };
}

async function findRunnerByToken(token: string): Promise<{ id: string; userId: string } | null> {
  const tokenHint = token.slice(-4);
  const candidates = await db.playgroundRunner.findMany({
    where: { tokenHint, status: { in: ["PENDING", "ONLINE", "OFFLINE"] } },
    select: { id: true, userId: true, tokenHash: true },
    take: 16,
  });
  for (const r of candidates) {
    try {
      if (await argon2.verify(r.tokenHash, token)) return { id: r.id, userId: r.userId };
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function registerAgentRoute(app: FastifyInstance): void {
  app.get("/v1/playground/agent", { websocket: true }, async (socket) => {
    let runnerId: string | null = null;
    let helloed = false;
    let lastPong = Date.now();

    const send = (frame: BrokerFrame): void => {
      const parsed = BrokerToAgentFrame.safeParse(frame);
      if (!parsed.success) {
        log.error({ err: parsed.error.message }, "outbound to agent invalid");
        return;
      }
      socket.send(JSON.stringify(parsed.data));
    };

    const sweep = setInterval(() => {
      if (Date.now() - lastPong > STALE_MS) {
        log.warn({ runnerId }, "agent missed heartbeats; closing");
        try {
          socket.close(4002, "heartbeat timeout");
        } catch {
          /* ignore */
        }
      } else {
        try {
          send({ type: "ping", t: Date.now() });
        } catch {
          /* ignore */
        }
      }
    }, HEARTBEAT_SEC * 1000);

    socket.on("message", async (raw: Buffer | ArrayBuffer | Buffer[]) => {
      const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : Buffer.from(raw as ArrayBuffer).toString("utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      const result = AgentToBrokerFrame.safeParse(parsed);
      if (!result.success) {
        log.warn({ err: result.error.message }, "bad agent frame");
        return;
      }
      const frame: AgentFrame = result.data;

      if (!helloed) {
        if (frame.type !== "hello") {
          send({ type: "error", code: "expected_hello", message: "first frame must be hello" });
          socket.close(4003, "no hello");
          return;
        }
        if (frame.protocol !== PROTOCOL_VERSION) {
          send({
            type: "error",
            code: "protocol_mismatch",
            message: `expected protocol ${PROTOCOL_VERSION}, got ${frame.protocol}`,
          });
          socket.close(4004, "protocol mismatch");
          return;
        }
        const runner = await findRunnerByToken(frame.token);
        if (!runner) {
          send({ type: "error", code: "auth_failed", message: "invalid token" });
          socket.close(4401, "auth");
          return;
        }
        runnerId = runner.id;
        helloed = true;
        registry.registerAgent({
          runnerId: runner.id,
          userId: runner.userId,
          ws: socket as unknown as import("ws").WebSocket,
          agentVersion: frame.agentVersion,
          image: frame.image,
          language: frame.language,
          lastPongAt: Date.now(),
        });
        await db.playgroundRunner.update({
          where: { id: runner.id },
          data: {
            status: "ONLINE",
            agentVersion: frame.agentVersion,
            image: frame.image ?? null,
            connectedAt: new Date(),
            lastSeenAt: new Date(),
          },
        });
        send({
          type: "hello.ack",
          runnerId: runner.id,
          sessionSecret: crypto.randomUUID(),
          heartbeatSec: HEARTBEAT_SEC,
        });
        for (const clientId of registry.clientsFor(runner.id)) {
          const c = registry.client(clientId);
          c?.ws.send(
            JSON.stringify({
              type: "runner.status",
              status: "online",
              agentVersion: frame.agentVersion,
              image: frame.image,
            })
          );
        }
        return;
      }

      if (frame.type === "pong" || frame.type === "ping") {
        lastPong = Date.now();
        if (frame.type === "ping") send({ type: "pong", t: frame.t });
        return;
      }

      // Demux frames with prefixed streamId to the right client.
      if ("streamId" in frame && frame.streamId) {
        const parsedPrefix = parseStreamPrefix(frame.streamId);
        if (!parsedPrefix) {
          log.warn({ streamId: frame.streamId }, "unprefixed streamId from agent");
          return;
        }
        const { clientId, streamId } = parsedPrefix;
        const client = registry.client(clientId);
        if (!client) return;
        const forward: AgentFrame = { ...frame, streamId };
        client.ws.send(JSON.stringify(forward));
      }
    });

    socket.on("close", async () => {
      clearInterval(sweep);
      if (runnerId) {
        registry.removeAgent(runnerId, socket as unknown as import("ws").WebSocket);
        await db.playgroundRunner
          .update({
            where: { id: runnerId },
            data: { status: "OFFLINE", lastSeenAt: new Date() },
          })
          .catch(() => undefined);
        for (const clientId of registry.clientsFor(runnerId)) {
          const c = registry.client(clientId);
          c?.ws.send(JSON.stringify({ type: "runner.status", status: "offline" }));
        }
      }
    });
  });
}

export { makeStreamPrefix };
