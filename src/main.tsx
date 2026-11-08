import { render } from 'preact';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import './styles/base.css';
import { createVoice } from './engine/voice';
import { createSound } from './engine/sound';
import { createMusic } from './engine/music';
import { startMusicFollow } from './ui/music-follow';
import { loadAudioManifest } from './engine/audio-manifest';
import type { StorageLike } from './engine/progress';
import { buildRegistry } from './ui/registry';
import { createStore } from './ui/store';
import { App } from './ui/App';
import { registerSW } from 'virtual:pwa-register';
import { startUpdates } from './ui/pwa/register';

function storage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}
const voice = createVoice();
const sound = createSound();
const music = createMusic();
void loadAudioManifest().then((m) => { voice.setManifest(m); sound.setManifest(m); });
const store = createStore({ registry: buildRegistry(), storage: storage(), voice, sound, music });
const musicFollow = startMusicFollow(store, music, voice);
document.addEventListener('contextmenu', (event) => event.preventDefault());
const root = document.getElementById('app');
if (root) render(<App store={store} onBegin={musicFollow.begin} />, root);
startUpdates({ store, registerSW });
