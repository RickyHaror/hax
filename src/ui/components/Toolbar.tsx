import { useStore } from '../store';
import { BigButton } from './BigButton';
export function Toggles() {
  const store = useStore();
  const { autoRead, muted } = store.progress.value.settings;
  return <>
    <BigButton aria-pressed={autoRead} onClick={() => store.settings({ autoRead: !autoRead })}>Read everything to me</BigButton>
    <BigButton aria-pressed={!muted} onClick={() => store.settings({ muted: !muted })}>{muted ? 'Sound off' : 'Sound on'}</BigButton>
  </>;
}
export function Toolbar() {
  return <nav class="toolbar" aria-label="Game tools"><Toggles /></nav>;
}
