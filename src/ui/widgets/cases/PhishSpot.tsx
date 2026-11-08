import { useRef, useState } from 'preact/hooks';
import type { PhishSpotConfig } from '../../../engine/types';
import { ReadAloudButton, SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';
import { splitClueText, type CluePart } from './clueText';

interface ClueActions { found: string[]; showMe: boolean; choose: (id: string) => void }
function ClueSpan({ part, found, showMe, choose }: { part: CluePart } & ClueActions) {
  if (part.clueId === undefined) return <>{part.text}</>;
  const id = part.clueId;
  const selected = found.includes(id);
  return <span role="button" tabIndex={0} aria-label={part.text} aria-pressed={selected}
    class={`case-clue ${selected ? 'case-highlight' : showMe ? 'case-glow' : ''}`}
    onClick={() => choose(id)} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); choose(id);
      }
    }}>{part.text}</span>;
}

function EmailLine({ parts, prefix = '', ...actions }: { parts: CluePart[]; prefix?: string } & ClueActions) {
  const text = prefix + parts.map((part) => part.text).join('');
  return <div class="case-email-line"><div>{prefix}{parts.map((part, index) =>
    <ClueSpan key={index} part={part} {...actions} />)}</div>
    <ReadAloudButton line={{ text }} />
  </div>;
}

export function PhishSpot({ config, showMe, onComplete }: WidgetProps<PhishSpotConfig>) {
  const store = useStore();
  const [found, setFound] = useState<string[]>([]);
  const foundRef = useRef<string[]>([]);
  const completed = useRef(false);
  const fields = [config.email.from, config.email.subject, ...config.email.body];
  if (config.email.link !== undefined) fields.push(config.email.link);
  const split = splitClueText(fields, config.clues);
  function choose(id: string) {
    if (completed.current || foundRef.current.includes(id)) return;
    const next = [...foundRef.current, id];
    foundRef.current = next; setFound(next); store.sound.play('success');
    if (next.length >= config.needed) { completed.current = true; onComplete(); }
  }
  const actions = { found, showMe, choose };
  return <section class="case-widget case-phish">
    <div class="case-email" role="region" aria-label="Pretend email" tabIndex={0}>
      <EmailLine parts={split.fields[0]!} prefix="From: " {...actions} />
      <EmailLine parts={split.fields[1]!} prefix="Subject: " {...actions} />
      {config.email.body.map((_, index) => <EmailLine key={index} parts={split.fields[index + 2]!} {...actions} />)}
      {config.email.link !== undefined && <div class="case-pretend-link">
        <EmailLine parts={split.fields.at(-1)!} {...actions} />
      </div>}
    </div>
    {split.fallback.map((part) => <div class="case-email-line" key={part.clueId}>
      <ClueSpan part={part} {...actions} />
      <ReadAloudButton line={{ text: part.text }} />
    </div>)}
    <div class="case-found" aria-live="polite">
      <SpeechLine line={{ text: `Found ${found.length} of ${config.needed}` }} />
      <ul>{found.map((id) => <li key={id}>
        <SpeechLine line={config.clues.find((clue) => clue.id === id)!.explain} />
      </li>)}</ul>
    </div>
  </section>;
}
