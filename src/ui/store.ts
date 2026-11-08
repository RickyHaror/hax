import { computed, signal, type Signal } from '@preact/signals';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import {
  loadProgress, saveProgress, setIdentity, hasIdentity, setCurrent, completeMission,
  recordHint, updateSettings, isUnlocked, applySaveCode, reconcileExtraBits,
  type StorageLike, type Progress, type Settings,
} from '../engine/progress';
import type { Voice } from '../engine/voice';
import type { SoundPlayer } from '../engine/sound';
import type { Registry } from './registry';
import type { Mission } from '../engine/types';
import { isSafeMoment } from './pwa/safe';

export interface StoreDeps {
  registry: Registry; storage: StorageLike | null; voice: Voice; sound: SoundPlayer; now?: () => Date;
}
export type Screen =
  | { name: 'start' } | { name: 'onboarding' } | { name: 'map' }
  | { name: 'player'; missionId: string } | { name: 'done'; missionId: string }
  | { name: 'stop' } | { name: 'savecode' } | { name: 'settings' };
export interface Position { phase: 'intro' | 'permission' | 'step' | 'success' | 'outro'; index: number }
function resumePosition(mission: Mission, value: string | null): Position {
  try {
    const [phase, index] = JSON.parse(value ?? 'null') as [Position['phase'], number];
    if (['intro', 'permission', 'outro', 'step', 'success'].includes(phase)
      && Number.isInteger(index) && index >= 0
      && (phase !== 'step' && phase !== 'success' || index < mission.steps.length)) return { phase, index };
  } catch { /* Older saves use a plain step id. */ }
  const index = mission.steps.findIndex((step) => step.id === value);
  return index >= 0 ? { phase: 'step', index } : { phase: 'intro', index: 0 };
}
function coreStore(deps: StoreDeps) {
  const loaded = loadProgress(deps.storage);
  const progress = signal(reconcileExtraBits(loaded, deps.registry.missions, (deps.now ?? (() => new Date()))()));
  const saved = signal(false);
  const revealCount = signal(0);
  const screen = signal<Screen>({ name: hasIdentity(progress.value) ? 'map' : 'start' });
  const position = signal<Position>({ phase: 'intro', index: 0 });
  const notice = signal('');
  let returnScreen: Screen = screen.value;
  function save(next: Progress) {
    progress.value = next;
    saved.value = saveProgress(deps.storage, next);
    deps.sound.setMuted(next.settings.muted);
    syncVoice();
  }
  if (progress.value.extraBits !== loaded.extraBits) save(progress.value);
  function syncVoice() {
    deps.voice.setContext({
      sidekick: deps.registry.sidekicks[progress.value.sidekick ?? 0]!.id,
      missionId: screen.value.name === 'player' ? screen.value.missionId : null,
    });
  }
  function go(next: Screen) { deps.voice.cancel(); screen.value = next; syncVoice(); }
  function phase(missionId: string, next: Position) {
    position.value = next;
    save(setCurrent(progress.value, { missionId, stepId: JSON.stringify([next.phase, next.index]) }));
  }
  function openMission(missionId: string) {
    const mission = deps.registry.missions.find((m) => m.id === missionId);
    if (!mission || !isUnlocked(progress.value, mission)) return;
    const current = progress.value.current;
    phase(missionId, current?.missionId === missionId
      ? resumePosition(mission, current.stepId) : { phase: 'intro', index: 0 });
    go({ name: 'player', missionId });
  }
  return {
    ...deps, progress, saved, revealCount, screen, position, notice, save, go, syncVoice, phase, openMission,
    visit(next: Screen) { returnScreen = screen.value; go(next); },
    back() { go(returnScreen); },
  };
}
function initialize(store: ReturnType<typeof coreStore>) {
  const current = store.progress.value.current;
  const mission = store.registry.missions.find((m) => m.id === current?.missionId);
  if (hasIdentity(store.progress.value) && mission && isUnlocked(store.progress.value, mission)
    && !Object.hasOwn(store.progress.value.completed, mission.id)) {
    store.position.value = resumePosition(mission, current!.stepId);
    store.screen.value = { name: 'player', missionId: mission.id };
  }
  store.sound.setMuted(store.progress.value.settings.muted);
  store.syncVoice();
}
export function createStore(deps: StoreDeps) {
  const store = coreStore(deps);
  const { progress, save, go, notice } = store;
  initialize(store);
  const now = () => (deps.now ?? (() => new Date()))();
  return {
    ...store,
    updateReady: signal(false),
    updatePending: signal(false),
    safeMoment: computed(() => isSafeMoment(store.screen.value, store.position.value)),
    identify(firstWord: number, secondWord: number, sidekick: number) {
      save(setIdentity(progress.value, { firstWord, secondWord, sidekick })); go({ name: 'map' });
    },
    settings(patch: Partial<Settings>) {
      save(updateSettings(progress.value, patch));
      if (patch.autoRead === false) deps.voice.cancel();
    },
    hint(missionId: string, stepId: string, rung: number) {
      save(recordHint(progress.value, missionId, stepId, rung)); deps.sound.play('hint');
      if (rung >= 3) store.revealCount.value += 1;
    },
    complete(missionId: string, login = false) {
      save(completeMission(progress.value, missionId, now()));
      deps.sound.play(login ? 'success' : 'fanfare');
      if (!login) go({ name: 'done', missionId });
    },
    restore(code: string) {
      const result = applySaveCode(progress.value, code, deps.registry.missions, now());
      if (result.ok) {
        save(setCurrent(result.progress, null)); notice.value = 'Your key worked. Welcome back!'; go({ name: 'map' });
      }
      return result;
    },
  };
}
export type AppStore = ReturnType<typeof createStore>;
export const StoreContext = createContext<AppStore | null>(null);
export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('The game needs its store.');
  return store;
}
export function hackerName(progress: Signal<Progress>, registry: Registry): string {
  return `${registry.firstWords[progress.value.firstWord ?? 0] ?? registry.firstWords[0]} ${registry.secondWords[progress.value.secondWord ?? 0] ?? registry.secondWords[0]}`;
}
