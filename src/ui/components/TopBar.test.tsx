import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { StoreContext } from '../store';
import { button, click, identityStore, mount, unmount } from '../test/helpers';
import { client } from '../test/fixtures';
import { TopBar } from './TopBar';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

it('shows the mission, step and picked codename and opens help', async () => {
  const store = identityStore();
  const help = vi.fn();
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}>
    <TopBar title="Pizza Patrol" step="Step 2 of 4" onHelp={help} helpOpen />
  </StoreContext.Provider>, root));
  expect(root.textContent).toContain('>_HAX');
  expect(root.querySelector('h1')?.textContent).toBe('Pizza Patrol');
  expect(root.textContent).toContain('Step 2 of 4');
  expect(root.textContent).toContain('Brave Star');
  expect(button(root, 'Help me').getAttribute('aria-expanded')).toBe('true');
  await click(root, 'Help me'); expect(help).toHaveBeenCalledOnce();
});

it('keeps audio controls, Back and Stop reachable while playing', async () => {
  const store = identityStore(); store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  expect(button(root, 'Back')).toBeTruthy();
  expect(button(root, 'Stop for today')).toBeTruthy();
  await click(root, 'Sound controls');
  for (const name of ['Read to me', 'Sound on', 'Voices on', 'Sounds on', 'Music on']) expect(button(root, name)).toBeTruthy();
  await click(root, 'Close'); await click(root, 'Stop for today');
  expect(store.screen.value.name).toBe('stop');
});
