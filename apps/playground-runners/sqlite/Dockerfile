FROM node:22-bookworm-slim AS agent-build
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@10.25.0 --activate
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/playground-protocol/ packages/playground-protocol/
COPY packages/playground-agent/ packages/playground-agent/
COPY tooling/ tooling/
RUN pnpm install --filter @tutly/playground-agent... --frozen-lockfile=false --prefer-offline
RUN pnpm --filter @tutly/playground-agent build
RUN pnpm --filter @tutly/playground-agent add node-pty@1.0.0

FROM node:22-bookworm-slim AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git procps tini sqlite3 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash --uid 10001 tutly \
  && mkdir -p /workspace && chown tutly:tutly /workspace

COPY --from=agent-build /build/packages/playground-agent/dist/agent.cjs /agent/agent.cjs
COPY --from=agent-build /build/packages/playground-agent/node_modules /agent/node_modules
COPY apps/playground-runners/_shared/entrypoint.sh /usr/local/bin/tutly-entrypoint
RUN chmod +x /usr/local/bin/tutly-entrypoint

ENV TUTLY_WORKSPACE=/workspace \
    TUTLY_LANGUAGE=sql \
    TUTLY_IMAGE=playground-runner-sqlite
VOLUME ["/workspace"]
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/tutly-entrypoint"]
