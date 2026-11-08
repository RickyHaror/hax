# Task packet template

Copy this into `build-logs/<ITEM>-packet.md`, fill every section, then dispatch the worker with a
one-line prompt: `Read build-logs/<ITEM>-packet.md and follow it exactly. Report in the AGENTS.md format.`

```
ITEM: <backlog id>
BRANCH: <lane branch>
WORKTREE: <absolute path>

GOAL
<two or three sentences: what the player or the code gains>

FILE SCOPE (only these may change)
- <path>
- <path>

READ FIRST
- AGENTS.md
- src/engine/types.ts (if the item touches mission data or widgets)
- <other files the worker needs>

CONTRACT
<exact exported functions, types, props, accessible names or data shape this item must provide>

ACCEPTANCE
- <observable behavior 1>
- <observable behavior 2>
- tests prove <x>, <y>, <z>

FOCUSED CHECKS (worker runs these, each through wait-gate-idle.sh)
- npx vitest run <paths>
- npx tsc --noEmit
- npx eslint <paths>

OUT OF SCOPE
- <things the worker must not do>

REPORT
The ten-line format in AGENTS.md.
```
