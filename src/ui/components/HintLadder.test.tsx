import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it } from 'vitest';
import { StoreContext } from '../store';
import { client } from '../test/fixtures';
import { button, click, identityStore, mount, unmount } from '../test/helpers';
import { HintLadder } from './HintLadder';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
async function show() {
  const store = identityStore();
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}>
    <HintLadder missionId={client.id} step={client.steps[1]!} />
  </StoreContext.Provider>, root));
  return store;
}
const states = () => [...root.querySelectorAll('.rung-state')].map((node) => node.textContent);

it('opens the next saved rung, gates Show me and keeps every hint readable', async () => {
  const store = await show();
  await click(root, 'Help me');
  expect(states()).toEqual(['opened', 'ready', 'after hint 2']);
  expect(button(root, '3 Show me').disabled).toBe(true);
  await click(root, '3 Show me');
  expect(store.progress.value.hints[client.id]?.answer?.rung).toBe(1);
  await click(root, '2 Bigger hint');
  expect(states()).toEqual(['opened', 'opened', 'ready']);
  await click(root, '3 Show me');
  expect(states()).toEqual(['opened', 'opened', 'opened']);
  expect(store.progress.value.hints[client.id]?.answer?.rung).toBe(3);
  expect(root.querySelectorAll('[aria-label="Read aloud"]')).toHaveLength(3);
  await click(root, '1 Nudge');
  expect(store.progress.value.hints[client.id]?.answer?.rung).toBe(3);
});

it('closes with Close or Escape and keeps the saved rung on reopen', async () => {
  const store = await show();
  await click(root, 'Help me'); await click(root, 'Close hints');
  expect(root.querySelector('.hint-panel')).toBeNull();
  await click(root, 'Help me');
  expect(states()).toEqual(['opened', 'opened', 'ready']);
  await act(() => { root.querySelector('.hint-panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  expect(root.querySelector('.hint-panel')).toBeNull();
  expect(store.progress.value.hints[client.id]?.answer?.rung).toBe(2);
});

it('drives the widget through the top bar and restores its saved Show me rung', async () => {
  const store = identityStore(); store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  for (let rung = 0; rung < 3; rung++) await click(root, 'Help me');
  expect(root.querySelector('input')?.value).toBe('Blue Box');
  await click(root, 'Close hints');
  expect(button(root, 'Help me').getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(button(root, 'Help me'));
  await unmount(root); root = await mount(store); await click(root, 'Tap to begin, Agent!');
  expect(root.querySelector('input')?.value).toBe('Blue Box');
  await click(root, 'Help me'); expect(states()).toEqual(['opened', 'opened', 'opened']);
});
