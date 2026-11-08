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

1. Phase 0 is pushed; CI deploy and live smoke passed on `https://hax-d7j.pages.dev`.
2. Founder standing authorization (2026-11-07): ship accepted batches without asking until launch
   work is done (docs/DECISIONS.md). Engine BUILD E1 and content BUILD C1 are running (launched about 7:45 PM Toronto, 2026-11-07).
   9:20 PM: C1 integrated and live (d1bed87); Phase 1 voice lines committed (5e7752d). E1 VERIFY running;
   content C2 BUILD (M4 to M7) running. After E1 VERIFY reports, accept and integrate, then launch
   engine E2 (widgets plus E2-6 audio playback). After C2 integrates, rerun scripts/audio/generate.mjs.
