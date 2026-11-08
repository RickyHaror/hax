# Hax

A pretend-computer escape room that teaches an 8 year old computer basics and ethical hacking.
He plays a junior white hat agent hired by silly companies to find security holes before the bad
guys do. Everything is simulated in the browser: no real files, no network, no links out.

Live at https://hax.huxton.ca (static PWA on Cloudflare Pages, works offline after the first visit).

## Run locally

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build && npm run preview   # production build with the service worker, http://localhost:4173
```

## Test

```bash
npm run lint
npm run typecheck
npm test                 # unit tests, mission reading level, repository text rules
npx playwright install chromium msedge
npm run e2e              # Chromium and Edge at 1366x768 and 1920x1080, offline, axe
bash scripts/orchestration/gate.sh --e2e   # everything, under the machine lock and quiet hours
```

## Add a mission

1. Create `src/missions/<id>.ts` exporting a `Mission` (see `src/engine/types.ts`).
   Pick an unused `bit` (0 to 23, permanent) and the next `order`.
2. Client missions need a `client` with a permission slip and at least one step with `lockdown: true`.
3. Every step needs three hints: a nudge, a bigger hint, and a "show me".
4. Register it in `src/missions/index.ts`.
5. `npm test` checks ids, bits, hints, permission slips and the reading level of every line.
   The Playwright playthrough plays every registered mission automatically.

## Deploy

Pushing to `main` runs `.github/workflows/ci.yml`: lint, types, unit tests, build, browser tests,
then deploys `dist/` to the Cloudflare Pages project `hax` and smoke-tests the live site.
Credentials live only in GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` (Account, Cloudflare Pages,
Edit) and `CLOUDFLARE_ACCOUNT_ID`. Never commit a secret.

## How the work is organised

See `docs/orchestration/ORCHESTRATOR.md` (workflow), `AGENTS.md` (worker contract),
`docs/orchestration/BACKLOG.md` (what is next) and `docs/DECISIONS.md` (why).
