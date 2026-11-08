import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArtComponent, Mission } from '../engine/types';
import { client, dependent, fixtureRegistry, login } from './test/fixtures';
import { click, fakeDeps, identityStore, mount, unmount } from './test/helpers';

let root: HTMLElement;
const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
afterEach(async () => {
  if (root) await unmount(root);
  if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll);
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  vi.unstubAllGlobals();
});

async function showMap(
  missions: readonly Mission[] = [dependent, client, login], completed: string[] = [],
  art: Record<string, ArtComponent> = {},
) {
  const deps = fakeDeps(); deps.registry = fixtureRegistry(missions);
  Object.assign(deps.registry.art, art);
  const store = identityStore(deps);
  store.progress.value = { ...store.progress.value,
    completed: Object.fromEntries(completed.map((id) => [id, deps.now().toISOString()])) };
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  return { deps, store };
}

function missionButton(title: string): HTMLButtonElement {
  const result = [...root.querySelectorAll<HTMLButtonElement>('button')]
    .find((element) => element.textContent?.startsWith(title));
  if (!result) throw new Error(`Missing mission: ${title}`);
  return result;
}

describe('mission map', () => {
  it.each([true, false])('uses client art when present, otherwise badge art: client %s', async (hasClient) => {
    const clientArt = vi.fn<ArtComponent>(({ size, title }) => <svg width={size} height={size} role="img" aria-label={title} />);
    const badgeArt = vi.fn<ArtComponent>(({ size, title }) => <svg width={size} height={size} role="img" aria-label={title} />);
    const mission: Mission = { ...client, client: hasClient ? { ...client.client!, art: 'client-logo' } : undefined,
      badge: { ...client.badge, art: 'training-badge' } };
    await showMap([mission], [], { 'client-logo': clientArt, 'training-badge': badgeArt });
    const chosen = hasClient ? clientArt : badgeArt;
    const unused = hasClient ? badgeArt : clientArt;
    expect(chosen).toHaveBeenCalled();
    expect(chosen.mock.calls[0]?.[0]).toEqual({ size: 88, title: '' });
    expect(unused).not.toHaveBeenCalled();
    const button = missionButton(mission.title);
    expect(button.textContent).toBe(mission.title + mission.blurb + '3 minutes');
    expect(button.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('keeps fallback art decorative and keeps done, next and locked text', async () => {
    await showMap(undefined, [login.id]);
    const done = missionButton(`✓ ${login.title}`);
    const next = missionButton(client.title);
    const locked = missionButton(`🔒 ${dependent.title}`);
    for (const button of [done, next, locked]) {
      expect(button.querySelector('svg[role="img"]')).not.toBeNull();
      expect(button.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(done.textContent).toBe(`✓ ${login.title}${login.blurb}1 minute`);
    expect(next.parentElement?.textContent).toContain('Next mission');
    expect(locked.parentElement?.textContent).toContain(`Finish ${client.title} first`);
    expect(locked.disabled).toBe(true);
  });

  it('opens the agent card and returns to the map with Back', async () => {
    const { store } = await showMap();
    await click(root, 'My agent card');
    expect(store.screen.value).toEqual({ name: 'idcard' });
    expect(root.querySelector('h1')?.textContent).toContain('Agent ID card');
    await click(root, 'Back');
    expect(store.screen.value).toEqual({ name: 'map' });
    expect(root.textContent).toContain('My agent card');
  });

  it.each([
    { available: false, complete: true, visible: false },
    { available: true, complete: false, visible: false },
    { available: true, complete: true, visible: true },
  ])('shows the playground door only with content and its unlock: $available, $complete', async ({ available, complete, visible }) => {
    const deps = fakeDeps();
    if (!deps.registry.playground) throw new Error('Playground content is required for this test.');
    const unlock = deps.registry.playground.unlockedBy;
    if (!available) deps.registry.playground = null;
    const store = identityStore(deps);
    if (complete) store.progress.value = { ...store.progress.value, completed: { [unlock]: 'done' } };
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const door = root.querySelector('button[aria-label="Agent Playground"]');
    expect(door !== null).toBe(visible);
    if (!visible) {
      expect(root.querySelector('[aria-label="Playground door"]')).toBeNull();
      return;
    }
    const card = door!.parentElement!;
    expect(card.querySelector('svg')).not.toBeNull();
    await act(() => card.querySelector<HTMLButtonElement>('button[aria-label="Read aloud"]')!.click());
    expect(deps.voice.speak).toHaveBeenLastCalledWith(
      { text: 'Explore your pretend computer. Find fun secrets!' }, expect.any(Object));
    await click(root, 'Agent Playground'); expect(store.screen.value.name).toBe('playground');
  });

  it('uses singular minute and keeps completed mission names starting with their title', async () => {
    await showMap(undefined, [login.id]);
    expect(missionButton(`✓ ${login.title}`).textContent).toContain('1 minute');
    expect(root.textContent).not.toContain('1 minutes');
    expect(missionButton(client.title).textContent).toContain('3 minutes');
  });

  it('marks only the first unlocked unfinished mission in game order', async () => {
    const { store } = await showMap([{ ...dependent, order: -1 }, client, login,
      { ...client, id: 'later', bit: 3, order: 3, title: 'Later Patrol' }], [login.id]);
    const markers = [...root.querySelectorAll('p')].filter((p) => p.textContent === 'Next mission');
    expect(markers).toHaveLength(1);
    expect(markers[0]?.parentElement).toBe(missionButton(client.title).parentElement);
    const locked = missionButton(`🔒 ${dependent.title}`);
    expect(locked.disabled).toBe(true);
    expect(locked.parentElement?.textContent).toContain(`Finish ${client.title} first`);
    await act(() => locked.click());
    expect(store.screen.value.name).toBe('map');
    await act(() => missionButton(client.title).click());
    expect(store.screen.value).toEqual({ name: 'player', missionId: client.id });
  });

  it.each([{ completed: [] }, { completed: [login.id, client.id, dependent.id] }])('has no next marker when nothing can start: $completed', async ({ completed }) => {
    await showMap(completed.length ? undefined : [{ ...dependent, requires: ['missing'] }], completed);
    expect(root.textContent).not.toContain('Next mission');
  });

  it('has one working read aloud control per card, including locked cards', async () => {
    const { deps } = await showMap(undefined, [login.id]);
    const missions = [login, client, dependent];
    for (const mission of missions) {
      const title = mission === login ? `✓ ${mission.title}` : mission === dependent ? `🔒 ${mission.title}` : mission.title;
      const card = missionButton(title).parentElement!;
      const readers = card.querySelectorAll<HTMLButtonElement>('button[aria-label="Read aloud"]');
      expect(readers).toHaveLength(1);
      expect(readers[0]!.title).toBe('Read aloud');
      await act(() => readers[0]!.click());
      expect(deps.voice.speak).toHaveBeenLastCalledWith(
        { text: expect.stringContaining(mission.blurb) }, expect.any(Object));
    }
    expect(deps.voice.speak).toHaveBeenLastCalledWith(
      { text: expect.stringContaining(`Finish ${client.title} first`) }, expect.any(Object));
  });

  it.each([
    { reduced: false, later: false }, { reduced: true, later: false },
    { reduced: false, later: true }, { reduced: true, later: true },
  ])('scrolls the whole next card into view, reduced: $reduced, later row: $later', async ({ reduced, later }) => {
    const scroll = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll });
    const matchMedia = vi.fn(() => ({ matches: reduced }));
    vi.stubGlobal('matchMedia', matchMedia);
    const missions = Array.from({ length: 6 }, (_, index) => ({
      ...client, id: `patrol-${index}`, bit: index + 1, order: index + 1, title: `Patrol ${index + 1}`,
    }));
    const target = missions[later ? missions.length - 1 : 0]!;
    await showMap([login, ...missions], [login.id, ...missions.slice(0, later ? -1 : 0).map((mission) => mission.id)]);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
    const card = missionButton(target.title).parentElement!;
    expect(scroll.mock.contexts[0]).toBe(card);
    expect(card.textContent).toContain('Next mission');
    expect(card.querySelector('button[aria-label="Read aloud"]')).not.toBeNull();
  });
});
