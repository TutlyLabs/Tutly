---
"web": minor
---

Pluggable S3-compatible object storage for assignment templates + submissions.

- new `@tutly/storage` package built on FlyDrive; one env flip switches between MinIO (dev) and R2/AWS (prod) with zero code change
- hierarchical keys: `org/{orgId}/courses/{courseId}/assignments/{assignmentId}/{template,submissions/{id}}/` — easy to browse and scope
- template = file blobs + `tutly.json` sidecar holding `template / options / customSetup / fileMeta`; submissions store only the editable subset, with hidden/solution/test files served from the (always-fresh) template at read time so instructor edits propagate without re-submission
- new visibility policy (`@tutly/api/lib/template-policy`) enforces the same rules on reads (`mergeForAudience`) and writes (`filterSubmissionInput`):
  - hidden from student: `fileMeta.hidden: true`, paths under `/__hidden__/`, `/solution/*`, `/solution.ts`, `*.solution.*`
  - never persisted in submissions: all of the above + `*.test.ts` / `*.spec.tsx` etc.
- Sandpack Configuration Editor modal replaced with a file-based editor: instructors edit `/tutly.json` directly in their file tree and use a `FileFlagsBar` strip above Monaco for per-file toggles (`hidden`, `visible by default`, `read-only`, `active`) with tooltips that spell out exactly how each flag affects storage and the student view
- `HiddenTestsModal` removed — hidden tests now live in the template with `fileMeta.hidden: true` (or under `/__hidden__/`)
- runner claim route merges full template + submission overrides so Jest sees the test files alongside student code
- schema env: new `STORAGE_S3_ENDPOINT / REGION / BUCKET / ACCESS_KEY / SECRET_KEY / FORCE_PATH_STYLE`
