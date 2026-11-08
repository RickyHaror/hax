import { useEffect, useRef, useState } from 'preact/hooks';
import { BigButton } from './components/BigButton';
import { StoreContext, type AppStore, useStore } from './store';
import { Toolbar } from './components/Toolbar';
import { SpeechLine } from './components/SpeechLine';
import { Start } from './screens/Start';
import { Onboarding } from './screens/Onboarding';
import { Map } from './screens/Map';
import { Player } from './screens/Player';
import { Done, Stop, SaveCode, Settings } from './screens/SaveScreens';
function ScreenView() {
  const store = useStore();
  const screen = store.screen.value;
  switch (screen.name) {
    case 'start': return <Start />;
    case 'onboarding': return <Onboarding />;
    case 'map': return <Map />;
    case 'stop': return <Stop />;
    case 'savecode': return <SaveCode />;
    case 'settings': return <Settings />;
    case 'player': case 'done': {
      const mission = store.registry.missions.find((m) => m.id === screen.missionId);
      return mission ? screen.name === 'player' ? <Player mission={mission} /> : <Done mission={mission} /> : <Map />;
    }
  }
}
function Shell() {
  const store = useStore();
  const panel = useRef<HTMLElement>(null);
  const screen = store.screen.value;
  const position = store.position.value;
  useEffect(() => {
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    panel.current?.scrollTo?.(0, 0);
  }, [screen, position]);
  return <div class="app-shell">{screen.name !== 'settings' && <Toolbar />}<main class="panel" tabIndex={-1} ref={panel}>
    <div role="status" aria-live="polite">{store.updatePending.value &&
      <SpeechLine line={{ text: 'New missions arrived!' }} />}</div>
    <ScreenView key={screen.name} />
  </main></div>;
}
export function App({ store }: { store: AppStore }) {
  const [begun, setBegun] = useState(false);
  const begin = () => {
    store.sound.play('click');
    store.voice.cancel();
    if (store.screen.value.name === 'start') {
      const mission = store.registry.missions.find((m) => m.chapter === 'login'
        && !Object.hasOwn(store.progress.value.completed, m.id));
      const index = mission?.steps.findIndex((step) => step.config.kind === 'answer') ?? -1;
      if (index >= 0) store.position.value = { phase: 'step', index };
    }
    setBegun(true);
  };
  return <StoreContext.Provider value={store}>{begun ? <Shell />
    : <div class="app-shell"><main class="panel begin-panel">
      <h1 class="glow">AGENT HQ</h1>
      <BigButton class="begin-button" onClick={begin}>Tap to begin, Agent!</BigButton>
    </main></div>}</StoreContext.Provider>;
}
