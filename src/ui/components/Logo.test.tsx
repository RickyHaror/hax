import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { Logo } from './Logo';
import { StoreContext } from '../store';
import { button, identityStore, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); vi.useRealTimers(); });
async function setup() {
  vi.useFakeTimers();
  const store = identityStore();
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}><Logo /></StoreContext.Provider>, root));
  return { store, logo: button(root, 'HAX') };
}
async function pointer(logo: HTMLElement, type: string, button = 0) {
  await act(() => { logo.dispatchEvent(new MouseEvent(type, { bubbles: true, button })); });
}
async function advance(time: number) { await act(() => { vi.advanceTimersByTime(time); }); }

it('opens after a three second pointer hold, once per hold', async () => {
  const { store, logo } = await setup();
  await pointer(logo, 'pointerdown'); await advance(2999);
  expect(store.screen.value.name).toBe('map');
  await advance(1); expect(store.screen.value.name).toBe('parent');
  await advance(3000); await pointer(logo, 'pointerup');
  store.back(); expect(store.screen.value.name).toBe('map');
});
it.each(['pointerup', 'pointerleave', 'pointercancel', 'lostpointercapture'])(
  'cancels a short or interrupted hold on %s', async (event) => {
    const { store, logo } = await setup();
    await pointer(logo, 'pointerdown'); await advance(500);
    await pointer(logo, event); await advance(4000);
    expect(store.screen.value.name).toBe('map');
    logo.click(); expect(store.screen.value.name).toBe('map');
  },
);
it('cancels a keyboard hold when focus leaves the logo', async () => {
  const { store, logo } = await setup();
  logo.focus();
  await act(() => { logo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  await advance(500); await act(() => { logo.blur(); }); await advance(3000);
  expect(store.screen.value.name).toBe('map');
});
it.each(['Enter', ' '])('opens on a held %s key, ignoring repeat events', async (key) => {
  const { store, logo } = await setup();
  await act(() => { logo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
  await advance(2000);
  await act(() => { logo.dispatchEvent(new KeyboardEvent('keydown', { key, repeat: true, bubbles: true })); });
  await advance(1000); expect(store.screen.value.name).toBe('parent');
});
it.each(['Enter', ' '])('does not open on a short %s key press', async (key) => {
  const { store, logo } = await setup();
  await act(() => { logo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
  await advance(100);
  await act(() => { logo.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true })); });
  await advance(3000); expect(store.screen.value.name).toBe('map');
});
it('cancels on unmount and ignores secondary pointer buttons', async () => {
  const { store, logo } = await setup();
  await pointer(logo, 'pointerdown', 2); await advance(3000);
  expect(store.screen.value.name).toBe('map');
  await pointer(logo, 'pointerdown'); await act(() => render(null, root)); await advance(3000);
  expect(store.screen.value.name).toBe('map');
});
