import { useEffect, useRef } from 'preact/hooks';
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
  useEffect(() => { panel.current?.focus(); panel.current?.scrollTo?.(0, 0); }, [screen, position]);
  return <div class="app-shell">{screen.name !== 'settings' && <Toolbar />}<main class="panel" tabIndex={-1} ref={panel}>
    <div role="status" aria-live="polite">{store.updatePending.value &&
      <SpeechLine line={{ text: 'New missions arrived!' }} />}</div>
    <ScreenView key={screen.name} />
  </main></div>;
}
export function App({ store }: { store: AppStore }) {
  return <StoreContext.Provider value={store}><Shell /></StoreContext.Provider>;
}
