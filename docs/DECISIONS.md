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
