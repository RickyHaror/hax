import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx|mjs|js|md|css|html|json|yml|yaml|sh|toml)$/.test(f) && !f.includes('package-lock'));

/** Workflow files that must name the worker tooling. Nothing else may. */
const TOOLING_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'docs/orchestration/ORCHESTRATOR.md',
  'docs/orchestration/OWNER-HANDOFF.md',
  'docs/orchestration/REVIEWER-BRIEF.md',
  'docs/orchestration/task-packet.md',
  'scripts/orchestration/codex-run.sh',
  'scripts/checks/repo-text.test.ts',
  '.codex/config.toml',
]);

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

describe('repository text rules', () => {
  it('has no em-dashes or en-dashes anywhere', () => {
    const bad = tracked.filter((f) => DASHES.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });

  it('game code has no links to other websites', () => {
    const urlPattern = /https?:\/\/(?!localhost|127\.0\.0\.1)[^\s'"`)]+/g;
    const bad = tracked
      .filter((f) => f.startsWith('src/') || f === 'index.html' || f.startsWith('public/'))
      .flatMap((f) => (readFileSync(f, 'utf8').match(urlPattern) ?? []).map((u) => `${f}: ${u}`))
      .filter((s) => !s.includes('http://www.w3.org/2000/svg'));
    expect(bad).toEqual([]);
  });

  it('mentions no AI tools outside the workflow files', () => {
    const pattern = new RegExp(['cla' + 'ude', 'co-authored', 'session_', 'generated with', 'gpt-'].join('|'), 'i');
    const bad = tracked.filter((f) => !TOOLING_FILES.has(f) && pattern.test(readFileSync(f, 'utf8')));
    expect(bad).toEqual([]);
  });
});
