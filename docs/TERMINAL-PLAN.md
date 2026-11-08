# Terminal first plan

Founder approved 2026-11-08: terminal first, every mission a real (fake) break in, keep Boot Camp, support
phones, and make it a long, ongoing game. The mission list below is the Season 1 plan.

## Why

The player watched kids' hacking videos where people use a real terminal. Our missions feel like spy book
puzzles (decoder wheel, matching, pretend files). He should feel he actually hacked a computer, every time.

## Principles

- The terminal is the game. Most of each mission happens at a prompt on the target machine.
- Every mission is a hired break in: a target computer, a contract saying what he may touch, a flag to
  capture, and an ACCESS GRANTED moment. Commands are taught along the way, never as a lesson first.
- Real commands, simplified: real names and ideas, short output.
- Ethical always: contracts set the scope; stepping outside it gives a warning; he also fixes what he broke.
- Never stuck: command chips type the command for him, Tab completes, the hint ladder ends in "show me".
- Early reader: sidekick lines are short and read aloud; terminal output is short and big.
- Works on the Windows laptop in Edge and on phones. On phones, chips and a command bar do most of the
  typing, and the terminal fits a portrait screen.
- Everything is fake and offline. No real network, no real system access.

## Keep

Shell engine and fake file system, hint ladder, read aloud and recorded voices, sidekicks (restyled as crew),
codename sign up, progress and saves, parent panel and timer, Playground (becomes a free terminal sandbox).
Boot Camp stays as agent training for mouse, keyboard and touch, restyled to match.

## Drop

Decoder wheel, drag and drop and matching steps, cartoon mission themes (pizza, zoo, cupcakes, socks).
Old progress stays saved, but the old missions leave the map.

## Season 1: Corner Town

| # | Target | The hack | Commands |
|---|---|---|---|
| 1 | Toy shop's old computer | default password `admin` | `login`, `whoami`, `ls` |
| 2 | Same shop | password left in a note | `cat`, `cd` |
| 3 | Game server | hidden folder holds the flag | `ls -a`, `pwd` |
| 4 | Website | password in a page source comment | `view-source` |
| 5 | Log server | search thousands of lines | `grep` |
| 6 | Locked door | weak password from clues (pet plus birthday) | `login` |
| 7 | Company network | scan, find the open door, connect | `scan`, `connect` |
| 8 | That machine | become the boss user with a found password | `sudo` |
| 9 | Hidden messages | decode base64 | `decode` |
| 10 | Phishing test | write a fake trick email, see who clicks | `mail` |
| 11 | Switch sides | fix every hole he used | `passwd`, `chmod` |
| 12 | Final contract | full break in against a timer and an alarm | everything |

Each target looks like a different machine (name, prompt, colors, banner). Too many wrong guesses raise an
alarm meter. Each mission ends with a captured flag, a rank up and a new command in his profile.

## A long game

- Seasons: Season 1 above; later seasons add new skills (Wi Fi, passwords and hashes, web forms, malware
  cleanup, defending a network live) and a story arc with a rival crew.
- Ranks and a skill tree: Rookie up to Crew Chief (from the mockups). Commands he has learned stay in his toolkit.
- Daily contracts: short generated break ins built from parts he already knows, so there is always
  something new to hack between seasons.
- Playground: a free sandbox machine to explore with every command he owns.

## Build order

1. Founder brings the design mockups for the terminal direction (laptop and phone).
2. Engine E5: terminal screen and design system from the mockups, laptop and phone layouts, boot and
   login, target machines, alarm meter, flags, ranks and profile, new commands.
3. Content C4: Season 1 missions 1 to 6. Content C5: missions 7 to 12, Boot Camp restyle, Playground.
4. Voice lines for Season 1, after the content is final.
5. Fresh eyes kid review pass, then launch Season 1.
6. Then: daily contracts (engine plus content), then Season 2.

## Cost and timing

- ElevenLabs: Season 1 is roughly 500 to 700 lines, about 25,000 to 35,000 characters, most of a month of
  the current 40k credit plan. Founder approves each estimate before any run. Daily contracts reuse
  recorded parts (like the codename word clips) so they need few new clips.
- Each batch is one BUILD and one VERIFY run of about two hours. Tests cannot run Monday to Friday
  8:45 AM to 5:15 PM Toronto, so weekday work is planning and code only in those hours.
