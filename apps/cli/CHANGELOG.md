# tutly

## 1.2.0

### Minor Changes

- [#101](https://github.com/TutlyLabs/Tutly/pull/101) [`dafc3c7`](https://github.com/TutlyLabs/Tutly/commit/dafc3c785da41c1d956a0bdafec445b721795fe8) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - - **Workspace Mode**: Implemented complete workspace assignment submission mode allowing students to code directly in a browser-embedded VS Code connected to a local agent.
  - **S3 Architecture**: Refactored S3 client for MinIO and Cloudflare R2 compatibility, automatically omitting unsupported encryption headers locally.
  - **Data Models**: Added 8 new database schema models to track workspace configurations, test runs, and instructor reviews.
  - **Security & Stability**: Fixed codeQL alerts by parsing endpoint URLs strictly and rate-limiting the local development server.
