# playground-runner-node

Image: `ghcr.io/tutlylabs/playground-runner-node`

Contains:

- Node.js 22 + npm + pnpm + corepack
- Git, curl, build-essential (so `npm install` for native modules works)
- The Tutly playground agent at `/agent/agent.cjs`

Build (run from repo root):

```
docker build -f apps/playground-runners/node/Dockerfile -t playground-runner-node:dev .
```
