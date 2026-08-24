---
"runner-orchestrator": minor
---

Make the autoeval runtime selectable with `RUNNER_MODE` instead of hardcoding the browser runner.

`RUNNER_MODE=jest` (new default) runs submissions with node + happy-dom in the `tutly-jest-runner` image — roughly the pre-#121 cost, ~512 MB and no Chromium boot per job. `RUNNER_MODE=browser` keeps the Sandpack-in-Chromium runner from #121, which matches the editor preview byte-for-byte at ~640 MB and a browser launch per job.

Both images are built and pushed on every `runner-orchestrator@*` tag, so switching modes is an env change and a restart. `/health` now reports the active mode. A submission with no test files short-circuits to `PASSED` in both modes without starting a container.
