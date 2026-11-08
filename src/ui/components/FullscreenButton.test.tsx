import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { click, unmount } from '../test/helpers';
import { FullscreenButton } from './FullscreenButton';

let root: HTMLElement;
const properties = [
  [document.documentElement, 'requestFullscreen'], [document, 'exitFullscreen'], [document, 'fullscreenElement'],
] as const;
const originals = properties.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));
beforeEach(() => {
  for (const [target, key] of properties) Object.defineProperty(target, key, { configurable: true, get: () => undefined });
});
afterEach(async () => {
  if (root) await unmount(root); vi.restoreAllMocks();
  properties.forEach(([target, key], index) => {
    const descriptor = originals[index];
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  });
});
async function show() {
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<FullscreenButton />, root));
}
function api() {
  const request = vi.fn().mockResolvedValue(undefined);
  const exit = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: request });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
  return { request, exit };
}

it('hides the button when the API is missing', async () => {
  await show(); expect(root.querySelector('button')).toBeNull();
});

it('requests full screen, tracks browser changes and exits', async () => {
  const { request, exit } = api();
  const active = vi.spyOn(document, 'fullscreenElement', 'get').mockReturnValue(null);
  await show(); await click(root, 'Full screen');
  expect(request).toHaveBeenCalledOnce();
  expect(root.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
  await act(() => { active.mockReturnValue(document.documentElement); document.dispatchEvent(new Event('fullscreenchange')); });
  expect(root.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
  await click(root, 'Full screen'); expect(exit).toHaveBeenCalledOnce();
  await act(() => { active.mockReturnValue(null); document.dispatchEvent(new Event('fullscreenchange')); });
  expect(root.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
});

it('ignores rejected requests and removes its browser listener', async () => {
  const { request } = api(); request.mockRejectedValue(new Error('Refused'));
  const remove = vi.spyOn(document, 'removeEventListener');
  await show(); await click(root, 'Full screen');
  expect(root.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');
  await unmount(root);
  expect(remove).toHaveBeenCalledWith('fullscreenchange', expect.any(Function));
});
