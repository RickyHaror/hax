import { useLayoutEffect } from 'preact/hooks';
import type { Client, Line } from '../../engine/types';
import { useStore } from '../store';
import { Art } from './Art';
import { SpeechLine } from './SpeechLine';
import './sidekick.css';

interface BubbleProps {
  lines: readonly Line[];
  sidekickIndex?: number;
  client?: Client;
  compact?: boolean;
  bySpeaker?: boolean;
}

function groupLines(lines: readonly Line[]) {
  const groups: { speaker: NonNullable<Line['speaker']>; lines: Line[] }[] = [];
  for (const line of lines) {
    const speaker = line.speaker ?? 'sidekick';
    const last = groups.at(-1);
    if (last?.speaker === speaker) last.lines.push(line);
    else groups.push({ speaker, lines: [line] });
  }
  return groups;
}

export function SpeakerLines({ lines, sidekickIndex, client, compact = false }: BubbleProps) {
  const store = useStore();
  const buddy = store.registry.sidekicks[sidekickIndex ?? store.progress.value.sidekick ?? 0]
    ?? store.registry.sidekicks[0]!;
  const seen = new Set<string>();
  return <div class={`speaker-lines${compact ? ' speaker-lines-compact' : ''}`}>
    {groupLines(lines).map((group, i) => {
      const character = group.speaker === 'sidekick' ? buddy
        : group.speaker === 'client' && client ? { name: client.company, art: client.art } : undefined;
      const duplicate = seen.has(group.speaker);
      seen.add(group.speaker);
      return <section key={i} class="speaker-group" aria-label={character ? `${character.name} says` : undefined}>
        {character && <div class="speaker-portrait" aria-hidden={duplicate ? 'true' : undefined}>
          <Art artKey={character.art} title={character.name} size={compact ? 64 : 88} />
        </div>}
        <div class="speaker-words">{group.lines.map((line, index) =>
          <SpeechLine key={index} line={line} sidekick={buddy.id} />)}</div>
      </section>;
    })}
  </div>;
}
export function SidekickBubble({ lines, sidekickIndex, client, compact, bySpeaker = false }: BubbleProps) {
  const store = useStore();
  const sidekick = store.registry.sidekicks[sidekickIndex ?? store.progress.value.sidekick ?? 0]
    ?? store.registry.sidekicks[0]!;
  const autoRead = store.progress.value.settings.autoRead;
  const voiceSidekick = sidekickIndex === undefined ? undefined : sidekick.id;
  const signature = JSON.stringify(lines);
  useLayoutEffect(() => {
    if (autoRead) {
      const spoken = JSON.parse(signature) as Line[];
      if (voiceSidekick === undefined) store.voice.speakAll(spoken);
      else store.voice.speakAll(spoken, { sidekick: voiceSidekick });
    }
    return () => store.voice.cancel();
  }, [store, signature, autoRead, voiceSidekick]);
  if (bySpeaker) return <SpeakerLines lines={lines} sidekickIndex={sidekickIndex} client={client} compact={compact} />;
  return <section class="bubble" aria-label={`${sidekick.name} says`}>
    <Art artKey={sidekick.art} title={sidekick.name} />
    <div>{lines.map((line, i) => <SpeechLine key={i} line={line} sidekick={voiceSidekick} />)}</div>
  </section>;
}
