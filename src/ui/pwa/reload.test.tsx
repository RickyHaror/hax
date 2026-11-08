import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { loadProgress } from '../../engine/progress';
import { createStore } from '../store';
import { client } from '../test/fixtures';
import { click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';
import { reloadWhenSafe } from './reload';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('safe reloads', () => {
  it('checks an already ready update immediately and reloads only once after 1.5 seconds', () => {
    const store = identityStore();
    store.updateReady.value = true;
    const reload = vi.fn();
    const stop = reloadWhenSafe(store, reload);
    expect(store.updatePending.value).toBe(true);
    vi.advanceTimersByTime(1499); expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(reload).toHaveBeenCalledOnce();
    store.go({ name: 'settings' }); store.go({ name: 'map' });
    store.updateReady.value = true;
    vi.advanceTimersByTime(3000); expect(reload).toHaveBeenCalledOnce();
    stop();
  });

  it.each(['success', 'map'] as const)('waits during a step until %s and preserves the resume point', (next) => {
    const deps = fakeDeps(); const store = identityStore(deps);
    store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
    const reload = vi.fn(() => {
      expect(loadProgress(deps.storage)).toEqual(store.progress.value);
      expect(createStore(deps).position.value).toEqual(store.position.value);
    });
    const stop = reloadWhenSafe(store, reload);
    store.updateReady.value = true;
    expect(store.updatePending.value).toBe(false);
    vi.advanceTimersByTime(3000); expect(reload).not.toHaveBeenCalled();
    if (next === 'success') store.phase(client.id, { phase: 'success', index: 1 });
    else store.go({ name: 'map' });
    expect(store.updatePending.value).toBe(true);
    vi.advanceTimersByTime(1500); expect(reload).toHaveBeenCalledOnce();
    stop();
  });

  it.each(['permission', 'step'] as const)('cancels the pending reload when entering %s', (phase) => {
    const store = identityStore(); store.openMission(client.id);
    const reload = vi.fn(); const stop = reloadWhenSafe(store, reload);
    store.updateReady.value = true; vi.advanceTimersByTime(1000);
    store.phase(client.id, { phase, index: 0 });
    expect(store.updatePending.value).toBe(false);
    vi.advanceTimersByTime(3000); expect(reload).not.toHaveBeenCalled();
    store.phase(client.id, { phase: 'success', index: 0 });
    vi.advanceTimersByTime(1499); expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(reload).toHaveBeenCalledOnce();
    stop();
  });

  it('does not lose unsaved progress if storage fails before reload', () => {
    const deps = fakeDeps(); const store = identityStore(deps);
    const reload = vi.fn(); const stop = reloadWhenSafe(store, reload);
    store.updateReady.value = true;
    deps.storage.setItem = () => { throw new Error('Storage unavailable'); };
    vi.advanceTimersByTime(1500);
    expect(store.saved.value).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    stop();
  });

  it('shows the polite update line with a working read aloud button only at safe moments', async () => {
    const deps = fakeDeps(); const store = identityStore(deps); store.openMission(client.id);
    store.phase(client.id, { phase: 'step', index: 1 });
    const root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const reload = vi.fn(); const stop = reloadWhenSafe(store, reload);
    try {
      await act(() => { store.updateReady.value = true; });
      expect(root.textContent).not.toContain('New missions arrived!');
      await act(() => { store.phase(client.id, { phase: 'success', index: 1 }); });
      const status = root.querySelector('[role="status"]')!;
      expect(status.getAttribute('aria-live')).toBe('polite');
      expect(status.textContent).toContain('New missions arrived!');
      await act(() => { status.querySelector<HTMLButtonElement>('[aria-label="Read aloud"]')!.click(); });
      expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'New missions arrived!' }, expect.objectContaining({ onEnd: expect.any(Function) }));
      await act(() => { vi.advanceTimersByTime(1500); });
      expect(reload).toHaveBeenCalledOnce();
    } finally { stop(); await unmount(root); }
  });
});
