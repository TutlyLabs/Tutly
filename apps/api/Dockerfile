FROM node:18-alpine AS base

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update
RUN apk add --no-cache libc6-compat curl

# Set working directory
WORKDIR /app

# install turbo globally
RUN npm install -g turbo

COPY . .
RUN turbo prune "@tutly/api" --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable
RUN corepack prepare pnpm@10.6.3 --activate

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .

# Generate Prisma client
RUN cd packages/db && pnpm dlx prisma generate

# skip env validation during build
ENV SKIP_ENV_VALIDATION=1

ENV NODE_ENV=production

# Configure Turbo remote caching
ARG TURBO_TEAM
ENV TURBO_TEAM=$TURBO_TEAM

ARG TURBO_TOKEN
ENV TURBO_TOKEN=$TURBO_TOKEN

# Build the entire app
RUN pnpm turbo build

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono
USER hono

# Copy built application
COPY --from=installer --chown=hono:nodejs /app/apps/api/dist ./dist
COPY --from=installer --chown=hono:nodejs /app/apps/api/package.json ./package.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose the port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"] 