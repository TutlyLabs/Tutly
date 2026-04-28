import { TRPCError } from "@trpc/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "../trpc";

const providerSchema = z.enum(["LOCAL", "SSH"]);

const sshConfigSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().optional(),
  workingDirectory: z.string().optional(),
  label: z.string().optional(),
});

const connectionConfigSchema = z
  .object({
    localWorkspaceRoot: z.string().optional(),
  })
  .merge(sshConfigSchema)
  .passthrough();

function encryptionKey() {
  const secret =
    process.env.SERVICE_CONNECTION_ENCRYPTION_KEY ??
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET ??
    "tutly-development-service-connection-key";
  return createHash("sha256").update(secret).digest();
}

function encryptSecret(value?: string | null) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptSecret(value?: string | null) {
  if (!value) return null;
  const [iv, tag, encrypted] = value.split(".");
  if (!iv || !tag || !encrypted) return null;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function publicConnection<T extends { encryptedSecret?: string | null }>(connection: T) {
  const { encryptedSecret: _secret, ...rest } = connection;
  return {
    ...rest,
    hasSecret: Boolean(connection.encryptedSecret),
  };
}

function validateConnection(provider: "LOCAL" | "SSH", config: z.infer<typeof connectionConfigSchema>, secret?: string | null) {
  if (provider === "LOCAL") {
    return { ok: true, message: "Local agent provider is available." };
  }

  if (!config.host || !config.username) {
    return { ok: false, message: "SSH host and username are required." };
  }

  if (!secret) {
    return { ok: false, message: "SSH private key is required." };
  }

  return {
    ok: true,
    message: "SSH configuration is complete. The runner will verify network reachability when a workspace starts.",
  };
}

export const serviceConnectionsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    const connections = await ctx.db.serviceConnection.findMany({
      where: { userId: user.id },
      orderBy: [{ provider: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: connections.map(publicConnection) };
  }),

  create: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        name: z.string().min(1),
        config: connectionConfigSchema.default({ port: 22 }),
        privateKey: z.string().optional(),
        passphrase: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      const secretPayload =
        input.provider === "SSH"
          ? JSON.stringify({
              privateKey: input.privateKey,
              passphrase: input.passphrase,
            })
          : null;
      const validation = validateConnection(input.provider, input.config, input.privateKey);

      const connection = await ctx.db.serviceConnection.create({
        data: {
          userId: user.id,
          provider: input.provider,
          name: input.name,
          config: input.config as never,
          encryptedSecret: encryptSecret(secretPayload),
          status: validation.ok ? "ACTIVE" : "ERROR",
          lastCheckedAt: new Date(),
          lastError: validation.ok ? null : validation.message,
        },
      });

      return {
        success: validation.ok,
        message: validation.message,
        data: publicConnection(connection),
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        status: z.enum(["ACTIVE", "DISABLED", "ERROR"]).optional(),
        config: connectionConfigSchema.optional(),
        privateKey: z.string().nullable().optional(),
        passphrase: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.serviceConnection.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service connection not found" });
      }

      const nextSecret =
        input.privateKey === undefined && input.passphrase === undefined
          ? undefined
          : encryptSecret(
              input.privateKey
                ? JSON.stringify({
                    privateKey: input.privateKey,
                    passphrase: input.passphrase ?? null,
                  })
                : null,
            );

      const connection = await ctx.db.serviceConnection.update({
        where: { id: input.id },
        data: {
          name: input.name,
          status: input.status,
          config: input.config === undefined ? undefined : (input.config as never),
          encryptedSecret: nextSecret,
        },
      });

      return { success: true, data: publicConnection(connection) };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.serviceConnection.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service connection not found" });
      }

      await ctx.db.serviceConnection.delete({ where: { id: input.id } });
      return { success: true };
    }),

  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.serviceConnection.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service connection not found" });
      }

      const config = connectionConfigSchema.parse(connection.config ?? {});
      const secretPayload = decryptSecret(connection.encryptedSecret);
      const parsedSecret = secretPayload
        ? (JSON.parse(secretPayload) as { privateKey?: string | null })
        : null;
      const validation = validateConnection(
        connection.provider,
        config,
        parsedSecret?.privateKey,
      );

      const updated = await ctx.db.serviceConnection.update({
        where: { id: connection.id },
        data: {
          status: validation.ok ? "ACTIVE" : "ERROR",
          lastCheckedAt: new Date(),
          lastError: validation.ok ? null : validation.message,
        },
      });

      return {
        success: validation.ok,
        message: validation.message,
        data: publicConnection(updated),
      };
    }),
});
