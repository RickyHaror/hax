# Owner handoff

The owner session is refreshed about every 3 hours. Each fresh owner session reads this file first,
then `STATUS.md`, then any `build-logs/*-checkpoint.md` named below, and continues from "Next action".
The owner updates this file at every terminal point (batch launched, checkpoint, acceptance, deploy).

## Current state

- Phase 0 (owner): repo scaffold, workflow files, CI with deploy and smoke, placeholder page.
- Current owner session: hax-44, rotation id `20261108-060001` (started 6:00 AM Toronto 2026-11-08,
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
