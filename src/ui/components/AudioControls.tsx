import type { ComponentChildren, RefObject } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
import type { AudioLevel } from '../../engine/progress';
import { useStore } from '../store';
import { BigButton } from './BigButton';
import { SpeakerIcon } from './SpeakerIcon';
import { SpeechLine } from './SpeechLine';
import './audio.css';

export function AudioControls() {
  const store = useStore();
  const settings = store.progress.value.settings;
  const levels: readonly AudioLevel[] = ['quiet', 'medium', 'loud'];
  return <div class="audio-channels">{(['voices', 'sounds', 'music'] as const).map((key) => {
    const name = { voices: 'Voices', sounds: 'Sounds', music: 'Music' }[key];
    const channel = settings[key];
    const locked = key === 'music' && settings.musicLocked;
    const on = channel.on && !locked;
    return <div class="audio-channel" role="group" aria-label={name} key={key}>
      <BigButton aria-label={`${name} ${on ? 'on' : 'off'}`} aria-pressed={on} disabled={locked}
        onClick={() => store.settings({ [key]: { ...channel, on: !channel.on } })}>
        <SpeakerIcon off={!on} />{name} {on ? 'on' : 'off'}
      </BigButton>
      <div class="audio-levels">{levels.map((level, index) => <BigButton key={level}
        aria-label={`${name} ${level}`} aria-pressed={channel.level === level}
        onClick={() => store.settings({ [key]: { ...channel, level } })}>
        <span aria-hidden="true">{['▂', '▂▄', '▂▄▆'][index]}</span> {level}
      </BigButton>)}</div>
      {locked && <SpeechLine line={{ text: 'Music is locked off by a grown-up.' }} />}
    </div>;
  })}</div>;
}

export function AudioPanel({ open, close, opener, children }: {
  open: boolean; close: () => void; opener: RefObject<HTMLButtonElement | null>; children: ComponentChildren;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); close();
    };
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('keydown', escape); opener.current?.focus(); };
  }, [open, close, opener]);
  return <div ref={panel} class="audio-panel" hidden={!open} role={open ? 'dialog' : undefined}
    aria-label="Sound controls">
    {open && <BigButton onClick={close}>Close</BigButton>}{children}
  </div>;
}
