// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, unmount } from '../../test/helpers';
import { activate, advance, key, mountWidget } from './test-helpers';
afterEach(async () => {
  for (const root of [...document.body.children]) await unmount(root as HTMLElement);
  vi.restoreAllMocks(); vi.useRealTimers();
});
describe('key quest', () => {
  it('finds letters and special keys in order, kindly ignores wrong keys', async () => {
    const { root, complete, deps } = await mountWidget({ kind: 'key-find', keys: ['c', 'a', ' ', 'Enter', 'Backspace', 'Shift'] });
    expect(button(root, 'C').tabIndex).toBe(-1); await click(root, 'C');
    expect(root.textContent).toContain('Find the letter C.');
    await key('x'); expect(root.textContent).toContain('Good try. Look for the glowing key.');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain'); expect(complete).not.toHaveBeenCalled();
    await key('C'); expect(root.textContent).toContain('Find the letter A.');
    await key('a'); expect(root.textContent).toContain('Find the Space bar.');
    expect((await key(' ')).defaultPrevented).toBe(true);
    await key('Enter'); expect((await key('Backspace')).defaultPrevented).toBe(true);
    await key('Shift', window, { location: 2 }); await key('Shift');
    expect(complete).toHaveBeenCalledTimes(1); expect(deps.sound.play).toHaveBeenCalledWith('key');
    expect(root.textContent).toContain('You found every key!');
  });
  it('leaves Tab alone, ignores held keys, and always blocks scrolling keys', async () => {
    const { root, complete, deps } = await mountWidget({ kind: 'key-find', keys: ['c'] });
    expect((await key('Tab')).defaultPrevented).toBe(false);
    await key('c', window, { repeat: true }); expect(complete).not.toHaveBeenCalled();
    expect(deps.sound.play).not.toHaveBeenCalled();
    expect((await key('Backspace')).defaultPrevented).toBe(true);
    expect((await key(' ')).defaultPrevented).toBe(true);
    await key('c'); expect(complete).toHaveBeenCalledTimes(1); await unmount(root);
    expect((await key(' ')).defaultPrevented).toBe(false);
    expect((await key('Backspace')).defaultPrevented).toBe(false);
  });
  it('show me allows clicks and keyboard activation of on screen keys', async () => {
    const { root, complete, update } = await mountWidget({ kind: 'key-find', keys: ['c', ' ', 'Shift'] });
    await update(true); expect(button(root, 'C').tabIndex).toBe(0);
    await activate(root, 'C'); await activate(root, 'Space', ' ');
    const shifts = [...root.querySelectorAll<HTMLButtonElement>('[aria-label="Shift"]')];
    await click(root, 'Shift'); await click(root, 'Shift');
    expect(shifts).toHaveLength(2); expect(complete).toHaveBeenCalledTimes(1);
  });
  it('keeps Read aloud reachable with Space while blocking page scroll', async () => {
    const { root, complete, deps } = await mountWidget({ kind: 'key-find', keys: ['c'] }, true);
    await activate(root.querySelector<HTMLElement>('.bc-body')!, 'Read aloud', ' ');
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'Find the letter C.' }, expect.objectContaining({ onEnd: expect.any(Function) }));
    expect(complete).not.toHaveBeenCalled(); expect(deps.sound.play).not.toHaveBeenCalled();
  });
  it('reads the agent training heading without advancing the key practice', async () => {
    const { root, complete, deps } = await mountWidget({ kind: 'key-find', keys: ['c'] });
    await activate(root.querySelector<HTMLElement>('.bc-titlebar')!, 'Read aloud', ' ');
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'Agent training' }, expect.objectContaining({ onEnd: expect.any(Function) }));
    expect(complete).not.toHaveBeenCalled();
  });
  it('clears key flashes and listeners when removed', async () => {
    vi.useFakeTimers();
    const removed = vi.spyOn(window, 'removeEventListener');
    const { root, complete, deps } = await mountWidget({ kind: 'key-find', keys: ['c'] });
    await key('x'); await advance(450);
    expect(button(root, 'X').classList.contains('bc-key-flash')).toBe(false);
    await key('x'); await unmount(root); expect(vi.getTimerCount()).toBe(0);
    const calls = vi.mocked(deps.sound.play).mock.calls.length;
    await key('c'); expect(complete).not.toHaveBeenCalled(); expect(deps.sound.play).toHaveBeenCalledTimes(calls);
    expect(removed).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
