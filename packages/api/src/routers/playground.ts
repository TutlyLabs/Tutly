import crypto from "node:crypto";

import { TRPCError } from "@trpc/server";
import argon2 from "argon2";
import { z } from "zod";

import { db } from "@tutly/db";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const BROKER_URL = process.env.PLAYGROUND_BROKER_URL ?? "wss://playground.tutly.in";
const BROKER_AGENT_URL = process.env.PLAYGROUND_BROKER_AGENT_URL ?? `${BROKER_URL}/v1/playground/agent`;
const HMAC_SECRET = process.env.PLAYGROUND_BROKER_HMAC_SECRET;
const PUBLIC_BROKER_WS = process.env.PLAYGROUND_BROKER_PUBLIC_WS ?? `${BROKER_URL}/v1/playground/client`;
const IMAGE_REGISTRY_PREFIX = process.env.PLAYGROUND_IMAGE_PREFIX ?? "ghcr.io/tutlylabs";

function requireHmacSecret(): string {
  if (!HMAC_SECRET) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "PLAYGROUND_BROKER_HMAC_SECRET is not configured",
    });
  }
  return HMAC_SECRET;
}

function signTicket(payload: { userId: string; runnerId: string; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", requireHmacSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function generateRunnerToken(): string {
  return `plgrnd_${crypto.randomBytes(24).toString("base64url")}`;
}

function dockerCommandFor(
  definition: { dockerImage: string; exposedPorts: number[] },
  token: string
): string {
  const image = definition.dockerImage.includes("/")
    ? definition.dockerImage
    : `${IMAGE_REGISTRY_PREFIX}/${definition.dockerImage}`;
  const ports = definition.exposedPorts
    .map((p) => `  -p ${p}:${p} \\`)
    .join("\n");
  const portsBlock = ports ? `${ports}\n` : "";
  return [
    "docker run --rm \\",
    "  --memory=1g --cpus=1 --pids-limit=512 \\",
    `  -e TUTLY_TOKEN=${token} \\`,
    `  -e TUTLY_URL=${BROKER_AGENT_URL} \\`,
    portsBlock + "  -v tutly-workspace:/workspace \\",
    `  ${image}:latest`,
  ].join("\n");
}

export const playgroundRouter = createTRPCRouter({
  definitions: createTRPCRouter({
    list: protectedProcedure.query(async () => {
      return db.playgroundDefinition.findMany({
        where: { isPublished: true },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });
    }),

    get: protectedProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const def = await db.playgroundDefinition.findUnique({
          where: { slug: input.slug },
        });
        if (!def || !def.isPublished) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return def;
      }),
  }),

  runners: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.playgroundRunner.findMany({
        where: { userId: ctx.session.user.id, status: { not: "REVOKED" } },
        orderBy: { createdAt: "desc" },
        include: { definition: true },
      });
    }),

    requestToken: protectedProcedure
      .input(z.object({ definitionId: z.string(), name: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const activeCount = await db.playgroundRunner.count({
          where: { userId, status: { in: ["PENDING", "ONLINE"] } },
        });
        if (activeCount >= 3) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "You already have 3 active runners; stop one first.",
          });
        }
        const recentCount = await db.playgroundRunner.count({
          where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        });
        if (recentCount >= 10) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Hourly limit reached. Try again later.",
          });
        }
        const definition = await db.playgroundDefinition.findUnique({
          where: { id: input.definitionId },
        });
        if (!definition || !definition.isPublished) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const token = generateRunnerToken();
        const tokenHash = await argon2.hash(token);
        const runner = await db.playgroundRunner.create({
          data: {
            userId,
            definitionId: definition.id,
            name: input.name,
            tokenHash,
            tokenHint: token.slice(-4),
            status: "PENDING",
          },
        });
        return {
          runnerId: runner.id,
          token,
          dockerCommand: dockerCommandFor(definition, token),
        };
      }),

    status: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const r = await db.playgroundRunner.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            userId: true,
            status: true,
            agentVersion: true,
            image: true,
            lastSeenAt: true,
            definitionId: true,
          },
        });
        if (!r || r.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return r;
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const r = await db.playgroundRunner.findUnique({ where: { id: input.id } });
        if (!r || r.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.playgroundRunner.update({
          where: { id: input.id },
          data: { status: "REVOKED" },
        });
        return { ok: true };
      }),
  }),

  sessions: createTRPCRouter({
    openTicket: protectedProcedure
      .input(z.object({ runnerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const runner = await db.playgroundRunner.findUnique({
          where: { id: input.runnerId },
        });
        if (!runner || runner.userId !== userId) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (runner.status === "REVOKED") {
          throw new TRPCError({ code: "FORBIDDEN", message: "runner revoked" });
        }
        const session = await db.playgroundSession.create({
          data: {
            userId,
            runnerId: runner.id,
            definitionId: runner.definitionId,
          },
        });
        const exp = Math.floor(Date.now() / 1000) + 60;
        const ticket = signTicket({ userId, runnerId: runner.id, exp });
        return {
          sessionId: session.id,
          wsUrl: PUBLIC_BROKER_WS,
          ticket,
          expiresAt: exp,
        };
      }),

    end: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.playgroundSession.findUnique({ where: { id: input.id } });
        if (!s || s.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (s.endedAt) return { ok: true };
        await db.playgroundSession.update({
          where: { id: input.id },
          data: { endedAt: new Date() },
        });
        return { ok: true };
      }),
  }),
});
