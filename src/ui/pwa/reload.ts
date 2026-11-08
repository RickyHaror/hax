import { effect } from '@preact/signals';
import type { AppStore } from '../store';

export function reloadWhenSafe(store: AppStore, reload: () => void) {
  let reloaded = false;
  const dispose = effect(() => {
    const safe = store.safeMoment.value;
    const ready = store.updateReady.value;
    store.updatePending.value = ready && safe && !reloaded;
    if (!store.updatePending.peek()) return;
    const timer = setTimeout(() => {
      if (reloaded || !store.safeMoment.peek()) return;
      store.save(store.progress.peek());
      if (!store.saved.peek()) return;
      reloaded = true;
      reload();
    }, 1500);
    return () => clearTimeout(timer);
  });
  return () => { dispose(); store.updatePending.value = false; };
}
