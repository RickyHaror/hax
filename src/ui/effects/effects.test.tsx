import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundEffect } from './index';

let root: HTMLDivElement;
afterEach(async () => {
  if (root) { await act(() => render(null, root)); root.remove(); }
  vi.useRealTimers(); vi.unstubAllGlobals();
});
async function show(effect: string | undefined, reduced = false) {
  vi.useFakeTimers();
  const media = { matches: reduced,
    addEventListener: vi.fn<(type: string, listener: () => void) => void>(),
    removeEventListener: vi.fn<(type: string, listener: () => void) => void>() };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<PlaygroundEffect effect={effect} />, root));
  return media;
}
describe('playground effects', () => {
  it('plays matrix for three seconds and cleans up its timer', async () => {
    const media = await show('matrix');
    expect(root.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Green code rain');
    expect(root.querySelector('.playground-matrix-still')).toBeNull();
    await act(() => { vi.advanceTimersByTime(2999); });
    expect(root.querySelector('[role="img"]')).not.toBeNull();
    await act(() => { vi.advanceTimersByTime(1); });
    expect(root.querySelector('[role="img"]')).toBeNull();
    await act(() => render(null, root));
    expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('shows a still frame with reduced motion and responds to changes', async () => {
    const media = await show('matrix', true);
    expect(root.querySelector('.playground-matrix-still')).not.toBeNull();
    media.matches = false;
    await act(() => media.addEventListener.mock.calls[0]?.[1]());
    expect(root.querySelector('.playground-matrix-still')).toBeNull();
  });
  it.each([undefined, 'missing', 'toString', '__proto__'])('ignores unknown effect %s', async (key) => {
    await show(key);
    expect(root.childNodes).toHaveLength(0);
  });
});
