# CI/CD remediation — maintainer actions

Everything in this document requires repository-admin rights and changes
settings outside the working tree, so it is written down rather than applied.

## 1. Configure the release token (required)

`release.yml` no longer uses `secrets.GITHUB_TOKEN`. Refs pushed with that token
are deliberately prevented by GitHub from triggering other workflows, which is
why every `on: push: tags:` production deploy has had to be started by hand
since the tag-push migration.

Create a GitHub App (or reuse an existing one) with **Contents: read & write**
and **Pull requests: read & write** on this repository, install it, then set:

| Kind             | Name                       | Value                       |
| ---------------- | -------------------------- | --------------------------- |
| Repository var   | `RELEASE_APP_ID`           | the App's numeric ID        |
| Repository secret| `RELEASE_APP_PRIVATE_KEY`  | the App's PEM private key   |

**Until both exist the Release workflow will fail on its first step.**

Simpler alternative: create a classic PAT with `repo` + `workflow` scopes, store
it as `RELEASE_TOKEN`, and follow the comment at the top of `release.yml` to
drop the App-token step.

## 2. Create the `production` environment

The five production deploys now declare `environment: production`. Create that
environment (Settings → Environments) and, if you want a human gate on
deploys, add required reviewers there. Without the environment GitHub creates
it implicitly on first use with no protection.

## 3. Optional: Turborepo remote cache

`ci.yml` reads `secrets.TURBO_TOKEN` and `vars.TURBO_TEAM`. Both are optional —
when unset, turbo silently uses only the local `.turbo` cache.

## 4. Branch protection (not applied — run this yourself)

`main` currently has **zero required status checks**, allows force-pushes, and
lets PRs merge with red CI. The command below matches the job names as they are
now defined in `.github/workflows/ci.yml` (`build`, `lint`, `format`,
`typecheck`, `test`, `changeset`).

Review it before running — it is a full replacement of the protection object,
not a patch.

```sh
gh api -X PUT repos/TutlyLabs/Tutly/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "build",
      "lint",
      "format",
      "typecheck",
      "test",
      "changeset"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
JSON
```

Note on `changeset`: the job is skipped (not failed) for the release bot's
`changeset-release/main` PR and for PRs labelled `no changeset`. A skipped job
does **not** satisfy a required status check, so if you require `changeset`
above, those PRs will sit unmergeable. Either drop `"changeset"` from
`contexts`, or convert that job to always run and pass early instead of being
skipped.

## 5. `apps/web` does not typecheck (blocks the new `typecheck` job)

`apps/web` had no `typecheck` script, so turbo had no task for it and the
flagship app was never typechecked in CI. It now has one, and it currently
fails with **27 errors**. None were introduced here; they were simply never
visible.

Fixing `tooling/typescript/nextjs.json`'s `"target": "es5"` → `"ES2022"`
(applied here) already cleared 7 `TS2802` downlevel-iteration errors. Next.js
compiles with SWC and ignores this field for emit, so it is typecheck-only.

The remaining 27 break down as:

| Count | Code      | Cause                                              |
| ----- | --------- | -------------------------------------------------- |
| 16    | `TS2769`  | duplicate Zod installs (see below)                  |
| 6     | `TS2322`  | assorted; 2 are the `SessionContext` shadow type    |
| 2     | `TS2739`  | `Notifications.tsx` misses `CHAT_MENTION` / `DIRECT_MESSAGE` |
| 2     | `TS18048` | `tutor/report/page.tsx` unguarded `q.data`          |
| 1     | `TS2305`  | `@tutly/db/browser` has no `JsonValue` export       |

**The 16 `TS2769`s are one dependency problem, not 16 code problems.**
`@hookform/resolvers@5.2.2` is hoisted to the repo root and binds to the root
`zod@4.4.3` (pulled in transitively), while `apps/web` resolves its own
`zod@4.1.13`. Two Zod 4.x minors in one type graph make every `zodResolver(...)`
call fail with `_zod.version.minor: Type '1' is not assignable to type '4'`.

Deduping fixes all 16 at once. Not applied here because it is a dependency
change and needs your sign-off:

```jsonc
// package.json → "pnpm" → "overrides"
"zod": "^4.4.3"
```

Also note `pnpm-workspace.yaml` still declares `catalog.zod: ^3.24.2`, which no
package uses — all six pin `^4.1.13` directly. Worth deleting or repointing so
the catalog is not misleading.

## 6. Follow-ups not done here

- `apps/cli` had a `test` script pointing at a `test/` directory that does not
  exist, and a `posttest` running ESLint 8 flags against a missing `.eslintrc`.
  Both were removed; the CLI still has no tests.
- `packages/fsrelay` and `apps/cli` are linted for the first time. Their
  warnings are surfaced, not fixed.
