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
import type { Mission, Season } from '../../src/engine/types';
import { App } from '../../src/ui/App';
import { createStore } from '../../src/ui/store';
import { buildRegistry } from '../../src/ui/registry';
import { fixtureRegistry } from '../../src/ui/test/fixtures';
import { hackMission } from '../../src/ui/test/hack-mission';

const source = hackMission();
const mission: Mission = { ...source, id: 'season-shop', chapter: 'season', season: 's1', order: 1,
  title: 'Shop clue', client: undefined, xp: 20, teaches: ['cat', 'submit'],
  machines: source.machines!.map((machine) => ({ ...machine, login: undefined })),
  steps: [{ ...source.steps[1]!, config: { kind: 'hack', start: 'shop-pc', commands: ['cat', 'submit'],
    chips: ['cat clue.txt', 'submit clue.txt'].map((command) => ({ command })),
    showMe: 'submit clue.txt', goal: { type: 'flag' } } }],
};
const warmup: Mission = { ...mission, id: 'warmup', bit: 22, order: 3, title: 'First clue', teaches: ['ls'], xp: 20 };
const practice: Mission = { ...mission, id: 'practice', bit: 23, order: 2, title: 'Next clue', teaches: ['cat'], xp: 20 };
const later: Mission = { ...mission, id: 'harbor', bit: 24, season: 's2', title: 'Harbor clue' };
const seasons: Season[] = [
  { id: 's2', number: 2, title: 'Harbor', blurb: 'Help our harbor.', missions: [later.id], requires: 's1' },
  { id: 's1', number: 1, title: 'Town', blurb: 'Help our town.', missions: [warmup.id, practice.id, mission.id], requires: null },
];
const registry = buildRegistry({ ...fixtureRegistry([mission, practice, warmup, later]), seasons, playground: null });
const store = createStore({ registry, storage: localStorage, voice: createVoice(), sound: createSound() });
store.identify(0, 0, 0);
store.complete(warmup.id); store.complete(practice.id); store.go({ name: 'map' });
render(<App store={store} />, document.getElementById('app')!);
