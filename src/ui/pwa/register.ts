import type { registerSW } from 'virtual:pwa-register';
import type { AppStore } from '../store';
import { reloadWhenSafe } from './reload';

interface UpdateDeps {
  store: AppStore;
  registerSW: typeof registerSW;
  serviceWorker?: Pick<ServiceWorkerContainer, 'controller' | 'addEventListener' | 'removeEventListener'> | null;
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  reload?: () => void;
}

export function startUpdates(deps: UpdateDeps) {
  const { store } = deps;
  const events = deps.events ?? window;
  const serviceWorker = deps.serviceWorker === undefined ? navigator.serviceWorker : deps.serviceWorker;
  const stopReload = reloadWhenSafe(store, deps.reload ?? (() => window.location.reload()));
  const ready = () => { store.updateReady.value = true; };
  // This local event only requests the same saved, safe reload as a real update.
  events.addEventListener('hax:update-ready', ready);
  let controlled = !!serviceWorker?.controller;
  const changed = () => {
    if (!serviceWorker?.controller) return;
    if (controlled) ready();
    controlled = true;
  };
  serviceWorker?.addEventListener('controllerchange', changed);
  let registration: ServiceWorkerRegistration | undefined;
  const check = () => {
    try { void registration?.update().catch(() => {}); } catch { /* Offline checks can fail. */ }
  };
  if (serviceWorker) {
    try {
      deps.registerSW({ immediate: true, onNeedReload: ready, onNeedRefresh: ready,
        onRegisteredSW(_url, value) { registration = value; check(); },
      });
    } catch { /* Registration may be unavailable in this browser. */ }
  }
  const interval = serviceWorker ? setInterval(check, 30 * 60 * 1000) : undefined;
  return () => {
    clearInterval(interval);
    serviceWorker?.removeEventListener('controllerchange', changed);
    events.removeEventListener('hax:update-ready', ready);
    stopReload();
  };
}
