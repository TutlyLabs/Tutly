# Playground Runner Images

Each subdirectory is a Docker image that bundles a language toolchain + the Tutly playground agent.

The student runs an image like this:

```
docker run --rm \
  -e TUTLY_TOKEN=<one-time-token> \
  -e TUTLY_URL=wss://playground.tutly.in/v1/playground/agent \
  -v tutly-workspace:/workspace \
  ghcr.io/tutlylabs/playground-runner-node:latest
```

The agent inside dials Tutly, registers, and waits for the broker to relay
PTY / file / exec frames from the student's browser tab.

## Build

```
# 1. Build the agent bundle (once)
pnpm --filter @tutly/playground-agent build

# 2. Build a runner image
docker build \
  -f apps/playground-runners/node/Dockerfile \
  -t ghcr.io/tutlylabs/playground-runner-node:dev \
  .
```

The Dockerfiles assume they are built from the **repo root** as the build
context so that `packages/playground-agent/dist/agent.cjs` is reachable.
