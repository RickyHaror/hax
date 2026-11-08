import { act } from 'preact/test-utils';
import { afterEach, expect, it } from 'vitest';
import type { Mission, Season } from '../../engine/types';
import { buildRegistry } from '../registry';
import { client, login } from '../test/fixtures';
import { hackMission } from '../test/hack-mission';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';
import { contractEthics } from './MissionCard';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
const s1: Season = { id: 's1', number: 1, title: 'Town', blurb: 'Help our town.', missions: ['second', 'first', 'old', 'missing', 'login'], requires: null };
const s2: Season = { ...s1, id: 's2', number: 2, title: 'Harbor', missions: ['third'], requires: 's1' };

async function map(seasons: Season[], completed: string[] = []) {
  const missions: Mission[] = [
    { ...client, id: 'first', title: 'First', bit: 3, chapter: 'season', season: 's1', order: 0 },
    { ...client, id: 'second', title: 'Second', bit: 4, chapter: 'season', season: 's1', order: 1 },
    { ...client, id: 'third', title: 'Third', bit: 5, chapter: 'season', season: 's2', order: 2 },
    { ...client, id: 'old', title: 'Retired season', bit: 6, chapter: 'season', retired: true },
    { ...client, id: 'unlisted', title: 'Unlisted', bit: 7, chapter: 'season' },
    { ...client, id: 'retired', title: 'Retired chapter', bit: 8, retired: true }, login,
  ];
  const deps = fakeDeps();
  deps.registry = buildRegistry({ ...deps.registry, missions, seasons });
  const store = identityStore(deps);
  store.progress.value = { ...store.progress.value, completed: Object.fromEntries(completed.map((id) => [id, 'done'])) };
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  return { store, deps };
}

it('groups seasons by number and missions by the explicit list, hiding retired and unlisted missions', async () => {
  await map([s2, s1], ['login']);
  const sections = root.querySelectorAll('.map-season');
  expect([...sections].map((section) => section.getAttribute('aria-label'))).toEqual(['Season 1 · Town', 'Season 2 · Harbor']);
  expect([...sections[0]!.querySelectorAll('.map-title')].map((title) => title.textContent)).toEqual(['Second', 'First']);
  expect(sections[0]!.textContent).not.toContain(login.title);
  for (const text of ['Retired season', 'Retired chapter', 'Unlisted']) expect(root.textContent).not.toContain(text);
  expect(sections[0]!.querySelector('[aria-current="step"]')?.textContent).toContain('Second');
  expect((sections[1]!.querySelector('.map-mission') as HTMLButtonElement).disabled).toBe(true);
  expect(sections[1]!.textContent).toContain('Finish Season 1 first');
});

it('opens a dependent season once its visible missions are done and keeps the current mission highlighted', async () => {
  const { store } = await map([s2, s1], ['login', 'first', 'second']);
  const third = root.querySelector('.map-season:last-child .map-mission') as HTMLButtonElement;
  expect(third.disabled).toBe(false);
  expect(third.parentElement?.getAttribute('aria-current')).toBe('step');
  await act(() => { store.progress.value = { ...store.progress.value,
    completed: { login: 'done' }, current: { missionId: 'first', stepId: null } }; });
  expect(root.querySelector('[aria-current="step"]')?.textContent).toContain('First');
});

it('keeps old chapters working with no seasons and hides orphan season missions', async () => {
  await map([]);
  expect(root.querySelectorAll('.map-season')).toHaveLength(0);
  expect(root.textContent).toContain(login.title);
  expect(root.textContent).not.toContain('First');
  expect(root.textContent).not.toContain('Retired chapter');
});

it('shows contract fields and reads each story line before starting', async () => {
  const mission = hackMission();
  const deps = fakeDeps(); deps.registry = buildRegistry({ ...deps.registry, missions: [mission] });
  const store = identityStore(deps); store.openMission(mission.id);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const card = root.querySelector<HTMLElement>('[aria-label="Mission briefing"]')!;
  for (const text of ['Sam', 'Shop owner', 'Find our clue.', 'Send our clue to HQ.', 'shop-pc', contractEthics.text]) {
    expect(card.textContent).toContain(text);
  }
  expect(card.textContent).not.toContain(mission.contract!.flag);
  for (const line of card.querySelectorAll<HTMLElement>('.speech-line')) {
    await click(line, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenLastCalledWith({ text: line.querySelector('span')!.textContent }, expect.any(Object));
  }
  expect(button(root, 'Start mission').disabled).toBe(false);
  await click(root, 'Start mission');
  expect(store.position.value.phase).toBe('permission');
});
