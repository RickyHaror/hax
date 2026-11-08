// @vitest-environment jsdom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { ReadingBox } from './ReadingBox';

let root: HTMLDivElement;
afterEach(async () => {
  await act(() => render(null, root));
  root.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup() {
  const observers: { update: () => void; observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(update: () => void) { observers.push({ update, observe: this.observe, disconnect: this.disconnect }); }
    observe = vi.fn();
    disconnect = vi.fn();
  });
  root = document.createElement('div');
  document.body.append(root);
  await act(() => render(<ReadingBox label="Clues">First clue</ReadingBox>, root));
  const box = root.querySelector<HTMLDivElement>('.reading-box')!;
  const cue = root.querySelector<HTMLSpanElement>('.reading-cue')!;
  function size(height: number, width = 300, clientHeight = 200) {
    Object.defineProperties(box, {
      scrollHeight: { configurable: true, value: height }, clientHeight: { configurable: true, value: clientHeight },
      scrollWidth: { configurable: true, value: width }, clientWidth: { configurable: true, value: 300 },
    });
  }
  const resize = async () => { await act(() => observers.at(-1)!.update()); };
  const scroll = async (top: number, left = 0) => {
    await act(() => { box.scrollTop = top; box.scrollLeft = left; box.dispatchEvent(new Event('scroll')); });
  };
  return { box, cue, size, resize, scroll, observers };
}

it('shows a silent cue only when overflowing content remains below', async () => {
  const { box, cue, size, resize, scroll } = await setup();
  expect(cue.hidden).toBe(true);
  expect(cue.getAttribute('aria-hidden')).toBe('true');
  expect(box.getAttribute('aria-label')).toBe('Clues');
  size(600); await resize(); expect(cue.hidden).toBe(false);
  await scroll(200); expect(cue.hidden).toBe(false);
  await scroll(399); expect(cue.hidden).toBe(true);
  await scroll(100); expect(cue.hidden).toBe(false);
  size(200); await resize(); expect(cue.hidden).toBe(true);
  size(202); await scroll(0); expect(cue.hidden).toBe(true);
});

it('updates for content changes and horizontal scrolling', async () => {
  const { box, cue, size, scroll } = await setup();
  size(200, 700);
  await act(() => render(<ReadingBox label="Clues">A longer clue list</ReadingBox>, root));
  expect(cue.hidden).toBe(false);
  await scroll(0, 400); expect(cue.hidden).toBe(true);
  await scroll(0, 50); expect(cue.hidden).toBe(false);
  size(200);
  await act(() => { window.dispatchEvent(new Event('resize')); });
  expect(cue.hidden).toBe(true);
  box.focus(); expect(document.activeElement).toBe(box);
});

it('updates the cue when the reader shrinks to leave room for controls', async () => {
  const { cue, size, resize, scroll } = await setup();
  size(108, 300, 108); await resize(); expect(cue.hidden).toBe(true);
  size(108, 300, 80); await resize(); expect(cue.hidden).toBe(false);
  await scroll(28); expect(cue.hidden).toBe(true);
  await scroll(0); expect(cue.hidden).toBe(false);
  size(108, 300, 108); await resize(); expect(cue.hidden).toBe(true);
});

it('observes the box and content, then cleans up on unmount', async () => {
  const { observers } = await setup();
  expect(observers[0]!.observe).toHaveBeenCalledTimes(2);
  const remove = vi.spyOn(window, 'removeEventListener');
  await act(() => render(null, root));
  expect(observers[0]!.disconnect).toHaveBeenCalledOnce();
  expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
});
