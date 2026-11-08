# Terminal first plan

Owner proposal, 2026-11-08. Founder approved the direction (terminal first, real hacking feel, no decoder
wheel); this plan needs founder sign off before any batch starts.

## Why

The player watched kids' hacking videos where people use a real terminal. Our missions feel like spy book
puzzles (decoder wheel, matching, pretend files). He owns decoder wheels already. The game should feel like a
real hacker's computer while a sidekick coaches him through every step.

## Principles

- The terminal is the game. Most of each mission happens at a prompt like `agent@hq:~$`.
- Real commands, simplified: the names and ideas are real (`ls`, `cd`, `cat`, `grep`), the output is short.
- Ethical always: every mission starts with a contract that says what he is allowed to hack, and why.
- Never stuck: command chips type the command for him, Tab completes, the hint ladder ends in "show me".
- Early reader: sidekick lines are short and read aloud; terminal output is short and big.
- Everything is fake and offline. No real network, no real system access.

## Keep

Shell engine and fake file system, hint ladder, read aloud and recorded voices, sidekicks (restyled as crew),
codename sign up, progress and saves, parent panel and timer, Playground (becomes a free terminal sandbox).
Boot Camp stays as short "agent training" for mouse and keyboard, restyled to match.

## Drop

Decoder wheel, drag and drop and matching steps, cartoon mission themes (pizza, zoo, cupcakes, socks).
Old progress stays saved, but the old missions leave the map.

## Missions

| # | Mission | He learns | Commands |
|---|---|---|---|
| 1 | First login | the terminal, who am I | `whoami`, `help`, `clear` |
| 2 | Look around | files hold information | `ls`, `cat` |
| 3 | Deep folders | moving through folders | `cd`, `pwd`, `cd ..` |
| 4 | Hidden files | some files hide | `ls -a` |
| 5 | Needle in a haystack | searching big files | `grep` |
| 6 | Weak door | why weak passwords fail | `login`, then a passphrase lesson |
| 7 | Map the network | computers talk on a network; stay in scope | `scan`, `connect` |
| 8 | Read the logs | spot the intruder | `tail`, `grep` |
| 9 | Phishing alert | trick emails | `mail`, `report` |
| 10 | Secret message | encoding is not hiding | `decode` (base64 style) |
| 11 | Lock it down | defenders fix things | `passwd`, `chmod` |
| 12 | Final contract | put it all together | everything |

Each mission: contract briefing, three to five terminal steps, "access granted" moment, rank up, one new
badge and one new command added to his profile.

## Build order

1. Founder brings the design mockups for the terminal direction.
2. Engine E5: full screen terminal layout and design system from the mockups, boot and login sequence,
   new commands (`whoami`, `pwd`, `ls -a`, `grep`, `tail`, `scan`, `connect`, `mail`, `report`, `decode`,
   `passwd`, `chmod`), agent profile with learned commands.
3. Content C4: missions 1 to 6. Content C5: missions 7 to 12 and the Playground sandbox.
4. Voice lines for the new missions, after the content is final.
5. Fresh eyes kid review pass, then launch.

## Cost and timing

- ElevenLabs: new content is roughly 500 to 700 lines, about 25,000 to 35,000 characters. That is most of a
  month of the current 40k credit plan. The founder approves the estimate before any run.
- Each batch is one BUILD and one VERIFY run of about two hours. Tests cannot run Monday to Friday
  8:45 AM to 5:15 PM Toronto, so weekday work is planning and code only in those hours.

## Founder decisions

1. Approve the mission list (change, add or drop any).
2. Boot Camp: keep as restyled training (recommended) or drop.
3. Phones: support them or Windows Edge laptop only.
