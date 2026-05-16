FROM node:22-alpine AS base

FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune runner-orchestrator --docker

FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/full/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/out/full/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
RUN pnpm install --frozen-lockfile --filter=runner-orchestrator...

COPY --from=builder /app/out/full/ .

ENV NODE_ENV=production
WORKDIR /app/packages/db
RUN pnpm prisma generate

FROM base AS runner
WORKDIR /app

# docker-cli: the runner spawns `docker run` against the host daemon (socket mounted via compose).
RUN apk add --no-cache ca-certificates docker-cli

COPY --from=installer /app /app

RUN mkdir -p /tmp/tutly-runner

EXPOSE 3010

ENV WORK_DIR=/tmp/tutly-runner
ENV RUNTIME_DIR=/app/apps/runner-orchestrator/runtime
ENV USE_DOCKER=true
ENV JEST_IMAGE=ghcr.io/tutlylabs/tutly-jest-runner:latest

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3010/health || exit 1

WORKDIR /app/apps/runner-orchestrator
CMD ["node", "--import", "tsx", "src/index.ts"]
