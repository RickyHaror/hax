import { act } from 'preact/test-utils';
import { afterEach, expect, it } from 'vitest';
import { rank, toSaveCode } from '../../engine/progress';
import { client } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

it.each([0, 1, 2])('celebrates with the selected sidekick %s and a working read button', async (sidekick) => {
  const deps = fakeDeps();
  const store = identityStore(deps);
  store.identify(0, 1, sidekick);
  store.complete(client.id);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const buddy = deps.registry.sidekicks[sidekick]!;
  const cheer = root.querySelector<HTMLElement>(`section[aria-label="${buddy.name} says"]`)!;
  expect(cheer.textContent).toContain('You did it! I am so proud of you.');
  expect(cheer.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe(buddy.name);
  await click(cheer, 'Read aloud');
  expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'You did it! I am so proud of you.' },
    expect.objectContaining({ sidekick: buddy.id, onEnd: expect.any(Function) }));
  expect(root.querySelector('h1')?.textContent).toBe('Great work, Agent! Mission saved.');
  expect(root.textContent).toContain(client.badge.name);
  expect(root.textContent).toContain(rank(1));
  expect(root.querySelector('output')?.textContent).toBe(toSaveCode(store.progress.value, deps.registry.missions));
  expect(button(root, 'Next').disabled).toBe(false);
  await click(root, 'Next');
  expect(store.screen.value.name).toBe('map');
});

it('keeps the unsaved heading and notebook warning alongside the cheer', async () => {
  const store = identityStore();
  store.complete(client.id);
  await act(() => { store.saved.value = false; });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  expect(root.querySelector('h1')?.textContent).toBe('Great work, Agent!');
  expect(root.textContent).toContain('This computer could not save.');
  expect(root.textContent).toContain('You did it! I am so proud of you.');
  expect(root.querySelector('section[aria-label="Secret decryption key"]')).toBeTruthy();
  expect(button(root, 'Next').disabled).toBe(false);
});
