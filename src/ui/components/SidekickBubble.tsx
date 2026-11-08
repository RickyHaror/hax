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
  autoRead?: boolean;
  rail?: boolean;
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
export function CommsLine({ line, sidekick, client }: { line: Line; sidekick?: string; client?: Client }) {
  const store = useStore();
  const buddy = store.registry.sidekicks.find((entry) => entry.id === sidekick)
    ?? store.registry.sidekicks[store.progress.value.sidekick ?? 0]!;
  const speaker = line.speaker === 'client' ? client?.company ?? 'Client'
    : line.speaker === 'narrator' ? 'Narrator' : line.speaker === 'player' ? 'Agent' : buddy.name;
  return <div role="group" aria-label={`${speaker} says`}><SpeechLine line={line} sidekick={buddy.id} /></div>;
}

function Comms({ lines, name, voice, client }: { lines: readonly Line[]; name: string; voice: string; client?: Client }) {
  const groups = lines.length > 3 ? [lines.slice(0, -2), lines.slice(-2, -1), lines.slice(-1)]
    : lines.map((line) => [line]);
  return <section class="sidekick-comms" aria-label={`${name}, crew tech, on comms`}>
    <header class="comms-header"><span class="signal-avatar" aria-hidden="true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></svg>
    </span><span class="comms-identity"><b>{name}</b><small>Crew tech, on comms</small></span></header>
    <div class="comms-history" tabIndex={0} aria-label="Sidekick messages">
      {groups.map((group, i) => <div key={i} class={`comms-bubble${i === groups.length - 1 ? ' comms-newest' : ''}`}>
        {group.map((line, j) => <CommsLine key={j} line={line} sidekick={voice} client={client} />)}
      </div>)}
    </div>
  </section>;
}

export function SidekickBubble({ lines, sidekickIndex, client, compact, bySpeaker = false, autoRead = true, rail = false }: BubbleProps) {
  const store = useStore();
  const sidekick = store.registry.sidekicks[sidekickIndex ?? store.progress.value.sidekick ?? 0]
    ?? store.registry.sidekicks[0]!;
  const readToMe = store.progress.value.settings.autoRead;
  const voiceSidekick = sidekickIndex === undefined ? undefined : sidekick.id;
  const signature = JSON.stringify(lines);
  useLayoutEffect(() => {
    if (!autoRead) return;
    if (readToMe) {
      const spoken = JSON.parse(signature) as Line[];
      if (voiceSidekick === undefined) store.voice.speakAll(spoken);
      else store.voice.speakAll(spoken, { sidekick: voiceSidekick });
    }
    return () => store.voice.cancel();
  }, [store, signature, autoRead, readToMe, voiceSidekick]);
  if (rail) return <Comms lines={lines} name={sidekick.name} voice={sidekick.id} client={client} />;
  if (bySpeaker) return <SpeakerLines lines={lines} sidekickIndex={sidekickIndex} client={client} compact={compact} />;
  return <section class="bubble" aria-label={`${sidekick.name} says`}>
    <Art artKey={sidekick.art} title={sidekick.name} />
    <div>{lines.map((line, i) => <SpeechLine key={i} line={line} sidekick={voiceSidekick} />)}</div>
  </section>;
}
