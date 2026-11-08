# Owner handoff

The owner session is refreshed about every 3 hours. Each fresh owner session reads this file first,
then `STATUS.md`, then any `build-logs/*-checkpoint.md` named below, and continues from "Next action".
The owner updates this file at every terminal point (batch launched, checkpoint, acceptance, deploy).

## Current state

- Phase 0 (owner): repo scaffold, workflow files, CI with deploy and smoke, placeholder page.
- Coordinators: none running.

## Founder context

- The player is the founder's 8 year old son, new to computers, early reader, plays alone on a Windows 11
  work laptop without admin rights, in Edge. Safety and independence matter most.
- Founder handles every credential value. Cloudflare account ID `2f4a552c492df191ab15b877a39e21f8`.

## Open external items

- huxton.ca registrar transfer Gandi to Namecheap was pending on 2026-11-07 evening. When Namecheap
  shows it, set custom nameservers `nova.ns.cloudflare.com` and `roman.ns.cloudflare.com`
  (founder is logged into Namecheap and Cloudflare in Chrome). Then in Cloudflare Pages, project `hax`,
  add custom domain `hax.huxton.ca`. Then the Route 53 zone for huxton.ca can be deleted (founder decides).

## Next action

1. Push Phase 0 to `main`, confirm CI deploys and smoke passes on the pages.dev URL.
2. Launch Phase 1: engine coordinator BUILD E1 and content coordinator BUILD C1 in parallel.
