# Decisions

## 2026-11-07, founder: Hax v1 plan approved

- Static PWA on Cloudflare Pages, no backend. Vite, TypeScript, Preact, vite-plugin-pwa, Vitest,
  Playwright with axe. Fonts, sounds and art are bundled; the site contacts no other host.
- Domain `hax.huxton.ca`, public (no Cloudflare Access). DNS for huxton.ca moves to Cloudflare.
- The player picks one of three sidekicks. Hacker names come from two word lists, so no real name
  is ever stored and the name fits in the save code.
- Save code `HAX-XXXX-XXXX-XXXX`: 60 bits, Crockford base32, CRC-16 checksum, scrambled payload.
- Parent panel opens by holding the logo for three seconds and is PIN protected. It keeps an 8 year
  old out; it is not real security.
- Workflow copies Rowseta: owner, two lane coordinators (engine and content), restricted Codex workers
  and read-only Codex reviewers, on the same models and efforts as Rowseta.
- House rules: no AI attribution anywhere, no em-dashes or space-hyphen-space sentence breaks, no local
  test runs Monday to Friday 8:45 AM to 5:15 PM Toronto.

## 2026-11-07, founder: independent and safe play

- He must be able to play alone on a Windows 11 work laptop without admin rights.
- Launch from one icon: installed PWA (no address bar), or an Edge `--app` or `--kiosk` shortcut.
- No way out to other websites from inside the game: no external links, strict Content Security Policy,
  the fake browser and email are drawings. Read-aloud is on by default. A big `Stop for today` button.
- Optional session length set in the parent panel; the game suggests stopping at the next save point.

## 2026-11-07, founder: ship without founder sign-off until launch work is done

- The owner accepts and integrates each batch once its fresh review is clean or adjudicated and the
  `--e2e` gate passes. Pushing `main` deploys. No founder go-ahead is needed for any Phase 1 or Phase 2
  batch, polish, or fix until all launch work in the backlog is done.
- Founder input is still needed for credentials, registrar or account actions, and product decisions.

## 2026-11-08, owner: E3 build choices

- Playground eggs stay under their own localStorage key `hax.v1.playground` for launch. The parent
  reset clears it. Folding it into the main progress object is optional later work.
- ID card avatars are emoji tiles drawn by the game for launch. Real avatar art is optional content work.
- The parent panel keeps plain adult wording; early-reader copy rules apply to kid-facing screens.

## 2026-11-08, founder: terminal first direction

- The game becomes terminal first: every mission is a hired break in on a fake target machine, with a
  contract, a flag and an ACCESS GRANTED moment. Plan in `docs/TERMINAL-PLAN.md`.
- Drop the decoder wheel, matching and drag games, and the cartoon mission themes.
- Keep Boot Camp, restyled as agent training.
- Support phones as well as the Windows laptop in Edge.
- Make it a long, ongoing game: seasons, ranks, daily contracts, a sandbox.
- Visual redesign waits for the founder's design mockups.

## 2026-11-08, owner: design mockup follow ups

- Mockups v1 in `docs/design/terminal-v1` are the reference for the rebuild.
- Keep the designer's content: client Sam at Corner Shop, Season 1 "Corner Town" with 12 missions,
  ranks Rookie up to Crew Chief, passphrase example milk-rocket-tuba-cloud. Mission order is set by content.
- Every email address and web address in mission content uses `.example` domains.
- The Help me ladder from the components board applies to every step screen.
- The grown-up PIN panel stays and is restyled to the new look.
- Fit rule: a 1366x768 laptop in Edge leaves about 650px of height. The layout scales to fit any window
  height, offers a full screen button, and e2e covers a 1366x650 viewport as well as 1920x1080 and 390x844.

## 2026-11-08, owner: E5 mission schema

- Schema shape from the E5-0 proposal: additive, one `hack` step kind, machines, contract and alarm on the
  mission, a `Season` type. Old step kinds stay valid until content replaces the old missions.
- Save code v2 with 48 mission bits; v1 codes still accepted.
- Ranks: Rookie 0, Agent 60, Senior Agent 200, Specialist 600, Crew Chief 1200; 20 XP per mission.
- Extra commands: `open`, `submit`, `unlock`, `exit`. Mission 10 reads and reports mail only for now.
- Machines share prompt colors; up to 4 more tokens allowed if they pass 8:1 and are never amber or red.
- The picked sidekick (Bit, Pixel, Hoot) stays as the crew voice, drawn in the signal wave avatar style.
- Flags look like `CLUE{...}`.
