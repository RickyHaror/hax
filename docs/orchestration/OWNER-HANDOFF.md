# Owner handoff

The owner session is refreshed about every 3 hours. Each fresh owner session reads this file first,
then `STATUS.md`, then any `build-logs/*-checkpoint.md` named below, and continues from "Next action".
The owner updates this file at every terminal point (batch launched, checkpoint, acceptance, deploy).

## Current state

- Phase 0 (owner): repo scaffold, workflow files, CI with deploy and smoke, placeholder page.
- Current owner session: rotation id `20261107-190700-manual` (started 7:07 PM Toronto, registered in
  ~/.claude/handoffs/hax-owner-scripts/rotation-state.json). A new owner messages it to stand down.

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
