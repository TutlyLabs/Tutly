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

FROM postgres:16-bookworm AS runtime
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git procps tini nodejs npm sudo \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /bin/bash --uid 10001 tutly \
  && mkdir -p /workspace && chown tutly:tutly /workspace

COPY --from=agent-build /build/packages/playground-agent/dist/agent.cjs /agent/agent.cjs
COPY --from=agent-build /build/packages/playground-agent/node_modules /agent/node_modules
COPY apps/playground-runners/postgres/start.sh /usr/local/bin/tutly-entrypoint
RUN chmod +x /usr/local/bin/tutly-entrypoint

ENV POSTGRES_DB=tutly_playground \
    POSTGRES_USER=tutly \
    POSTGRES_PASSWORD=tutly \
    PGDATA=/var/lib/postgresql/data \
    TUTLY_WORKSPACE=/workspace \
    TUTLY_LANGUAGE=sql \
    TUTLY_IMAGE=playground-runner-postgres

VOLUME ["/workspace", "/var/lib/postgresql/data"]
WORKDIR /workspace
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/tutly-entrypoint"]
