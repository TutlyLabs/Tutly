###
# Build the agent bundle from source.
###
FROM node:22-bookworm-slim AS agent-build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/playground-protocol/ packages/playground-protocol/
COPY packages/playground-agent/ packages/playground-agent/
COPY tooling/ tooling/
RUN pnpm install --filter @tutly/playground-agent... --frozen-lockfile=false --prefer-offline
RUN pnpm --filter @tutly/playground-agent build
# Build node-pty natively since it's marked external in the bundle.
RUN pnpm --filter @tutly/playground-agent add node-pty@1.0.0

###
# Runtime: node 22 with build tools for npm/pnpm projects.
###
FROM node:22-bookworm-slim AS runtime

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git procps tini python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.25.0 --activate

# Non-root user for the actual workload.
RUN useradd --create-home --shell /bin/bash --uid 10001 tutly \
  && mkdir -p /workspace && chown tutly:tutly /workspace

# Drop the agent bundle and its node_modules (with prebuilt node-pty) into /agent.
COPY --from=agent-build /build/packages/playground-agent/dist/agent.cjs /agent/agent.cjs
COPY --from=agent-build /build/packages/playground-agent/node_modules /agent/node_modules

COPY apps/playground-runners/_shared/entrypoint.sh /usr/local/bin/tutly-entrypoint
RUN chmod +x /usr/local/bin/tutly-entrypoint

ENV TUTLY_WORKSPACE=/workspace \
    TUTLY_LANGUAGE=node \
    TUTLY_IMAGE=playground-runner-node \
    NODE_ENV=development

VOLUME ["/workspace"]
WORKDIR /workspace

# tini reaps zombies (PTY children, npm spawn trees).
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/tutly-entrypoint"]
