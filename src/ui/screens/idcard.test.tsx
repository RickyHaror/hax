import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { loadProgress, STORAGE_KEY } from '../../engine/progress';
import { createStore } from '../store';
import { AVATARS } from '../components/Avatar';
import { client, login } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

async function openCard(deps = fakeDeps()) {
  const store = identityStore(deps);
  root = await mount(store);
  await click(root, 'Tap to begin, Agent!');
  await click(root, 'My agent card');
  return { store, deps };
}

describe('Agent ID card', () => {
  it('shows a fresh agent, sidekick art, a photo slot, and a kind badge prompt', async () => {
    await openCard();
    expect(root.querySelector('h1')?.textContent).toContain('Agent ID card');
    for (const text of ['Brave Star', 'Rookie', 'Bit', 'Pick your photo',
      'Finish a mission to earn your first badge.']) expect(root.textContent).toContain(text);
    expect(root.querySelector('[aria-label="Your sidekick"] [role="img"]')?.getAttribute('aria-label')).toBe('Bit');
    expect(root.querySelector('[aria-label="Your photo"] [role="img"]')?.textContent).toBe('?');
    expect(AVATARS.length).toBeGreaterThanOrEqual(8);
    for (const { word } of AVATARS) expect(button(root, word).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows the chosen sidekick, earned badge art and names, and current rank', async () => {
    const deps = fakeDeps();
    deps.registry = { ...deps.registry, missions: deps.registry.missions.map((mission) =>
      mission.id === client.id ? { ...mission, xp: 200 } : mission) };
    const store = identityStore(deps);
    store.identify(1, 0, 1);
    store.complete(client.id); store.complete(login.id);
    store.go({ name: 'map' });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await click(root, 'My agent card');
    for (const text of ['Swift Otter', 'Senior Agent', 'Pixel', 'Door Star', 'Pizza Shield']) {
      expect(root.textContent).toContain(text);
    }
    expect(root.textContent).not.toContain('Finish a mission');
    const badges = root.querySelector('[aria-label="Earned badges"]')!;
    expect([...badges.querySelectorAll('[role="img"]')].map((art) => art.getAttribute('aria-label')))
      .toEqual(['Door Star', 'Pizza Shield']);
    expect(root.querySelector('[aria-label="Your sidekick"] [role="img"]')?.getAttribute('aria-label')).toBe('Pixel');
    expect(badges.textContent).not.toContain('Toy Patrol');
  });

  it('saves every tile choice at once and keeps the selected photo on reload', async () => {
    const { deps, store } = await openCard();
    for (const [index, { word }] of AVATARS.entries()) {
      await click(root, word);
      expect(button(root, word).getAttribute('aria-pressed')).toBe('true');
      expect(root.querySelectorAll('.avatar-picker button[aria-pressed="true"]')).toHaveLength(1);
      expect(root.querySelector('[aria-label="Your photo"] [role="img"]')?.getAttribute('aria-label')).toBe(word);
      expect(loadProgress(deps.storage).avatar).toBe(index);
      expect(store.saved.value).toBe(true);
    }
    await unmount(root);
    const reloaded = createStore(deps);
    root = await mount(reloaded); await click(root, 'Tap to begin, Agent!');
    await click(root, 'My agent card');
    expect(button(root, 'Unicorn').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[aria-label="Your photo"] [role="img"]')?.getAttribute('aria-label')).toBe('Unicorn');
    await click(root, 'Back'); expect(reloaded.screen.value.name).toBe('map');
  });

  it('repairs a bad stored photo and still lets the agent choose one', async () => {
    const deps = fakeDeps();
    const seeded = identityStore(deps);
    deps.storage.setItem(STORAGE_KEY, JSON.stringify({ ...seeded.progress.value, avatar: 99 }));
    root = await mount(createStore(deps)); await click(root, 'Tap to begin, Agent!');
    await click(root, 'My agent card');
    expect(root.querySelector('[aria-label="Your photo"] [role="img"]')?.textContent).toBe('?');
    await click(root, 'Robot'); expect(loadProgress(deps.storage).avatar).toBe(0);
  });

  it.each([false, true])('reads every card text line, including badges: %s', async (progressed) => {
    const { deps, store } = await openCard();
    if (progressed) await act(() => { store.complete(client.id); store.go({ name: 'idcard' }); });
    for (const line of root.querySelectorAll('.idcard-screen .speech-line')) {
      const text = line.querySelector('span')!.textContent!;
      expect(text.split(/\s+/).length).toBeLessThanOrEqual(12);
      await click(line as HTMLElement, 'Read aloud');
      expect(deps.voice.speak).toHaveBeenLastCalledWith({ text }, expect.any(Object));
    }
  });
});
