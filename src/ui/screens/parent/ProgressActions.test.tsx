import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { loadProgress } from '../../../engine/progress';
import { PLAYGROUND_KEY } from '../../../engine/playground';
import { StoreContext } from '../../store';
import { click, fakeDeps, identityStore, unmount } from '../../test/helpers';
import { ProgressActions } from './ProgressActions';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

it.each(['setItem', 'removeItem'] as const)('keeps the panel and reports reset failure when %s throws', async (method) => {
  const deps = fakeDeps(), store = identityStore(deps);
  store.complete('client'); store.go({ name: 'map' });
  store.storage!.setItem(PLAYGROUND_KEY, JSON.stringify({ found: ['egg'], discovered: [] }));
  store.visit({ name: 'idcard' }); store.visit({ name: 'parent' });
  const before = store.progress.value;
  const failure = vi.spyOn(deps.storage, method).mockImplementation(() => { throw Error('Storage unavailable'); });
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}><ProgressActions /></StoreContext.Provider>, root));
  await click(root, 'Reset all progress'); await click(root, 'Yes, reset everything');
  expect(store.screen.value.name).toBe('parent');
  expect(root.querySelector('[role="alert"]')?.textContent)
    .toBe('Reset did not save. Try again, or clear site data in the browser.');
  expect(store.progress.value).toBe(before);
  expect(loadProgress(store.storage)).toEqual(before);
  expect(store.saved.value).toBe(false);
  failure.mockRestore();
  await click(root, 'Yes, reset everything');
  expect(store.screen.value.name).toBe('start');
  expect(loadProgress(store.storage)).toMatchObject({ firstWord: null, completed: {} });
  expect(store.storage!.getItem(PLAYGROUND_KEY)).toBeNull();
  store.visit({ name: 'parent' }); store.back();
  expect(store.screen.value.name).toBe('start');
});
