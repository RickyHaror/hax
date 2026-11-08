// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import type { DragDropConfig } from '../../../engine/types';
import { button, click, unmount } from '../../test/helpers';
import { activate, advance, motion, mountWidget, pointer } from './test-helpers';
const config: DragDropConfig = { kind: 'drag-drop', items: [
  { id: 'star', label: 'Star', art: 'missing', goesTo: 'card' },
  { id: 'moon', label: 'Moon', art: 'missing', goesTo: 'card' },
], zones: [{ id: 'card', label: 'Agent card' }, { id: 'box', label: 'Box' }] };
afterEach(async () => {
  for (const root of [...document.body.children]) await unmount(root as HTMLElement);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
describe('drag and drop', () => {
  it('supports picking up and putting down with clicks or keys', async () => {
    const { root, complete, deps } = await mountWidget(config);
    await click(root, 'Star'); expect(button(root, 'Star').getAttribute('aria-pressed')).toBe('true');
    await click(root, 'Put in Box'); expect(root.textContent).toContain('Good try. Let us find its home.');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain'); expect(complete).not.toHaveBeenCalled();
    await activate(root, 'Star'); await activate(root, 'Put in Agent card', ' ');
    expect(button(root, 'Star').disabled).toBe(true);
    await click(root, 'Moon'); await click(root, 'Put in Agent card'); await click(root, 'Put in Agent card');
    expect(complete).toHaveBeenCalledTimes(1); expect(deps.sound.play).toHaveBeenCalledWith('success');
  });
  it('captures pointer drags, returns misses, and places correct drops', async () => {
    const { root, complete } = await mountWidget(config);
    const capture = vi.fn(), release = vi.fn();
    const zone = root.querySelector<HTMLElement>('[data-bc-zone="card"]')!;
    const wrongZone = button(root, 'Put in Box');
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => zone) });
    for (const label of ['Star', 'Moon']) {
      const item = button(root, label);
      Object.assign(item, { setPointerCapture: capture, hasPointerCapture: () => true, releasePointerCapture: release });
      if (label === 'Star') {
        vi.mocked(document.elementFromPoint).mockReturnValueOnce(null);
        await pointer(item, 'pointerdown', 0, 0); await pointer(item, 'pointermove', 50, 40);
        await pointer(item, 'pointerup', 50, 40);
        expect(root.textContent).toContain('Good try. Let us find its home.');
        expect(item.style.transform).toBe(''); expect(complete).not.toHaveBeenCalled();
        await act(() => { item.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
        expect(item.getAttribute('aria-pressed')).toBe('false');
        vi.mocked(document.elementFromPoint).mockReturnValueOnce(wrongZone);
        await pointer(item, 'pointerdown', 0, 0); await pointer(item, 'pointermove', 70, 70);
        await pointer(item, 'pointerup', 70, 70);
        expect(item.disabled).toBe(false); expect(complete).not.toHaveBeenCalled();
      }
      await pointer(item, 'pointerdown', 0, 0); await pointer(item, 'pointermove', 100, 100);
      expect(item.style.transform).toContain('100px'); await pointer(item, 'pointerup', 100, 100);
    }
    expect(capture).toHaveBeenCalledWith(1); expect(release).toHaveBeenCalledTimes(4);
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('returns cancelled drags and ignores another pointer', async () => {
    const { root, complete } = await mountWidget(config); const item = button(root, 'Star');
    Object.assign(item, { setPointerCapture: vi.fn(), hasPointerCapture: () => false });
    await pointer(item, 'pointerdown', 0, 0); await pointer(item, 'pointermove', 20, 30, 2);
    expect(item.style.transform).toBe('');
    await pointer(item, 'pointermove', 20, 30); await pointer(item, 'pointercancel', 20, 30);
    expect(root.textContent).toContain('Good try.'); expect(item.style.transform).toBe('');
    expect(complete).not.toHaveBeenCalled();
    await activate(root, 'Star'); expect(item.getAttribute('aria-pressed')).toBe('true');
    await activate(root, 'Put in Agent card'); expect(button(root, 'Star').disabled).toBe(true);
  });
  it('reveals each placement in order and clears timers on unmount', async () => {
    vi.useFakeTimers(); motion(false);
    const { root, complete, update, store } = await mountWidget(config, true);
    await advance(250); expect(button(root, 'Star').disabled).toBe(true); expect(complete).not.toHaveBeenCalled();
    await act(() => { store.revealCount.value += 1; });
    await advance(250); expect(complete).toHaveBeenCalledTimes(1);
    await update(false); await update(true); await advance(1000); expect(complete).toHaveBeenCalledTimes(1);
    await unmount(root); expect(vi.getTimerCount()).toBe(0);
    const pending = await mountWidget(config, true); await unmount(pending.root);
    await advance(1000); expect(pending.complete).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it('places all items instantly under reduced motion', async () => {
    vi.useFakeTimers(); const media = motion(true);
    const { root, complete } = await mountWidget(config, true);
    expect(complete).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    await unmount(root); expect(media.remove).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
