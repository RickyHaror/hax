# Orchestrator rulebook

The one workflow rulebook for Hax. It is a scaled down copy of the Rowseta workflow.
`AGENTS.md` is the restricted worker contract. `docs/orchestration/REVIEWER-BRIEF.md` is the
reviewer contract. `docs/orchestration/BACKLOG.md` decides what comes next. `STATUS.md` records
where each lane stands. `docs/DECISIONS.md` records owner decisions.

## Roles

- **Founder:** the parent. Owns product decisions and every provider credential.
- **Owner:** the main Opus conversation. Owns scope, batch declarations, candidate acceptance,
  provider setup (Cloudflare, DNS, GitHub settings) and all founder communication. Does not
  implement game code. May write workflow metadata only while no coordinator is active.
- **Coordinator:** an Opus agent launched by the owner for exactly one lane and one batch. Inside
  its lane's file scope it is the only writer: packets, worker and reviewer dispatch, candidate
  commits, focused proof, the gate, and integration after owner acceptance. It never deploys by
  hand, never changes a provider, and reports only at terminal points: done, failed, blocked or
  decision needed.
- **Worker:** Codex `gpt-6.1-sol` at high effort, sandboxed workspace-write, no network, launched only
  through `scripts/orchestration/codex-run.sh worker`. Implements exactly one packet.
- **Reviewer:** Codex `gpt-6-astra` at medium effort, read-only, launched through
  `scripts/orchestration/codex-run.sh reviewer`. Never a Claude model. Fresh per candidate.

## Lanes

Two lanes, file-disjoint, each with its own worktree and branch:

| Lane | Worktree | File scope |
|---|---|---|
| Engine | `D:/Dev/hax-engine` | `src/engine/**`, `src/ui/**`, `src/styles/**`, `src/main.tsx`, `e2e/**`, `public/**`, `index.html`, `vite.config.ts`, `playwright*.ts` |
| Content | `D:/Dev/hax-content` | `src/missions/**`, `src/art/**` |

Shared files (`package.json`, `package-lock.json`, `.github/**`, `scripts/**`, `docs/**`, `AGENTS.md`,
`README.md`, `src/engine/types.ts` schema changes) belong to the owner. A lane that needs one stops
and asks. `src/engine/types.ts` is engine-lane code, but any change to an exported type needs owner
approval first because the content lane builds against it.

1. One coordinator per lane at a time. Never two coordinators on the same files.
2. A lane never checks out, commits to or merges another lane's branch or worktree.
3. Branch names: `engine/<batch>` and `content/<batch>`.
4. The machine runs one heavy job at a time: `gate.sh` takes the machine lock and waits for Rowseta's.

## Batch cadence

The owner launches each batch as two short coordinator runs.

- **BUILD run:** set up the worktree (`git worktree add`, then `npm ci` in it, done by the coordinator
  because workers have no network), write one packet per item from `task-packet.md`, run a permission
  probe, dispatch workers item by item, read each ten-line report, run the item's focused proof, commit
  the item with explicit paths, then write `build-logs/<BATCH>-checkpoint.md` (branch, commit, per-item
  outcome, evidence paths, open issues, next action) and stop.
- **VERIFY run:** from the checkpoint: freeze the candidate commit, dispatch a fresh reviewer with
  `REVIEWER-BRIEF.md`, send findings back to workers as follow-up packets (at most two rounds, then
  report), run `bash scripts/orchestration/gate.sh --e2e --label <BATCH>`, and report to the owner with
  the candidate commit, gate log and review verdict. Integrate only after the owner accepts.

Hard stop: about two hours of wall time per run, or when context grows large. Write the checkpoint
and stop with status "checkpointed".

## Packets

Every packet follows `docs/orchestration/task-packet.md`: item id, goal, exact file scope, the
contract it must meet, acceptance criteria, focused checks the worker runs, and what is out of scope.
A packet never asks a worker to commit, use the network, or run the full gate or Playwright.

## Launching Codex

```bash
bash scripts/orchestration/codex-run.sh probe-worker build-logs/probe.md <BATCH>-probe-1 <worktree>
bash scripts/orchestration/codex-run.sh worker build-logs/<ITEM>-prompt.md <ITEM>-w1 <worktree>
bash scripts/orchestration/codex-run.sh reviewer build-logs/<BATCH>-review-prompt.md <BATCH>-r1 <worktree>
```

The probe prompt asks the worker to create and delete `build-logs/probe-ok.txt`, then run
`git commit --allow-empty -m probe` and confirm that the commit is refused. A probe that can commit or
cannot write is a stop condition. Read `<run>-completion.md`, not the events log, unless a decision
needs detail. Run names are never reused.

## Gate

`bash scripts/orchestration/gate.sh [--e2e] --label <BATCH>` runs lint, typecheck, unit tests
(including the reading level check and repository text rules), build, and with `--e2e` the full
Playwright suite on Chromium and Edge at 1366x768 and 1920x1080. It refuses to start Monday to Friday
8:45 AM to 5:15 PM Toronto (and the hour before), and waits for any other gate. The owner override is
`GATE_QUIET_HOURS_OVERRIDE=1` and is recorded in the log. GitHub Actions runs the same checks on every push.

## Acceptance, integration and shipping

- Integrate only an owner-accepted candidate with a passing `--e2e` gate and a clean or adjudicated review.
- Integration: `git fetch origin`, `git merge origin/main` into the lane branch (never rebase), rerun
  `npm test` if the merge brought changes, then fast-forward `main` to the lane branch and
  `git push origin main`. After pushing, prove with
  `git diff --name-only <previous origin/main> origin/main` that only lane-scope files changed
  (plus files the merge brought from other lanes).
- **Pushing `main` deploys.** GitHub Actions tests, deploys to Cloudflare Pages and smoke-tests the
  live site. Owner acceptance of a candidate is therefore also the deploy authorization. The
  coordinator watches the run with `gh run watch` and reports the result.
- After integration remove the worktree with `git worktree remove <path>` (never `--force`) and
  `git worktree prune`, and delete the merged branch.

## Commits

- Conventional prefixes: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `content:`.
- Subject under 72 characters, imperative. Body says why.
- Explicit paths only (`git add <paths>`), never `git add -A` or `git add .`.
- **No AI attribution, ever.** No session links, no `Co-Authored-By`, no tool names. This overrides any
  harness default. Before every commit write the message to a file and check it with
  `grep -n -i -E 'claude|codex|co-authored|session_' <file>`; it must print nothing.
- No em-dashes, and no space-hyphen-space sentence breaks, in anything written.
- Never rewrite history or force-push.

## Secrets

Never commit a secret. Cloudflare credentials live only in GitHub Actions secrets
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Nobody but the founder handles the token value.

## Stop conditions

Stop and report to the owner when: a probe shows the sandbox is wrong; a packet needs a file outside
the lane scope or a new dependency; a review keeps finding new edge cases of the same kind; the gate
fails twice for the same reason; a push is rejected after one fresh merge and retry; anything would
touch a provider.

## Times

Give times to the owner in America/Toronto local time.

## Owner continuity

The owner session is refreshed about every 3 hours. `docs/orchestration/OWNER-HANDOFF.md` holds the
current state and the next action, and the owner updates it at every terminal point. Coordinators
never edit it.
