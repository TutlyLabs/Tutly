FROM node:22-alpine AS base

# --- prune stage ---
# Use turbo to extract only the workspace files video-worker actually needs.
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune video-worker --docker

# --- install + build stage ---
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm

# 1. Install deps from the pruned lockfile
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/full/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/out/full/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
RUN pnpm install --frozen-lockfile --filter=video-worker...

# 2. Bring in the actual source
COPY --from=builder /app/out/full/ .

# 3. Generate Prisma client + build the worker
ENV NODE_ENV=production
WORKDIR /app/packages/db
RUN pnpm prisma generate
WORKDIR /app
RUN pnpm turbo build --filter=video-worker

# --- runtime stage ---
FROM base AS runner
WORKDIR /app

# ffmpeg + ca-certs for HTTPS to R2
RUN apk add --no-cache ffmpeg ca-certificates

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Pull the entire installed app — pnpm hoists shared deps to root node_modules,
# and the prisma generated client lives at packages/db/prisma/generated.
COPY --from=installer --chown=worker:nodejs /app /app

# WORK_DIR is where ffmpeg writes during a job; mount a volume here.
RUN mkdir -p /data/work && chown -R worker:nodejs /data
ENV WORK_DIR=/data/work

USER worker
EXPOSE 4400

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4400/health || exit 1

WORKDIR /app/packages/video-worker
CMD ["node", "dist/index.js"]
