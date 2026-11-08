import { render } from 'preact';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '../../src/styles/base.css';
import { createVoice } from '../../src/engine/voice';
import { createSound } from '../../src/engine/sound';
import { App } from '../../src/ui/App';
import { createStore } from '../../src/ui/store';
import { fixtureRegistry } from '../../src/ui/test/fixtures';
import { hackMission } from '../../src/ui/test/hack-mission';

const mission = hackMission();
const store = createStore({ registry: fixtureRegistry([mission]), storage: null,
  voice: createVoice(), sound: createSound() });
store.identify(0, 0, 0);
store.openMission(mission.id);
render(<App store={store} />, document.getElementById('app')!);
