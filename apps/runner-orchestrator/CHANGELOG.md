# runner-orchestrator

## 0.2.0

### Minor Changes

- [#113](https://github.com/TutlyLabs/Tutly/pull/113) [`e6e3690`](https://github.com/TutlyLabs/Tutly/commit/e6e36909eee80bf7db445b330884d78e264d77d2) Thanks [@UdaySagar-Git](https://github.com/UdaySagar-Git)! - Server-side Jest test runner for SANDBOX assignments.

  - new `runner-orchestrator` worker runs each student submission in a locked-down `tutly-jest-runner` container (--network=none, memory/cpu/pids caps, no-new-privileges, cap-drop=ALL)
  - visible tests run in-browser as before for fast feedback; submit now also enqueues a `SubmissionTestRun` that the orchestrator picks up via `/api/test-runner/claim` and reports back via `/api/test-runner/callback` with an HMAC service token
  - instructors author hidden tests in a new "Hidden Tests" dialog in the sandbox editor; files live in `Attachment.hiddenTestFiles` and never reach the student
  - admin dashboard gets live status badge, per-row "Rerun tests" and "View report" buttons, and a top-bar "Rerun all submissions" action (instructor-only, 5-minute soft rate limit)
  - mentor dashboard shows per-student tests passed/failed counts
  - student view shows aggregate-only counts until the assignment deadline; visible-test failures unlock after the deadline; hidden tests never leak to students
  - schema additions: `Attachment.hiddenTestFiles`, `SubmissionTestRun.jestReport / errorMessage / attempt / triggeredByUserId`, index `(assignmentId, createdAt)`
  - new GH Action `deploy-runner-orchestrator-production.yml` builds both images and pings Coolify
