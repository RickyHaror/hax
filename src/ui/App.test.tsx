import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import type { MusicPlayer } from '../engine/music';
import { App } from './App';
import { startMusicFollow } from './music-follow';
import { button, identityStore, unmount } from './test/helpers';

let root: HTMLElement;
let stop: (() => void) | undefined;
afterEach(async () => { stop?.(); if (root) await unmount(root); });

it('starts HQ music synchronously only when Begin is activated', async () => {
  const store = identityStore();
  const music: MusicPlayer = { supported: true, play: vi.fn(), duck: vi.fn(),
    setVolume: vi.fn(), setEnabled: vi.fn() };
  const follow = startMusicFollow(store, music, store.voice); stop = follow.stop;
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<App store={store} onBegin={follow.begin} />, root));
  await act(() => {
    const background = root.querySelector('main')!;
    background.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    background.click();
    background.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  expect(music.play).not.toHaveBeenCalled();
  await act(() => {
    button(root, 'Tap to begin, Agent!').click();
    expect(music.play).toHaveBeenLastCalledWith('hq');
  });
  await act(() => store.openMission('client'));
  expect(music.play).toHaveBeenLastCalledWith('terminal');
});
