import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegisterSWOptions } from 'virtual:pwa-register';
import { createStore } from '../store';
import { fakeDeps } from '../test/helpers';
import { startUpdates } from './register';

function setup(controller: ServiceWorker | null = null) {
  const store = createStore(fakeDeps());
  const serviceWorker = Object.assign(new EventTarget(), { controller });
  const events = new EventTarget();
  let options: RegisterSWOptions = {};
  const registerSW = vi.fn((value?: RegisterSWOptions) => {
    options = value!;
    return async () => {};
  });
  const stop = startUpdates({ store, registerSW, serviceWorker, events, reload: vi.fn() });
  return { store, serviceWorker, events, registerSW, stop, options };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('service worker updates', () => {
  it('registers immediately and checks on registration and every 30 minutes using one interval', () => {
    const updates = setup();
    expect(updates.registerSW).toHaveBeenCalledOnce();
    expect(updates.options.immediate).toBe(true);
    const update = vi.fn().mockResolvedValue(undefined);
    const registration = { update } as unknown as ServiceWorkerRegistration;
    updates.options.onRegisteredSW!('/sw.js', registration);
    expect(update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(update).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(update).toHaveBeenCalledTimes(2);
    updates.options.onRegisteredSW!('/sw.js', registration);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(4);
    updates.stop();
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(4);
  });

  it.each(['onNeedReload', 'onNeedRefresh'] as const)('intercepts the plugin %s hook', (hook) => {
    const updates = setup();
    updates.options[hook]!();
    expect(updates.store.updateReady.value).toBe(true);
    updates.stop();
  });

  it('ignores initial control but notices a later controller', () => {
    const updates = setup();
    updates.serviceWorker.dispatchEvent(new Event('controllerchange'));
    updates.serviceWorker.controller = {} as ServiceWorker;
    updates.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(updates.store.updateReady.value).toBe(false);
    updates.serviceWorker.controller = {} as ServiceWorker;
    updates.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(updates.store.updateReady.value).toBe(true);
    updates.stop();
  });

  it('notices replacement of a controller present on load', () => {
    const updates = setup({} as ServiceWorker);
    updates.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(updates.store.updateReady.value).toBe(true);
    updates.stop();
  });

  it('accepts the local update event and removes its listeners on disposal', () => {
    const updates = setup();
    updates.events.dispatchEvent(new Event('hax:update-ready'));
    expect(updates.store.updateReady.value).toBe(true);
    updates.stop(); updates.store.updateReady.value = false;
    updates.events.dispatchEvent(new Event('hax:update-ready'));
    updates.serviceWorker.controller = {} as ServiceWorker;
    updates.serviceWorker.dispatchEvent(new Event('controllerchange'));
    expect(updates.store.updateReady.value).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([null, undefined])('survives missing service workers (%s) without registering or polling', (serviceWorker) => {
    const store = createStore(fakeDeps());
    const registerSW = vi.fn();
    const stop = startUpdates({ store, registerSW, serviceWorker, events: new EventTarget() });
    expect(registerSW).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it('survives denied registration, missing registration and failed offline checks', async () => {
    const updates = setup();
    expect(() => updates.options.onRegisteredSW!('/sw.js', undefined)).not.toThrow();
    const update = vi.fn().mockRejectedValue(new Error('Offline'));
    updates.options.onRegisteredSW!('/sw.js', { update } as unknown as ServiceWorkerRegistration);
    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
    update.mockImplementation(() => { throw new Error('Unavailable'); });
    expect(() => vi.advanceTimersByTime(30 * 60 * 1000)).not.toThrow();
    updates.stop();
    expect(() => startUpdates({ store: updates.store, serviceWorker: updates.serviceWorker,
      registerSW() { throw new Error('Denied'); }, events: new EventTarget(),
    })()).not.toThrow();
  });
});
