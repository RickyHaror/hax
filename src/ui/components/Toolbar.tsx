import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '../store';
import { DecoderWheel } from '../widgets/tools';
import { BigButton } from './BigButton';
import { SpeechLine } from './SpeechLine';
export function Toggles() {
  const store = useStore();
  const { autoRead, muted } = store.progress.value.settings;
  return <>
    <BigButton aria-pressed={autoRead} onClick={() => store.settings({ autoRead: !autoRead })}>Read everything to me</BigButton>
    <BigButton aria-pressed={!muted} onClick={() => store.settings({ muted: !muted })}>{muted ? 'Sound off' : 'Sound on'}</BigButton>
  </>;
}
function isolatePanel(panel: HTMLElement) {
  const siblings: { element: HTMLElement; inert: boolean }[] = [];
  let current: HTMLElement | null = panel;
  while (current && current !== document.body) {
    for (const element of current.parentElement?.children ?? []) {
      if (element !== current && element instanceof HTMLElement) {
        siblings.push({ element, inert: element.inert }); element.inert = true;
      }
    }
    current = current.parentElement;
  }
  return () => { for (const { element, inert } of siblings) element.inert = inert; };
}
function useDecoderFocus(panel: { current: HTMLDivElement | null }, close: () => void, opener: { current: HTMLButtonElement | null }) {
  useLayoutEffect(() => {
    const previous = document.activeElement;
    const element = panel.current!;
    const restore = isolatePanel(element);
    const controls = () => [...element.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')];
    controls()[0]?.focus();
    function keyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      const targets = controls();
      const target = event.shiftKey ? targets.at(-1) : targets[0];
      if (!element.contains(document.activeElement)
        || document.activeElement === (event.shiftKey ? targets[0] : targets.at(-1))) {
        event.preventDefault(); target?.focus();
      }
    }
    document.addEventListener('keydown', keyDown);
    return () => {
      document.removeEventListener('keydown', keyDown); restore();
      if (opener.current) opener.current.focus();
      else if (previous instanceof HTMLElement) previous.focus();
    };
  }, [panel, close, opener]);
}
function DecoderPanel({ close, opener }: { close: () => void; opener: { current: HTMLButtonElement | null } }) {
  const panel = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState('');
  const [shift, setShift] = useState(0);
  useDecoderFocus(panel, close, opener);
  return <div class="decoder-overlay" ref={panel}>
    <div class="decoder-dialog" role="dialog" aria-modal="true" aria-label="Decoder wheel">
      <h2><SpeechLine line={{ text: 'Decoder wheel' }} /></h2>
      <BigButton onClick={close}>Close</BigButton>
      <label>Secret message<input type="text" value={message} autoComplete="off"
        onInput={(event) => setMessage(event.currentTarget.value)} /></label>
      <DecoderWheel message={message} shift={shift} onShift={setShift} />
    </div>
  </div>;
}
export function Toolbar() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const unlocked = store.registry.missions.some((mission) => Object.hasOwn(store.progress.value.completed, mission.id)
    && mission.steps.some((step) => step.config.kind === 'decoder'));
  return <nav class="toolbar" aria-label="Game tools"><Toggles />
    {unlocked && <BigButton onClick={(event) => { opener.current = event.currentTarget; setOpen(true); store.sound.play('click'); }}>Open decoder wheel</BigButton>}
    {unlocked && open && <DecoderPanel close={close} opener={opener} />}
  </nav>;
}
