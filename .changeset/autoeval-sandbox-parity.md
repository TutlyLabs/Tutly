---
"runner-orchestrator": patch
---

Test runtime: swap jsdom→happy-dom and ts-jest→babel-jest (loose mode) so autoeval matches Sandpack's in-browser preview. Fixes `structuredClone is not defined`, `fetch not available`, and spec-strict spread errors for code that passes in the editor.
