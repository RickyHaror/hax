import { speechCatalog } from './speech-catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BigButton } from './components/BigButton';
import { StoreContext, type AppStore, useStore } from './store';
import { Toolbar } from './components/Toolbar';
import { SpeechLine } from './components/SpeechLine';
import { Start } from './screens/Start';
import { Onboarding } from './screens/Onboarding';
import { Map } from './screens/Map';
import { IdCard } from './screens/IdCard';
import { Playground } from './screens/Playground';
import { Player } from './screens/Player';
import { Done, Stop, SaveCode, Settings } from './screens/SaveScreens';
import { Parent } from './screens/Parent';
import './screens/startup.css';
function ScreenView() {
  const store = useStore();
  const screen = store.screen.value;
  switch (screen.name) {
    case 'parent': return <Parent />;
    case 'start': return <Start />;
    case 'onboarding': return <Onboarding />;
    case 'map': return <Map />;
    case 'idcard': return <IdCard />;
    case 'playground': return <Playground />;
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
  const startup = ['start', 'onboarding', 'savecode'].includes(screen.name);
  useEffect(() => {
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    panel.current?.scrollTo?.(0, 0);
  }, [screen, position]);
  return <div class={`app-shell${screen.name === 'player' ? ' player-shell' : ''}${startup ? ' startup-shell' : ''}`}>
    {screen.name !== 'settings' && screen.name !== 'player' && !startup && <Toolbar />}<main class="panel" tabIndex={-1} ref={panel}>
    <div role="status" aria-live="polite">{store.updatePending.value &&
      <SpeechLine line={speechCatalog.app.newMissions} />}</div>
    <ScreenView key={screen.name} />
    {startup && <div class="startup-tools"><Toolbar compact /></div>}
  </main></div>;
}
export function App({ store, onBegin }: { store: AppStore; onBegin?: () => void }) {
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
    onBegin?.();
    setBegun(true);
  };
  return <StoreContext.Provider value={store}>{begun ? <Shell />
    : <div class="app-shell startup-shell"><main class="panel begin-panel startup-begin">
      <span class="startup-tty">hax-os · crew terminal</span>
      <h1 class="glow">&gt;_HAX</h1>
      <BigButton class="begin-button" onClick={begin}>Tap to begin, Agent!</BigButton>
    </main></div>}</StoreContext.Provider>;
}
