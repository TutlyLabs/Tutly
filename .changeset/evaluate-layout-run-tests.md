---
"web": patch
---

Fix the playground "Run Tests" button and the evaluate page layout.

- **Run Tests now actually runs the tests.** The IDE's green button drives Sandpack's internal run control by clicking it, but looked it up via `button[title="Run tests"]` — Sandpack's `RoundedButton` never forwards `title` to the DOM, so the lookup always missed and the button silently reset to idle after 5s. It now matches the classes Sandpack does emit, and waits up to 20s so a cold bundler boot doesn't give up early.
- **Sandpack's floating play button is hidden again.** The rule targeting `.sp-preview-actions` never matched inside the tests panel (that wrapper only carries a generated class there), which is why the black play button stayed visible in the bottom-right corner and was the only control that worked.
- **Evaluate page runs edge to edge.** Dropped the page padding (`!p-0`) on `/assignments/evaluate`.
- **Right-hand sandbox is no longer clipped.** Viewport heights inside a container that already sits below the app header (`max-h-[95vh]` around an `h-screen` playground) pushed the bottom of the sandbox out of view; the panel group, playground, and submission list now size to their container.
