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

FROM node:22-alpine AS runtime
RUN apk add --no-cache bash ca-certificates curl git tini \
  && adduser -D -u 10001 -s /bin/bash tutly \
  && mkdir -p /workspace && chown tutly:tutly /workspace \
  && npm install --global vite@latest

COPY --from=agent-build /build/packages/playground-agent/dist/agent.cjs /agent/agent.cjs
COPY --from=agent-build /build/packages/playground-agent/node_modules /agent/node_modules
COPY apps/playground-runners/_shared/entrypoint.sh /usr/local/bin/tutly-entrypoint
RUN chmod +x /usr/local/bin/tutly-entrypoint

ENV TUTLY_WORKSPACE=/workspace \
    TUTLY_LANGUAGE=node \
    TUTLY_IMAGE=playground-runner-static-web
VOLUME ["/workspace"]
WORKDIR /workspace
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/tutly-entrypoint"]
