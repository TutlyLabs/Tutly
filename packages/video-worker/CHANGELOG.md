# video-worker

## 0.1.0

### Minor Changes

- [#105](https://github.com/TutlyLabs/Tutly/pull/105) [`383a90d`](https://github.com/TutlyLabs/Tutly/commit/383a90df626c3da5f9e9a35c85b3859cba59def8) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Self-hosted HLS class video pipeline.

  - New `video-worker` package: BullMQ + ffmpeg transcoder that consumes raw uploads from S3 and produces adaptive HLS (480p / 720p / 1080p) with a source-aware ladder.
  - Web: HLS upload UI with drag/drop and multipart resumable upload (≥50 MB); Vidstack-based player with server-side resume position and `captionsUrl` support; offline downloads on Capacitor with quality picker, pause / resume / ETA, and a per-viewer watermark on the offline page.
  - New `/tutor/video-runs` admin view for monitoring transcode jobs; in-app notifications when a transcode finishes or fails; stuck-job watchdog.
  - Access scoping on `videos.getStatus` by enrollment; HEAD-based size verification on upload; timing-safe worker secret compare.
  - "Add class" CTA on the course detail page so freshly created courses aren't a dead-end for instructors.
  - `dev:video-worker` script in the root `package.json` mirroring `dev:web` / `dev:landing`.
