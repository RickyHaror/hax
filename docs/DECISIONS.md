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
