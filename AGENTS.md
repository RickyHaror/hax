# AGENTS.md

Instructions for Codex, the restricted implementing worker in this repository.

You do all implementation, tests, review fixes and documentation. Your task packet is normally a
file at `build-logs/<item-id>-packet.md` and your prompt is one line pointing at it. Read that file
first and follow it exactly. If the prompt contains the whole task, treat the prompt as the packet.
If the prompt is a bare fragment, the packet was truncated: report `STATUS: blocked`. Never invent scope.

## Which role you are

You are the sandboxed worker: you implement one task packet, you cannot commit, you cannot reach
the network. Workflow policy for other roles lives in `docs/orchestration/ORCHESTRATOR.md`. The
read-only reviewer reads `docs/orchestration/REVIEWER-BRIEF.md`.

## What Hax is

A browser game for an 8 year old who is new to computers. He is a junior white hat agent in a
pretend computer. Everything is simulated in TypeScript: no real files, no network, no links out.
Static site (Vite, Preact, TypeScript, PWA) hosted on Cloudflare Pages. Read `README.md` for layout.

## Shell

This is Windows. Run every command through Git Bash. Before any Node command run:

```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

You have no network. Every dependency is already in `node_modules`. If something tries to download,
stop and report it: the packet needs a dependency nobody approved. Never run `npm install` or `npm ci`.

## Checks

Run only the focused checks your packet assigns, each prefixed with the wait helper:

```bash
bash scripts/orchestration/wait-gate-idle.sh npx vitest run <paths>
bash scripts/orchestration/wait-gate-idle.sh npx tsc --noEmit
bash scripts/orchestration/wait-gate-idle.sh npx eslint <paths>
```

The helper waits while a gate holds the machine and through weekday quiet hours (Monday to Friday
8:45 AM to 5:15 PM Toronto). Workers never run the full gate (`scripts/orchestration/gate.sh`) and never
run Playwright. Never report PASS for a command you did not run; write NOT RUN and why.

## Code rules

- TypeScript strict. Preact function components. No new dependencies.
- Pure logic lives in `src/engine/` with Vitest tests beside it (`foo.ts` and `foo.test.ts`).
- UI lives in `src/ui/`. Assert behavior in tests, not markup shape.
- Functions stay around 50 lines. Split helpers beyond that.
- No global mutable state except the single app store the packet names.
- Never add an external URL, CDN, font link, analytics, tracking or third party script. The game
  must never contact another host. A test enforces this.
- Store nothing personal. Only the hacker name (picked from word lists), sidekick and progress.
- If you fix a bug, add the test that would have caught it.
- Never use a retry, sleep or skip to hide a flaky test.

## Kid-facing text rules

- Short sentences: at most 12 words. Simple words. A test grades every mission's text.
- Friendly and calm. No harsh failure. Wrong answers get a kind nudge.
- Every line of story text must have a read-aloud button.
- The ethics rule appears in every client mission: only hack what you own or have permission to hack.

## Hard prohibitions

1. Never commit, rebase or push. The coordinator commits.
2. Never deploy or touch Cloudflare, GitHub settings or DNS.
3. Never touch any other repository or folder outside this worktree.
4. Never widen the packet. Files outside the packet's scope: stop and report.
5. No em-dashes or en-dashes, and no space-hyphen-space to break a sentence, in any file.
6. Never mention AI tools in code, comments, docs or commit text.
7. Never weaken a test or a check to make it pass.

## Required end-of-task report

Ten lines maximum, exactly this shape:

```
ITEM: <backlog id>
BRANCH: <branch name>
STATUS: complete | incomplete | blocked
CHANGED: <one line on what you did and why>
FILES: <comma-separated paths, or "N files: <dirs>" if more than eight>
TESTS: <what you added or changed, and what it proves>
GATE: <focused commands and real results> | full gate NOT RUN (coordinator)
UNCERTAIN: <anything you guessed at, or "none">
FOLLOWUP: <work deliberately left out of scope, or "none">
COMMIT: not committed (the coordinator commits)
```
