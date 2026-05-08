# video-worker

Self-hosted HLS transcoding worker. Consumes jobs from a BullMQ queue, transcodes
uploaded video to adaptive HLS with ffmpeg, and writes the result back to
S3-compatible storage.

## Architecture

```
  Browser ──upload──▶ S3  (videos/raw/{id}.<ext>)
                       │
              tRPC: videos.uploadComplete
                       │ POST /enqueue (X-Worker-Secret)
                       ▼
              ┌──────────────────────────┐
              │   Express  ↔  BullMQ     │
              │     ↑          │         │
              │     │          ▼         │
              │     │  ffmpeg + ffprobe  │
              │     │          │         │
              │     └──── Redis ─────────│
              └──────────────────────────┘
                       │
                       ▼
              S3  (videos/hls/{id}/master.m3u8 …)
```

The worker writes the final state directly to Postgres via the `@tutly/db`
Prisma client — no callback to the web app needed.

## Configure

Copy `.env.example` to `.env` and fill in:

| Var | Purpose |
|---|---|
| `WORKER_SECRET` | Shared secret guarding `/enqueue` and `/admin/queues` (≥16 chars) |
| `DATABASE_URL` | Same Postgres URL the web app uses |
| `REDIS_URL` | Redis connection string |
| `AWS_BUCKET_NAME` / `AWS_BUCKET_REGION` | S3 bucket |
| `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` | S3 credentials |
| `AWS_ENDPOINT` | Custom endpoint for non-AWS S3 (R2, MinIO, etc.) |
| `AWS_S3_PUBLIC_URL` | Public base URL serving HLS objects |
| `WORK_DIR` | Local scratch directory for ffmpeg |
| `CONCURRENCY` | Concurrent jobs per worker (default `1`) |

`ffmpeg` and `ffprobe` must be on `$PATH`. Override with `FFMPEG_PATH` /
`FFPROBE_PATH` if needed.

## Run

```sh
pnpm install
pnpm -F video-worker build
pnpm -F video-worker start
```

The HTTP server exposes:

- `POST /enqueue` — accepts `{ videoId, rawObjectKey }`, requires the
  `X-Worker-Secret` header
- `GET /health` — returns BullMQ queue counts
- `GET /admin/queues` — bull-board UI, HTTP basic auth (password = `WORKER_SECRET`)
