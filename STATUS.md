# Status

| Lane | Batch | Branch | State | Last update (Toronto) |
|---|---|---|---|---|
| Owner | Phase 0 scaffold | main | done | 2026-11-07 8:40 PM |
| Content | C1 login, Boot Camp, Terminal, M1 to M3 | content/c1 | integrated d1bed87, live | 2026-11-07 9:20 PM |
| Owner | AU-1 audio: 12 sfx, 1,196 Phase 1 voice lines | main | done 5e7752d | 2026-11-07 9:20 PM |
| Engine | E1 foundation | engine/e1 | integrated, live | 2026-11-07 |
| Content | C2 Missions 4 to 7, C3 Playground | content/c2, c3 | integrated, live | 2026-11-07 |
| Engine | E2 widgets plus audio playback | engine/e2 | integrated 6eea4b2, live | 2026-11-08 3:05 AM |
| Engine | E3 finish the experience | engine/e3 | integrated 569e6df, live | 2026-11-08 6:45 AM |
| Engine | E4 sign-up narration and speech fixes | engine/e4 | integrated cd676a5, live | 2026-11-08 8:15 AM |
| Owner | Codename and sign up prompt clips (130, 744 chars) | main | done 7e19cdf | 2026-11-08 8:00 AM |
| Engine | E5 terminal first rebuild | engine/e5 | schema live 07f5a43; BUILD 2 checkpointed c4601aa | 2026-11-08 11:55 AM |
| Content | C4 Season 1 missions 1 to 6 | content/c4 | BUILD 1 checkpointed 25fa2eb | 2026-11-08 11:45 AM |

## Provider state

- GitHub: private repo RickyHaror/hax, Actions secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` set.
- Cloudflare: zone huxton.ca active (nova and roman.ns.cloudflare.com). Pages project `hax`
  (`hax-d7j.pages.dev`), custom domain `hax.huxton.ca` live.
- Registrar: AWS Route 53 Domains (Gandi backend). Old Route 53 hosted zone can be deleted by the founder.
- ElevenLabs: key in `.env.local` (git-ignored), used only by `scripts/audio/generate.mjs`.
