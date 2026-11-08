import { useStore } from '../../store';
import { Toggles } from '../../components/Toolbar';
import { BigButton } from '../../components/BigButton';

export function PanelSettings() {
  const store = useStore();
  const settings = store.progress.value.settings;
  return <>
    <section aria-label="Session length"><h2>Session length</h2>
      <div class="parent-options">{[0, 15, 30, 45, 60].map((minutes) =>
        <BigButton key={minutes} aria-pressed={settings.sessionMinutes === minutes}
          onClick={() => store.settings({ sessionMinutes: minutes })}>{minutes ? `${minutes} minutes` : 'Off'}</BigButton>)}</div>
    </section>
    <section aria-label="Audio defaults"><h2>Audio defaults</h2><Toggles />
      <BigButton role="switch" aria-checked={settings.musicLocked}
        onClick={() => store.settings({ musicLocked: !settings.musicLocked })}>Keep music off</BigButton>
    </section>
  </>;
}
