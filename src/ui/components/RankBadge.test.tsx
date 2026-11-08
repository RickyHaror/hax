import { act } from 'preact/test-utils';
import { afterEach, expect, it } from 'vitest';
import { client, login } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

it.each([0, 40, 60, 220, 1200, 1500])('shows rank and an accessible bounded XP bar at %s XP', async (xp) => {
  const deps = fakeDeps();
  deps.registry = { ...deps.registry, missions: [{ ...client, xp }] };
  const store = identityStore(deps);
  store.complete(client.id); store.go({ name: 'idcard' });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const bar = root.querySelector<HTMLProgressElement>('progress[aria-label="XP to next rank"]')!;
  const max = xp < 60 ? 60 : xp < 200 ? 200 : xp < 600 ? 600 : 1200;
  expect(bar.max).toBe(max);
  expect(bar.value).toBe(Math.min(xp, max));
  expect(root.textContent).toContain(xp >= 1200 ? `${xp} XP. Top rank!` : `${xp} / ${max} XP`);
  expect(root.querySelector('.rank-badge svg')?.getAttribute('aria-label')).toContain('rank insignia');
});

it('shows the union of commands from completed missions, including retired save history', async () => {
  const deps = fakeDeps();
  deps.registry = { ...deps.registry, missions: [
    { ...login, teaches: ['ls', 'cat'], retired: true },
    { ...client, teaches: ['cat', 'connect'] },
    { ...client, id: 'later', teaches: ['sudo'] },
  ] };
  const store = identityStore(deps);
  store.complete(login.id); store.complete(client.id); store.go({ name: 'idcard' });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const learned = root.querySelector('[aria-label="Commands learned"]')!;
  expect([...learned.querySelectorAll('li .speech-line > span')].map((line) => line.textContent))
    .toEqual(['ls', 'cat', 'connect']);
  expect(learned.textContent).not.toContain('sudo');
  expect(button(root, 'Back').disabled).toBe(false);
});

it.each([
  { xp: 20, prior: 0, rankUp: false }, { xp: 60, prior: 0, rankUp: true },
  { xp: 20, prior: 40, rankUp: true }, { xp: 20, prior: 60, rankUp: false },
])('detects a rank change with $xp mission XP after $prior XP', async ({ xp, prior, rankUp }) => {
  const deps = fakeDeps();
  const mission = { ...client, xp, contract: { client: { name: 'Sam', role: 'Owner' },
    problem: { text: 'Find a clue.' }, goal: { text: 'Send a clue.' }, allowed: ['shop-pc'], flag: 'CLUE{safe}' } };
  deps.registry = { ...deps.registry, missions: [{ ...login, xp: prior }, mission] };
  const store = identityStore(deps); store.complete(login.id); store.complete(mission.id);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  expect(root.textContent?.includes('Rank up! Rookie to Agent')).toBe(rankUp);
  expect(root.querySelector('[aria-label="Captured clue"]')?.textContent).toContain('CLUE{safe}');
  expect(root.querySelector('.done-access')?.textContent).toContain('ACCESS GRANTED');
  expect(root.querySelector('.done-unlocked')?.textContent).toContain('UNLOCKED');
  expect(root.textContent).toContain(`+${xp} XP`);
  await act(() => store.go({ name: 'idcard' }));
  expect(root.querySelector('progress')?.value).toBe(xp + prior);
});
