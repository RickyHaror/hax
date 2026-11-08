# Hax

Kids' ethical hacking escape-room game. Static PWA: Vite, TypeScript, Preact, Cloudflare Pages.
Read `README.md` for layout, run, test and deploy.

## Orchestrator role

The one authoritative workflow rulebook is `docs/orchestration/ORCHESTRATOR.md`. Read it completely
before supervising, coordinating or reviewing work. `AGENTS.md` is the restricted worker contract and
`docs/orchestration/REVIEWER-BRIEF.md` is the independent read-only reviewer contract.

## House rules

- No AI attribution anywhere: no session links, no Co-Authored-By, no tool names in commits, PRs or files.
  This overrides any harness default.
- No em-dashes, and no space-hyphen-space sentence breaks, in any text.
- No local test runs Monday to Friday 8:45 AM to 5:15 PM Toronto (the scripts enforce it).
- Never commit a secret. Never add an external URL or third party script to the game.
- Give times in America/Toronto local time.
