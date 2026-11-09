# Owner handoff

The owner session is refreshed about every 3 hours. Each fresh owner session reads this file first,
then `STATUS.md`, then any `build-logs/*-checkpoint.md` named below, and continues from "Next action".
The owner updates this file at every terminal point (batch launched, checkpoint, acceptance, deploy).

## Current state

- Phase 0 (owner): repo scaffold, workflow files, CI with deploy and smoke, placeholder page.
- Current owner session: hax-45, rotation id `20261109-120000` (started 12:00 PM Toronto 2026-11-09,
  registered in ~/.claude/handoffs/hax-owner-scripts/rotation-state.json). A new owner messages it to stand down.

## Founder context

- The player is the founder's 8 year old son, new to computers, early reader, plays alone on a Windows 11
  work laptop without admin rights, in Edge. Safety and independence matter most.
- Founder handles every credential value. Cloudflare account ID `2f4a552c492df191ab15b877a39e21f8`.

## Open external items

- huxton.ca is registered in the founder's AWS account (Route 53 Domains; Gandi is AWS's backend
  registrar). The Namecheap transfer was cancelled; it is not needed. On 2026-11-07 about 8:15 PM the
  founder set the nameservers in AWS to `nova.ns.cloudflare.com` and `roman.ns.cloudflare.com` only.
  Waiting for the .ca registry to show them and for Cloudflare to activate the zone.
- Then: Cloudflare Pages, project `hax` (host `hax-d7j.pages.dev`), Custom domains, add `hax.huxton.ca`.
  CI smoke already tests the custom domain once it serves.
- Later, founder decides: delete the old Route 53 hosted zone for huxton.ca (about $0.50 a month).
- The owner's safety checks blocked editing registrar nameservers directly; the founder does registrar edits.

## Next action

Final handoff from owner hax-7f (rotation 20261109-090000) to hax-45 (rotation 20261109-120000), about
12:00 PM Toronto 2026-11-09. The founder pause below stays in force (no end time). No agent is running,
no cron exists. E5 BUILD run 5 checkpointed at engine/e5 7c4cb1c; E5-F5 edits uncommitted and unreviewed;
terminal output voice decision still open; founder voice cost decision still owed. Details below.

PAUSED by the founder about 10:08 AM Toronto 2026-11-09 ("pause all work for now"), no end time given.
Launch no coordinator or worker, create no lane check cron, run nothing until the founder says resume.
Owner hax-7f told the E5 BUILD run 5 coordinator to stop its worker, checkpoint and report; lane check
cron deleted. Read build-logs/E5-checkpoint.md "BUILD run 5" for where the engine stopped.
E5 BUILD run 5 checkpointed about 10:10 AM: engine/e5 7c4cb1c pushed (screen text catalog, read reviewed,
unproven). Worker E5-F5 edits (Player.tsx lines into the catalog, 8 files) are uncommitted and unreviewed in
D:/Dev/hax-engine. Evening packets ready: E5-P1 unit proof, E5-P2 layout, E5-F6 tap target and clip order
checks, E5-VERIFY. Open owner decision: about 70 terminal output lines (shell.ts, hack*.ts) still use the
browser voice; record them (bigger voice set) or rule them dynamic output. On resume: review and commit
E5-F5, then after 5:15 PM the dry run total for the founder, E5-P1, E5-F6, E5-P2, VERIFY.

Updated about 10:05 AM Toronto 2026-11-09, owner hax-7f (hax-35 stood down, marker written). Pause over.
Engine E5 BUILD run 5 launched about 10:05 AM (D:/Dev/hax-engine, engine/e5, hard stop about 12:55 PM,
this owner's subagent; a new owner gets its report forwarded). Quiet hours, so no tests: it reviews and
commits the screen text catalog diff (owner read the generate.mjs change: dry run never calls the voice
service, authorized), routes the remaining Player.tsx spoken lines into the catalog, and writes packets
for the evening. After 5:15 PM: owner runs generate.mjs --dry-run for the final character total and gives
the founder voice options; then catalog unit proof, Chromium and Edge layout specs, E5 VERIFY. Content C4
idle at 9fe935f. Lane check cron at :46.

Final handoff from owner hax-35 (rotation 20261109-060000) to hax-7f (rotation 20261109-090000), about
9:00 AM Toronto 2026-11-09. Nothing changed: hax-47 stood down (marker written), no agent ran, no lane
check cron was made, no founder messages, voice decision still owed. Engine worktree unchanged (6434896
plus the uncommitted catalog worker diff), content at 9fe935f. The pause ends at 10:00 AM: hax-7f creates
the :46 lane check cron then and resumes per the pause entry below (weekday, no tests until 5:15 PM).

Final handoff from owner hax-47 (rotation 20261109-030000) to hax-35 (rotation 20261109-060000), about
6:00 AM Toronto 2026-11-09. Nothing changed: hax-08 stood down (marker written), the pause stays until
10:00 AM Monday, no agent ran, no lane check cron was made, no founder messages, voice decision still owed.
Engine worktree unchanged (6434896 plus the uncommitted catalog worker diff), content at 9fe935f.
hax-35 is the owner at 10:00 AM: create the :46 lane check cron then and resume per the pause entry below.

Final handoff from owner hax-08 (rotation 20261109-000000) to hax-47 (rotation 20261109-030000), about
3:00 AM Toronto 2026-11-09. Nothing changed: hax-a4 stood down (marker written), the pause stays until
10:00 AM Monday, no agent ran, no lane check cron was made, no founder messages, voice decision still owed.
Engine worktree unchanged (6434896 plus the uncommitted catalog worker diff), content at 9fe935f.

Final handoff from owner hax-a4 (rotation 20261108-210000) to hax-08 (rotation 20261109-000000), about
12:00 AM Toronto 2026-11-09. Nothing changed: the pause stays until 10:00 AM Monday, no agent ran, no lane
check cron was made, no founder messages, voice decision still owed. Continue from the entries below.

Final handoff from owner hax-dc (rotation 20261108-180000) to hax-a4 (rotation 20261108-210000), about
9:00 PM Toronto 2026-11-08. Nothing changed: the pause stays until 10:00 AM Monday, no agent ran, no lane
check cron was made, no founder messages, voice decision still owed. Continue from the entries below.

Final handoff from owner hax-55 (rotation 20261108-150000) to hax-dc (rotation 20261108-180000), about
6:00 PM Toronto 2026-11-08. Nothing changed since hax-03's 3 PM handoff: the pause stays, no agent was
launched, no lane check cron was made, the engine worktree was not touched, and the founder sent no
message (no voice decision yet).

Final handoff from owner hax-03 (rotation 20261108-120000) to hax-55 (rotation 20261108-150000), about
3:00 PM Toronto 2026-11-08. The pause below stays: idle until 10:00 AM Monday 2026-11-09. No agent is
running; engine E5 BUILD run 4 and content C4 BUILD run 2 are checkpointed (details below). Lane check
cron deleted. Founder still owes the voice decision; the preliminary estimate is far above the monthly plan.

PAUSED by the founder about 2:10 PM Toronto, 2026-11-08, until 10:00 AM Toronto Monday 2026-11-09.
Until then: launch no coordinator or worker, create no lane check cron, run nothing. An owner session that
starts before 10:00 AM Monday reads this, stands down the previous owner as usual, and otherwise stays idle.
At 10:00 AM Monday it is a weekday: no tests until 5:15 PM, so resume with planning, packets and worker code
only (workers told not to run tests), E5 layout rerun and VERIFY after 5:15 PM. Engine E5 BUILD run 4
checkpointed at engine/e5 6434896 (pushed): m7-graduation names fixed, hint ladder in page flow, fonts and
clipping raised; none proven in a browser yet. The screen text catalog worker (E5-F3) was left to finish;
its edits are uncommitted in D:/Dev/hax-engine. Monday: review that diff (no wording changes, in scope,
generate.mjs dry run never calls the voice service), commit it, then after 5:15 PM run its tests, the dry
run (character total for the founder) and the Chromium and Edge layout specs, then E5 VERIFY. Catalog worker finished incomplete (its checks never ran; 41 files uncommitted). Owner
confirms: screen text plays only from recorded clips (its voice.ts change matches the decision, review it).
Player.tsx spoken lines still to route into the catalog. Preliminary dry run: 27,110 characters for the
1,719 catalog lines, 159,487 characters overall (7,171 jobs, all three sidekick voices, 5,127 clips
missing). Far above the 40k monthly plan: get a final total and give the founder options (fewer voices,
spread over months, bigger plan) before any recording. Content C4 checkpointed at 9fe935f.

Updated about 1:50 PM Toronto, 2026-11-08, owner hax-03. E5 BUILD run 3 checkpointed at engine/e5
c2ba7b3 (pushed): E5-5 season map, E5-6 Boot Camp and parent panel restyle, clip check, layout check at all
four sizes with 364 screenshots, check:reading fixed. Chromium e2e 104 pass, 148 fail on real layout findings
(small fonts, hint ladder overlapping work, 15 clipped text cases); 192 spoken screen lines have no clips.
Owner decided all three questions (docs/DECISIONS.md "E5 run 3 follow ups"). E5 BUILD run 4 launched about
1:50 PM, hard stop about 2:55 PM, this owner's subagent (report forwarded to the next owner): fix packets per
finding group, screen text catalog plus generate.mjs dry run total. Next: rerun layout on Chromium and Edge,
then E5 VERIFY. Founder still owes the voice cost answer; the screen text lines add to it.

Updated about 12:30 PM Toronto, 2026-11-08, owner hax-03. Content C4 BUILD run 2 checkpointed at
content/c4 9fe935f (pushed): all eight decisions applied, unit proof 260 pass, sequencing table in
build-logs/C4-sequencing.md. For C4 VERIFY: put the machine names (game-server, bakery-web) in the m3 and m4
step text, prove the m6 unlock step completes only after the right password, mission 1 alarm limit now 8.
For E5 VERIFY: src/ui/music-follow.ts and decoder.test.tsx still name retired m7-graduation. E5 BUILD
run 3 still running; it flags 186 UI literal speech lines with no recorded clip (decision pending its report).

Updated about 12:10 PM Toronto, 2026-11-08, owner hax-03 (hax-f4 stood down, marker written). Two
coordinators launched about 12:05 PM, hard stop about 2:05 PM, both this owner's subagents (a new owner
gets their reports forwarded): engine E5 BUILD run 3 (D:/Dev/hax-engine, engine/e5: E5-5 map and seasons
read from `seasons` export with a test fixture, E5-6 Boot Camp and parent panel restyle, release bar
layout, audio to text and screenshot checks) and content C4 BUILD run 2 (D:/Dev/hax-content, content/c4:
register Season 1, `seasons` export, retire m1 to m7, mission 1 hint flow, no spelled flags, sequencing
self check). Next: E5 VERIFY, integrate E5, then C4 VERIFY and integrate. Founder still owes the Season 1
voice cost answer (about 25k to 35k characters). Lane check cron at :46.

Final handoff from owner hax-f4 (rotation 20261108-090000) to hax-03 (rotation 20261108-120000), about
12:00 PM Toronto 2026-11-08. No agent is running; both lanes checkpointed and pushed (engine/e5 c4601aa,
content/c4 25fa2eb). Decisions this rotation in docs/DECISIONS.md: "Season 1 missions in C4", "E5 run 2
follow ups", and the founder's "release bar for every batch" (put it in every brief). Next: engine E5
BUILD run 3 (E5-5 packet ready, then E5-6) and content C4 BUILD run 2 (apply the C4 decisions, add the
`seasons` export), then VERIFY for each; integrate E5 before C4. Founder was asked to approve the Season 1
voice cost (about 25k to 35k characters); no answer yet. Lane check cron deleted.

Updated about 11:50 AM Toronto, 2026-11-08, owner hax-f4. Founder set a release bar (docs/DECISIONS.md
"release bar for every batch"): every step played in e2e, audio proven to match on screen text, sensible
order, layout checks plus owner screenshot review at laptop and phone sizes. Put it in every E5 and C4
VERIFY brief (and E5-5/E5-6 BUILD briefs should add the overflow, clip and tap target checks and the
audio to text check if missing). Season 1 audio is part of the bar, so voice recording (founder approved
cost) comes before launch.

Updated about 11:55 AM Toronto, 2026-11-08, owner hax-f4. Engine E5 BUILD run 2 checkpointed, all
agents finished: engine/e5 pushed at c4601aa (E5-3 start up restyle, E5-4a save code v2 and ranks,
E5-4b hack session engine, E5-4c hack step widget, package.json cleanup). E5-5 and E5-6 not started
(E5-5 packet ready in build-logs). Owner decided the seasons export, unlock password and check:reading
(docs/DECISIONS.md "E5 run 2 follow ups"). Tell content C4 run 2 to add `seasons` to index.ts. Next:
engine E5 BUILD run 3 (E5-5, E5-6), then E5 VERIFY (Edge, focus ring check); content C4 BUILD run 2 then
VERIFY. Order of integration: E5 first, then C4. No coordinator is running at this handoff.

Updated about 11:45 AM Toronto, 2026-11-08, owner hax-f4. Content C4 BUILD run 1 checkpointed:
content/c4 pushed at 25fa2eb (six Season 1 missions as data, badges, season test; focused 205 pass; no
review or gate yet; not yet in the mission index). Owner decided its four questions plus two kid review
fixes (docs/DECISIONS.md "Season 1 missions in C4"). Next content: C4 BUILD run 2 to apply those
decisions, then C4 VERIFY. C4 integration waits for E5 on main (it needs the new commands, hack step
widget, save code v2 and the map showing seasons). Engine E5 BUILD run 2 coordinator still running
(hard stop about 12:10 PM); its report is forwarded to the next owner. Then: E5 VERIFY run.

Updated about 10:55 AM Toronto, 2026-11-08, owner hax-f4. Schema shipped: main 07f5a43 (merge of
14eb9e0), CI 42496095473 tests green. Engine coordinator continues E5 BUILD run 2 (hard stop about
12:10 PM). Content C4 BUILD run 1 launched about 10:55 AM (worktree D:/Dev/hax-content, content/c4, hard
stop about 11:55 AM, checkpoint build-logs/C4-checkpoint.md, evidence ~/.claude/handoffs/hax-content-c4/).
Both coordinators are this owner's subagents; their reports get forwarded to the next owner.

Updated about 10:15 AM Toronto, 2026-11-08, owner hax-f4 (hax-44 stood down). E5 BUILD run 1
checkpointed at engine/e5 23c3a60 (E5-0 schema 14eb9e0, E5-1, E5-2a, E5-2b; not pushed). Engine
coordinator launched about 10:10 AM (hard stop about 12:10 PM): Part A ships the schema commit early
(branch engine/e5-schema, worktree D:/Dev/hax-engine-schema, fresh review plus gate --e2e, owner
pre-accepted that candidate only) and messages the owner; Part B is E5 BUILD run 2 (E5-3 start up
restyle, E5-4 commands and save code v2, then E5-5, E5-6). Owner authorized removing the unused
atkinson font package and fixing the check:links and check:copy scripts. When the schema is on main:
launch content C4 (Season 1 missions 1 to 6) in D:/Dev/hax-content. Coordinator is this owner's
subagent; a new owner gets its report forwarded. Lane check cron at :46.

Final handoff from owner hax-44 (rotation 20261108-060001) to hax-f4 (rotation 20261108-090000), about
9:00 AM Toronto 2026-11-08. E5 BUILD coordinator still running in D:/Dev/hax-engine on engine/e5
(launched about 8:00 AM, hard stop about 10:30 AM, checkpoint build-logs/E5-checkpoint.md with copies in
~/.claude/handoffs/hax-engine-e5/). All seven E5-0 schema answers were already relayed to it (see
docs/DECISIONS.md "E5 mission schema"); it is waiting on no owner decision. Commits so far: 14eb9e0
schema; E5-1 (fonts and color tokens) in a follow-up round; packets ready for E5-2a and E5-2b. hax-44
forwards its terminal report word for word to hax-f4, then writes its done marker. Next for hax-f4:
read the report; continue with another BUILD run or VERIFY; get the schema to main so content C4 (Season 1
missions 1 to 6) can start. Founder is waiting on nothing; Season 1 voice cost needs founder approval later.

Updated about 8:40 AM Toronto, 2026-11-08, owner hax-44. E5 BUILD running (D:/Dev/hax-engine, engine/e5,
hard stop about 10:30 AM, evidence copies in ~/.claude/handoffs/hax-engine-e5/). Owner approved the E5-0
schema (docs/DECISIONS.md "E5 mission schema"); schema commit 14eb9e0 on engine/e5, not on main yet.
The coordinator is the owner's subagent: a new owner cannot message it; the old owner forwards its report.
Content C4 (Season 1 missions 1 to 6) cannot start until the schema reaches main (lanes never use each
other's branches). Options: have the next E5 VERIFY land everything, or ship the schema commit early
after a review and gate. Founder told: buddies stay as crew in signal wave style, season paced ranks.
Season 1 voice lines need a founder approved cost estimate. Lane check cron at :46.

Updated about 8:25 AM Toronto, 2026-11-08, owner hax-44. E4 integrated and live (main cd676a5, CI
42481081275 green, live index-BJf0sN17.js). Codename and sign up prompt clips recorded and pushed
(7e19cdf, 130 clips, 744 characters). Founder approved the terminal first pivot (docs/TERMINAL-PLAN.md,
DECISIONS.md) and the design mockups (docs/design/terminal-v1). E5 BUILD launched about 8:25 AM (worktree
D:/Dev/hax-engine, engine/e5, hard stop about 10:30 AM): it first proposes the mission schema
(build-logs/E5-schema.md) and stops for owner approval; the owner resumes it. Then design system, terminal
screen, start up, commands, mission card, profile, season map, restyles; more than one BUILD run expected.
After schema approval: launch content C4 (Season 1 missions 1 to 6) in D:/Dev/hax-content. Season 1
voice lines need a founder approved cost estimate (about 25k to 35k characters). Lane check cron at :46.

Updated about 6:50 AM Toronto, 2026-11-08, owner hax-44 (rotation 20261108-060001; hax-fb stood down).
E3 accepted (owner read the unreviewed 1fc96c2 diff: reset order and decoder ring layout, fine) and
integrated: main 569e6df, gate --e2e 212/212, CI 42475210557 green, live asset index-BgkdgS8F.js matches.
Worktree removed, engine/e3 deleted. Founder feedback from phone screenshots: sign-up narrator reads the
buddy greeting first (unrelated to the visible name buttons); "This computer cannot talk" shows wrongly
(lines with no clip, like the codename line, fall back to speech and phones only offer remote voices,
which we refuse) and lands inside another card; overall look too childlike and not "real hacking".
Founder will get Claude Design mockups (owner gave a prompt: dark spy hacker workstation, one task per
sign-up screen). Hold visual redesign until mockups arrive. Open founder question: phone support or
Windows Edge laptop only. Next: engine E4 BUILD (sign-up narration order, speech-unavailable message,
codename read aloud as word clips). Owner then generates word clips with scripts/audio/generate.mjs
(dry-run, about 1,000 characters). Hourly lane check cron at :46.

Final handoff from owner hax-fb (rotation 20261108-030000) to hax-44 (rotation 20261108-060001), about
6:05 AM Toronto 2026-11-08. E3 VERIFY coordinator is still running in D:/Dev/hax-engine on engine/e3
(pushed, candidate 1fc96c2 = 1136059 plus fixes aad91e2 and 1fc96c2). Review: E3-r1 3 findings and E3-r2
1 finding, all fixed; 1fc96c2 itself has had no independent review (small change). Gate run 1 on aad91e2:
e2e 200 pass 8 fail, all decoder, fixed in 1fc96c2 (focused 28/28). Gate run 2 on 1fc96c2 is mid e2e
(build-logs/gate-E3-20261108T104714Z.log). Checkpoint build-logs/E3-verify-checkpoint.md. Open low items:
reset partial failure edge, no e2e screenshots of Playground, ID card and parent panel, m4 file tree
truncates baker.txt. hax-fb did not accept E3; its terminal report will be forwarded to hax-44, who
accepts and has it integrate. Lane check cron deleted.

Updated about 4:15 AM Toronto, 2026-11-08, owner hax-fb (rotation 20261108-030000; old owner
20261108-000001 stood down, done marker written). E3 BUILD checkpointed at engine/e3 1136059 (all six
items built, unit 1282 pass, Edge and full --e2e not yet run). Owner decided: keep `hax.v1.playground`
key, emoji avatars, adult wording in the parent panel (docs/DECISIONS.md). E3 VERIFY run launched about
4:15 AM (hard stop about 6:15 AM): fresh review of 6690253..1136059, fix the decoder `Help me` placement,
full gate --e2e, screenshot review, report. Under standing authorization: when clean, accept and have it
integrate, confirm CI and the live site. Hourly lane check cron at :46.

Final handoff from owner 20261108-000001 to hax-fb (rotation 20261108-030000), 3:00 AM Toronto
2026-11-08 (earlier "3:15 AM" timestamps below were estimates; E3 launched just before 3 AM).
Engine E3 BUILD coordinator is still running in D:/Dev/hax-engine on branch engine/e3 (tip 6690253,
no E3 commits yet; uncommitted worker edits in src/engine/{progress,sound}.ts, e2e specs and more).
Wave 1 workers: AU-4 music and audio controls, E3-1 Playground (both running), polish A (done, held
uncommitted because SaveScreens.tsx is shared with AU-4). Remaining items: E2-4 ID card, parent panel
and timer, polish B, update-handling gap check. Hard stop about 5 AM, checkpoint
build-logs/E3-checkpoint.md. Any exported type change in src/engine/types.ts must come to the owner
first. Its terminal report will be forwarded to hax-fb. Then: E3 VERIFY run (fresh reviewer,
gate --e2e, screenshot pass), accept and ship. Content lane idle. Founder has been told E2 is live
and the boy can start playing.

Updated about 3:15 AM Toronto, 2026-11-08. E2 accepted and live (main 6eea4b2, e2e 160/160, CI
42457870537 green, live assets match; 16 missions in the registry, all play through). Engine E3 BUILD
running (worktree D:/Dev/hax-engine, branch engine/e3, hard stop about 5:10 AM, checkpoint
build-logs/E3-checkpoint.md). Then an E3 VERIFY run. Content lane idle.

Updated about 1:10 AM Toronto, 2026-11-08, owner rotation 20261108-000001 (old owner stood down,
done marker written). E2 VERIFY run 1 stopped at 4e4f885 (e2e 124 pass, 36 fail: seven tall steps at
1366x768 plus an outdated update.spec). Owner approved E2-V6 (fit as a rule, 1920 scaling) and the
update.spec rewrite, and launched E2 VERIFY run 2 (hard stop about 3 AM). When it reports: check
screenshots, accept, have it integrate, confirm CI and the live site, tell the founder to start
playing, then launch E3. Hourly lane check cron at :46.

Final handoff from owner 20261107-190700-manual at rotation to hax-7b (rotation 20261108-000001),
about midnight Toronto 2026-11-08: E2 VERIFY coordinator is still running in D:/Dev/hax-engine on
engine/e2 (committed tip 0838f0c, "compact mission map that points at the next mission"), with worker
E2-V4-w1 (fourth fix round, packet build-logs/E2-V4-packet.md) running and uncommitted worker edits in
src/styles/base.css, src/ui/screens/{Map,Player,Start}.tsx, the widget css files and src/ui tests.
Do not touch that worktree; wait for the coordinator's terminal report (forwarded by the old owner),
then review screenshots and accept or send follow-ups. The coordinator hard-stops at about 2 hours
(launched about 11:05 PM), so expect a checkpoint around 1 AM if it is not green.

Updated 11:15 PM Toronto, 2026-11-07. Founder standing authorization: ship accepted batches without
asking until launch work is done (docs/DECISIONS.md).

Done and live on main: Phase 0, E1 engine foundation, C1 (login, Boot Camp, Terminal, M1 to M3),
C2 (M4 to M7), C3 (Agent Playground content), all audio (1,914 voice lines, 12 sfx, 5 music tracks in
the founder's chosen soft sneaky spy style). Cloudflare zone Browser Cache TTL is "Respect Existing
Headers" (sw.js must stay no-cache).

1. Running: engine E2 VERIFY (worktree D:/Dev/hax-engine, checkpoint build-logs/E2-checkpoint.md):
   widgets for every step kind, playthrough driver over all 19 missions, recorded voices plus one steady
   fallback voice, no real password inputs, service worker update at safe moments, begin tap and
   visible read-aloud toggle. When it reports: look at its screenshots, accept, let it integrate,
   confirm CI green and that hax.huxton.ca plays a mission. Tell the founder he can start playing.
2. Then launch engine E3 (BACKLOG "Batch E3"): ID card, music playback and three-channel audio
   controls, Playground screen (art keys playground-door and badge-egg, {name} token), parent panel and
   session timer, visual polish including the login fitting one screen at 1366x768.
3. Content lane is idle. Optional: check the M1 last-hint path. Owner: parent setup guide (install as
   app, Edge --app and --kiosk shortcuts). Final: fresh-eyes kid review pass and fixes, then report
   launch ready to the founder.
4. ElevenLabs: founder said be careful with usage. Dry-run first; ask before any run over about 5,000 characters.
