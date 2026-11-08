// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, unmount } from '../../test/helpers';
import { activate, advance, key, motion, mountWidget } from './test-helpers';
afterEach(async () => {
  for (const root of [...document.body.children]) await unmount(root as HTMLElement);
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
describe('packet catcher', () => {
  it('types each word in order, cycles words, and counts to goal once', async () => {
    const { root, complete, deps } = await mountWidget({ kind: 'typing-game', words: ['cat', 'sun'], goal: 3 });
    await key('t'); expect(root.textContent).toContain('Good try. Find the next bright letter.');
    expect(root.textContent).toContain('Caught 0 of 3'); expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    await key('C'); expect(button(root, 'Catch cat').querySelector('.bc-typed')!.textContent).toBe('c');
    await key('a'); await key('t'); expect(root.textContent).toContain('Caught 1 of 3');
    expect(button(root, 'Catch sun')).toBeTruthy();
    for (const letter of 'suncat') await key(letter);
    expect(root.textContent).toContain('Caught 3 of 3'); expect(complete).toHaveBeenCalledTimes(1);
    await key('c'); expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([sound]) => sound === 'key')).toHaveLength(9);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([sound]) => sound === 'success')).toHaveLength(3);
  });
  it('loops packets at the bottom without losing typed progress', async () => {
    vi.useFakeTimers(); motion(false);
    const { root, complete } = await mountWidget({ kind: 'typing-game', words: ['cat'], goal: 1 });
    await key('c'); await advance(26000);
    expect(root.textContent).toContain('Here it comes again. Take your time.');
    expect(button(root, 'Catch cat').querySelector('.bc-typed')!.textContent).toBe('c');
    expect(complete).not.toHaveBeenCalled(); expect(root.textContent).toContain('Caught 0 of 1');
    await advance(100000); expect(complete).not.toHaveBeenCalled();
    await key('a'); await key('t'); expect(complete).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('show me stops falling, shows the next letter, and enables catches', async () => {
    vi.useFakeTimers(); motion(false);
    const { root, complete, update } = await mountWidget({ kind: 'typing-game', words: ['cat', 'sun'], goal: 2 });
    await click(root, 'Catch cat'); expect(complete).not.toHaveBeenCalled();
    await advance(1000); await update(true); const position = button(root, 'Catch cat').style.transform;
    expect(root.textContent).toContain('Type C'); await advance(10000);
    expect(button(root, 'Catch cat').style.transform).toBe(position); expect(vi.getTimerCount()).toBe(0);
    await key('c'); expect(root.textContent).toContain('Type A');
    await activate(root, 'Catch cat'); await activate(root, 'Catch sun', ' ');
    expect(complete).toHaveBeenCalledTimes(1); expect(root.textContent).toContain('Caught 2 of 2');
  });
  it('respects reduced motion and removes timers and listeners', async () => {
    vi.useFakeTimers(); motion(true);
    const stationary = await mountWidget({ kind: 'typing-game', words: ['a'], goal: 1 });
    expect(vi.getTimerCount()).toBe(0); await key('a'); expect(stationary.complete).toHaveBeenCalledTimes(1);
    await unmount(stationary.root); motion(false);
    const { root, complete, deps } = await mountWidget({ kind: 'typing-game', words: ['a'], goal: 1 });
    expect(vi.getTimerCount()).toBe(1); await unmount(root); expect(vi.getTimerCount()).toBe(0);
    await advance(30000); await key('a'); expect(complete).not.toHaveBeenCalled(); expect(deps.sound.play).not.toHaveBeenCalled();
  });
});
