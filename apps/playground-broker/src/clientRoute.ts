import crypto from "node:crypto";

import type { FastifyInstance } from "fastify";

import { ClientToBrokerFrame, type ClientFrame } from "@tutly/playground-protocol";

import { log } from "./log.js";
import { registry } from "./registry.js";
import { makeStreamPrefix } from "./agentRoute.js";
import { verifyTicket } from "./ticket.js";

export function registerClientRoute(app: FastifyInstance): void {
  app.get<{ Querystring: { ticket?: string } }>(
    "/v1/playground/client",
    { websocket: true },
    (socket, req) => {
      const ticket = req.query.ticket;
      if (!ticket) {
        socket.close(4400, "missing ticket");
        return;
      }
      const claims = verifyTicket(ticket);
      if (!claims) {
        socket.close(4401, "invalid ticket");
        return;
      }
      const clientId = crypto.randomUUID();
      registry.registerClient({
        clientId,
        userId: claims.userId,
        runnerId: claims.runnerId,
        ws: socket as unknown as import("ws").WebSocket,
      });

      const agent = registry.agent(claims.runnerId);
      socket.send(
        JSON.stringify({
          type: "runner.status",
          status: agent ? "online" : "pending",
          agentVersion: agent?.agentVersion,
          image: agent?.image,
        })
      );

      socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
        const text = Buffer.isBuffer(raw)
          ? raw.toString("utf8")
          : Buffer.from(raw as ArrayBuffer).toString("utf8");
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return;
        }
        const result = ClientToBrokerFrame.safeParse(parsed);
        if (!result.success) {
          log.warn({ err: result.error.message }, "bad client frame");
          return;
        }
        const frame: ClientFrame = result.data;
        if (frame.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", t: frame.t }));
          return;
        }
        const a = registry.agent(claims.runnerId);
        if (!a) {
          socket.send(
            JSON.stringify({
              type: "error",
              streamId: "streamId" in frame ? frame.streamId : undefined,
              code: "runner_offline",
              message: "agent is not connected",
            })
          );
          return;
        }
        if ("streamId" in frame) {
          const prefixed = makeStreamPrefix(clientId, frame.streamId);
          const forwarded = { ...frame, streamId: prefixed };
          a.ws.send(JSON.stringify(forwarded));
        }
      });

      socket.on("close", () => {
        registry.removeClient(clientId);
      });
    }
  );
}
