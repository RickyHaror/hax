import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { StoreContext } from '../store';
import { click, fakeDeps, identityStore, unmount } from '../test/helpers';
import { ClueToast } from './ClueToast';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); vi.useRealTimers(); });

async function toast() {
  vi.useFakeTimers();
  const deps = fakeDeps(); const store = identityStore(deps);
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}><ClueToast xp={20} /></StoreContext.Provider>, root));
  return deps;
}

it('announces the clue and XP, offers read aloud, and can be dismissed', async () => {
  const deps = await toast();
  expect(root.querySelector('[role="status"]')?.textContent).toContain('Clue found! +20 XP');
  await click(root, 'Read aloud');
  expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'Clue found! +20 XP' }, expect.any(Object));
  await click(root, 'Dismiss clue');
  expect(root.querySelector('[role="status"]')).toBeNull();
});

it('keeps the clue toast for four seconds', async () => {
  await toast();
  await act(() => { vi.advanceTimersByTime(3999); });
  expect(root.querySelector('[role="status"]')).not.toBeNull();
  await act(() => { vi.advanceTimersByTime(1); });
  expect(root.querySelector('[role="status"]')).toBeNull();
});
