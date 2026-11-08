import { render } from 'preact';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/base.css';
import { createVoice } from './engine/voice';
import { createSound } from './engine/sound';
import { loadAudioManifest } from './engine/audio-manifest';
import type { StorageLike } from './engine/progress';
import { buildRegistry } from './ui/registry';
import { createStore } from './ui/store';
import { App } from './ui/App';

function storage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}
const voice = createVoice();
const sound = createSound();
void loadAudioManifest().then((m) => { voice.setManifest(m); sound.setManifest(m); });
const store = createStore({ registry: buildRegistry(), storage: storage(), voice, sound });
document.addEventListener('contextmenu', (event) => event.preventDefault());
const root = document.getElementById('app');
if (root) render(<App store={store} />, root);
