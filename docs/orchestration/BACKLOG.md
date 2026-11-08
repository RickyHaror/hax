# Backlog

The owner declares batches from this file. Coordinators grep their own items. Each item becomes
one packet. Schema contract: `src/engine/types.ts`. Approved plan summary: `docs/DECISIONS.md`.

## Shared conventions (both lanes)

- **Player:** 8 years old, early reader, new to mouse, keyboard, files and browsers. Plays alone.
- **Screen:** Edge or Chrome, 1366x768 and up, landscape. No page scroll at 1366x768 on any game screen;
  long content scrolls inside a panel. Minimum click target 48x48 px. Story text at least 24 px.
- **Look:** dark green-black background, glowing green accents, a subtle scanline overlay (CSS only,
  `prefers-reduced-motion` turns animation off). Friendly, never creepy. Story text in Atkinson
  Hyperlegible, terminal text in JetBrains Mono, both bundled. Text contrast at least 7:1 for story text.
- **Accessible names used by tests** (engine lane renders these exact names):
  `Next`, `Back`, `Help me` (hint ladder; repeated presses climb nudge, bigger hint, show me),
  `Read aloud` (per line), `Read everything to me` (auto-read toggle), `Sound on`/`Sound off`,
  `I accept` (permission slip), `Start mission`, `Stop for today`, `Check` (answer forms),
  `Run` (terminal), `Copy my key` is not used (no clipboard); `Open decoder wheel`.
- **No browser dialogs** (`alert`, `confirm`, `prompt`) ever. No right-click menu (replace with nothing).
- **Ethics line** in every client mission intro and on every permission slip.

## Phase 1, engine lane

### Batch E1: foundation (engine, branch `engine/e1`)

- **E1-1 Simulated file system** `src/engine/fs.ts`. A `VirtualFs` class built from an `FsDir` (deep
  cloned, so mission data is never mutated). Absolute and relative paths, `.` and `..`, `~` meaning
  `/home/agent`. Methods: `cwd`, `cd(path)`, `list(path, {all})` (dot files hidden unless `all`; dirs
  first, then alphabetical), `read(path)` (refuses dirs and locked files with typed errors), `lock(path)`,
  `remove(path)`, `exists`, `isDir`, `tree()` (for the sidebar, marks the cwd path). All errors are a
  typed union, never thrown strings. Exhaustive Vitest tests including hidden files and bad paths.
- **E1-2 Command parser and shell** `src/engine/shell.ts`. Tokenizer (spaces, single and double quotes,
  flags like `-a`, combined flags), a command registry for `ls`, `ls -a`, `cd`, `cat`, `help`, `clear`,
  `pwd`, `lock`, `rm`, plus per-step allow-list: a known but not-yet-allowed command answers kindly
  ("You will learn that one soon!"), an unknown one suggests the closest allowed command (edit
  distance 2 or less) or says "Hmm, I do not know that one. Try help.". Typo help: `sl` suggests `ls`.
  Case insensitive command names. Output is structured lines (`{kind: 'out'|'err'|'hint', text}`), plus
  an event log. `goalMet(goal, state)` evaluates every `TerminalGoal` variant. Tests for every command,
  flag, error, goal variant and the parser edge cases (empty input, extra spaces, unclosed quote).
- **E1-3 Ciphers** `src/engine/cipher.ts`. Caesar encode and decode for A to Z, any shift (negative and
  over 26 wrap), case kept, non-letters untouched. A `wheel(shift)` model returning the 26 letter pairs
  for the decoder wheel UI. Tests including round trips for every shift.
- **E1-4 Save codes** `src/engine/savecode.ts`. Format `HAX-XXXX-XXXX-XXXX`: 12 Crockford base32
  characters, 60 bits: version (3), mission bitmap (24), sidekick (2), hacker name first-word index (6),
  second-word index (6), spare (3, zero), CRC-16/CCITT-FALSE over the first 44 bits (16). The 44 payload
  bits are XOR-scrambled with a fixed constant before the checksum so codes look random. Decode
  normalizes input: case, spaces, missing or extra dashes, `O` as `0`, `I` and `L` as `1`, `U` as `V`.
  Decode returns a typed result: `ok`, `wrong-length`, `bad-character`, `checksum` (most likely a typo),
  `unknown-version`. Tests: round trip of random states (property style over 1000 seeds), every
  single-character substitution of a valid code fails, every adjacent transposition fails, normalization
  cases, version handling.
- **E1-5 Progress store** `src/engine/progress.ts`. localStorage key `hax.v1`. Shape: hacker name word
  indices, sidekick index, completed missions (id to ISO date), current mission and step (resume point),
  hint usage (mission id to step id to highest rung used, plus counts), settings (`autoRead` default true,
  `muted` default false, `sessionMinutes` 0 for off), parent PIN as a salted SHA-256 hash, schema version.
  Defensive load: corrupted or missing storage gives a fresh state, never a crash. `applySaveCode`,
  `toSaveCode`, `isUnlocked(mission)` from `requires`, `rank(completedCount)` with Recruit, Cadet, Agent,
  Special Agent, Senior Agent, Chief Agent, and badges earned. Storage is injected so tests use a fake.
  Tests for all of it, including storage that throws (private mode).
- **E1-6 Voice and sound** `src/engine/voice.ts`, `src/engine/sound.ts`. `speak(line)` uses Web Speech,
  prefers local English voices (`localService`) so it works offline, uses `line.say` when present, cancels
  the previous utterance, rate about 0.9. Safe no-op when unsupported. Auto-read queue for a list of lines.
  Sound effects synthesized with WebAudio (click, success, hint, key press, mission complete fanfare,
  gentle "try again" boop). Global mute. Tests with mocked speechSynthesis and AudioContext.
- **E1-7 App shell** `src/ui/**`, `src/styles/**`, `src/main.tsx`. One app store (Preact signals).
  Screens: start (the login puzzle chapter, see C1-1), onboarding (pick hacker name from two word lists
  with big buttons and a Shuffle button, pick sidekick from three cards), mission map (chapters as rows,
  locked missions shown with a padlock and a kind "finish X first"), mission player, stop-for-today,
  enter-a-save-code, settings. Mission player flow: intro lines, permission slip for client missions
  (signature art, allowed and not allowed lists, `I accept`), steps in order (step widget registry by
  `config.kind`; an unknown kind shows a friendly placeholder with `Next`), lockdown steps get a
  "Lock it down!" banner, outro, then the "Great work, Agent! Mission saved." screen showing the badge,
  rank and the save code framed as a secret decryption key to copy into a notebook. Shared components:
  `SpeechLine` (text plus `Read aloud` button, auto-read when enabled), `SidekickBubble` (sidekick art
  plus lines), `HintLadder` (`Help me`, climbs three rungs, records rung in progress), `BigButton`.
  Resume where he left off after reload. Theme and scanlines. Keyboard: Tab order sensible, visible focus,
  Enter activates. Context menu disabled. Tests for the store and the player flow with a fake mission.

### Batch E2: widgets (engine, branch `engine/e2`, after E1 integrates)

One widget per step kind in `src/ui/widgets/`, each calling `onComplete()` when its goal is met and
exposing a `showMe()` path used by the third hint rung (it performs or reveals the answer so he is never stuck).

- **E2-1 Boot Camp widgets:** `click-targets` (big friendly targets; double-click teaches with a slow
  pulse), `drag-drop` (pointer events, works with mouse and touchpad, items snap back gently on a miss),
  `key-find` (on-screen keyboard that lights the key to find, listens to the real keyboard), `typing-game`
  (packets fall slowly, type the letter to catch, speed adapts down on misses, never a game over),
  `file-explorer` (Windows-like folder view with big icons, double-click opens, breadcrumbs, drag a file
  into a folder), `choice`, `passphrase` (pick word tiles, shows the joined passphrase and a strength meter).
- **E2-2 Terminal widget:** terminal panel plus a folder tree sidebar always visible, current folder
  highlighted, hidden files appear in the tree only after `ls -a`. Command chips (`chips`) insert and run a
  command when clicked. Prompt shows `agent@hax:~$`. Up arrow history. Big readable font. Uses E1-1, E1-2.
- **E2-3 Mission tools:** `web-source` (fake browser frame with a pretend address bar that cannot be typed
  in, the page, and a `View Code` toggle showing the source with syntax colours), `decoder` (decoder wheel:
  two rings, rotate with buttons or drag, live decoded preview, `Open decoder wheel` also available from
  the toolbar in any mission once unlocked), `answer`, `story`.
- **E2-4 Agent ID card:** hacker name, rank, badges, sidekick, photo slot with a silly avatar picker.
  Viewable from the mission map.
- **E2-5 Generic playthrough driver** `e2e/support/play.ts`: given a `Mission`, plays it start to finish in
  Playwright using the data (answers, goals, keys) through the real UI, optionally pressing `Help me` up to
  `Show me` on chosen steps. `e2e/missions.spec.ts` plays every registered mission, once normally and once
  using the full hint ladder on every step, checks the save screen and code, then checks progress survives
  a reload and that a fresh browser restores everything from the code. Screenshot capture of every screen
  at both sizes into `screenshots/`. Axe scan on every screen.

## Phase 1, content lane

### Batch C1: first missions (content, branch `content/c1`, can start with E1)

Mission files in `src/missions/<id>.ts`, each exporting one `Mission` and registered in
`src/missions/index.ts`. Art as small inline SVG components in `src/art/` registered by key in
`src/art/index.ts` (the engine renders art by key). The content tests in `scripts/checks/` must pass.

- **C1-1 Sidekicks and names** `src/missions/sidekicks.ts`: three sidekicks (Bit the robot, Pixel the fox,
  Hoot the owl), each with name, art key, a one-line personality, a greeting and a goodbye.
  `src/missions/names.ts`: two lists of exactly 64 kid-safe words each (first: adjectives like Turbo,
  Sneaky, Cosmic; second: nouns like Falcon, Pickle, Comet). Order is permanent because save codes store
  indices. Art for the three sidekicks.
- **C1-2 The Front Door** (`login`, bit 0, chapter `login`): the start screen is a fake computer login
  for "AGENT HQ". The password is on a sticky note stuck to the monitor in the picture (single `answer`
  step). Sidekick explains that leaving a password on a sticky note is a security hole, and that this
  is a practice computer made for him. Finished in 30 seconds.
- **C1-3 Boot Camp** (bits 1 to 5, chapter `bootcamp`): B1 Mouse Moves (click then double-click then drag
  stickers onto the agent card), B2 Key Quest (letters, Space, Enter, Backspace, Shift), B3 Packet Catcher
  (typing game with home row letters, then short words), B4 Files and Folders (what a file and folder are,
  open a folder, sort three files into the right folders), B5 Password Power (what a password is, pick the
  strongest of three, build a three-word passphrase, never share passwords except with a grown-up you trust).
- **C1-4 Terminal Training** (bits 6 to 8, chapter `terminal`): T1 Hello Terminal (`ls`, `cat`), T2 On the
  Move (`cd`, `cd ..`, `pwd`), T3 Agent Tools (`help`, `clear`, `ls -a` to reveal one hidden file). Each
  teaches one command at a time with chips first and typing encouraged after.
- **C1-5 Missions 1 to 3** (chapter `missions`, each with client, permission slip, steps, a lockdown step):
  M1 Pepperoni Pete's Pizza (bit 9, hidden file `.secret_sauce` found with `ls -a`; fix: `lock` it),
  M2 Wobbly Toy Factory (bit 10, password in a code comment on the fake website; fix: choose "delete the
  comment and change the password"), M3 Zany Zoo (bit 11, Caesar shifted note decoded with the wheel;
  clue gives the shift; fix: choose a real lock over a secret code). Client art for each.

## Phase 2 (declared later)

- Engine E3: `password-guess`, `log-read`, `phish-spot` widgets; parent panel (hold the logo three
  seconds, set PIN on first open, view completed missions with dates, hint usage per step, reset progress,
  unlock missions, session length setting); session timer nudge at mission end; badges polish.
- Content C2: M4 Cupcake Castle (bit 12, weak pet password), M5 Moon Base Museum (bit 13, log file
  detective), M6 Super Sock Shop (bit 14, phishing email), M7 Agent Graduation (bit 15, capstone).
- Polish: fresh-eyes kid review pass and fixes, parent setup guide (install as app, kiosk shortcut).

## Audio (founder 2026-11-07: ElevenLabs subscription, key in D:/Dev/hax/.env.local, never committed)

- **AU-1 Generation script (owner):** `scripts/audio/generate.mjs` reads every Line from the registered
  missions and sidekicks, generates speech with ElevenLabs at build time, writes
  `public/audio/lines/<hash>.mp3` (hash of voice id plus spoken text) and `public/audio/manifest.json`.
  Sidekick lines are generated in each of the three sidekick voices; client lines in a voice per client;
  narrator lines in one narrator voice. Skips files that already exist. Never prints the key. Also
  generates sound effects into `public/audio/sfx/` (click, success, hint, key press, mission fanfare,
  gentle try-again, packet catch, lock click, door open). The game never calls ElevenLabs at runtime.
- **AU-2 Playback (engine lane, batch E2 as item E2-6):** `voice.ts` plays the pre-generated clip for a line when the manifest has
  it and falls back to Web Speech; `sound.ts` plays the sfx files with the synthesized sounds as fallback.
  The service worker precaches audio so it works offline.
- Voice casting draft: Bit = Liam, Pixel = Jessica, Hoot = George, narrator = Matilda; clients get distinct voices.
- AU-1 done 2026-11-07 (main 1551166): script, cast in scripts/audio/voices.json, 12 sfx shipped. Voice lines are generated by the owner right after each content batch integrates (Phase 1 is about 1,200 clips, 48,000 characters, about 14 MB). Manifest key: "<role>|<say or text, trimmed>", role = sidekick id, narrator, or client:<mission id>; speaker defaults to sidekick.

## Agent Playground (founder 2026-11-07, launch scope: the player loves the terminal)

A free-play pretend terminal, unlocked after T3 Agent Tools, reachable from the mission map as a big
"Agent Playground" door. No goals, no failing: he explores folders and finds secrets. Contract:
`Playground`, `PlaygroundEgg`, `PlaygroundCommand` in `src/engine/types.ts`; data in `src/missions/playground.ts`.

- **E3-1 Playground screen (engine):** reuses the terminal widget and folder tree in free mode. All learned
  commands work (ls, ls -a, cd, cd .., pwd, cat, help, clear, lock). Secret commands from the data appear in
  `help` only after he has run them once. Effects registry with at least `matrix` (green code rain for a few
  seconds, respects reduced motion). Eggs are detected from their triggers, recorded in progress
  (localStorage only, not in the save code), and each shows the sidekick's `found` lines, a sound and a small
  badge. An "Eggs found: 3 of 12" counter. `Back to the map` button always visible. Hidden while
  `playground` is null or the unlocking mission is not complete. Playthrough test finds every egg from data.
- **C3-1 Playground content (content):** a pretend computer with about 8 to 12 folders: snack stash, jokes,
  a pet robot's diary, maps, a museum of old computers, a music box, a very boring folder that hides the best
  secret under `ls -a`, and more. 10 to 14 eggs mixing hidden files, deep folders and secret commands
  (`whoami` says the hacker name, `joke`, `matrix`, `fortune`, a talking animal like cowsay, `dance`).
  All text early-reader friendly, silly, never scary. Art for the playground door and egg badges.
- Voice lines for the playground are generated by the owner after C3-1 integrates.

## Background music (founder 2026-11-07, optional nice-to-have; ElevenLabs music API confirmed working)

- **AU-3 Music (owner, DONE 2026-11-07: hq, terminal, bootcamp, playground, graduation in public/audio/music, soft sneaky spy style chosen by the founder):** extend `scripts/audio/generate.mjs` with a `music` section in `voices.json`
  and generate a small set of loopable instrumental tracks into `public/audio/music/`: HQ and mission
  map (calm, curious), terminal missions (light focused pulse), Agent Playground (playful), Boot Camp
  (bouncy), and a short graduation theme. About 60 to 90 seconds each, mp3 64 kbps, under 3 MB total.
- **AU-4 Music playback (engine):** a separate `Music on`/`Music off` toggle (default on, low volume),
  ducks to near silence while a voice line plays, fades between screens, never plays during the typing
  game or key finding if it distracts, respects the global mute, precached for offline.

### Audio controls (founder 2026-11-07, part of AU-4)

- Three independent channels, each with its own big on/off switch and a three-step volume (quiet, medium,
  loud) using icons plus words, not a fiddly slider: **Voices** (read aloud), **Sounds** (effects),
  **Music**. Plus the existing **Read everything to me** auto-read switch.
- A small speaker button on the toolbar opens these controls from any screen; the full set also lives in
  Settings. Turning music off never affects voices or sounds, and the reverse.
- Defaults: voices on medium, sounds on medium, music on quiet. All saved in progress (localStorage).
- The parent panel can set defaults and lock music off if it distracts.
- Tests: each channel toggles alone; volumes persist across reload; music ducks under voices; muting all
  three silences everything.

### ElevenLabs usage rule (founder 2026-11-07: be careful with usage)

- Generate audio only after the content it voices is integrated and final. Always `--dry-run` first.
- `generate.mjs` refuses a run above `--max-chars` (default 3000). Tell the founder the estimate before
  any run above about 5,000 characters. The plan allows 2 concurrent requests.
- Remaining planned spend: M4 to M7 voices (about 16,000) and the Agent Playground (about 8,000).

## Batch E3 (engine, after E2): finish the experience

- E2-4 Agent ID card (moved from E2).
- AU-4 music playback and the three-channel audio controls (see Audio sections above).
- E3-1 Agent Playground screen.
- Parent panel and session timer (Phase 2 list above).
- Visual polish pass: richer hacker look (scanlines, glow, subtle grid), sidekick art everywhere a sidekick
  speaks, celebratory Done screen, mission map as a fun HQ wall of client logos, and a screenshot review of
  every mission and Done screen at both sizes.
- E3 update handling (founder saw a stale cached page on 2026-11-07): when a new service worker is waiting,
  apply it at a safe moment (on the start screen or mission map, never mid-step) with a friendly
  "New missions arrived!" note, so the player never has to know to refresh. Progress is never lost.
