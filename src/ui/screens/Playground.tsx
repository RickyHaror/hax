import { useEffect, useMemo, useState } from 'preact/hooks';
import { PlaygroundShell } from '../../engine/playground';
import type { Playground as PlaygroundData, PlaygroundEgg } from '../../engine/types';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { SpeechLine } from '../components/SpeechLine';
import { PlaygroundEffect } from '../effects';
import { hackerName, useStore } from '../store';
import { TerminalView } from '../widgets/terminal/TerminalView';
import { ReadingBox } from '../widgets/tools/ReadingBox';
import { Map } from './Map';
import './playground.css';

function EggNews({ eggs }: { eggs: PlaygroundEgg[] }) {
  const store = useStore();
  useEffect(() => { eggs.forEach(() => store.sound.play('success')); }, [eggs, store]);
  return <>{eggs.map((egg) => <SidekickBubble key={egg.id} lines={egg.found} />)}</>;
}

function FreeTerminal({ data }: { data: PlaygroundData }) {
  const store = useStore();
  const shell = useMemo(() => new PlaygroundShell(data,
    hackerName(store.progress, store.registry), store.storage), [data, store]);
  const [progress, setProgress] = useState(shell.discoveries);
  const [news, setNews] = useState(shell.found);
  const [effect, setEffect] = useState<{ key: string | undefined; turn: number }>({ key: undefined, turn: 0 });
  const badges = data.eggs.filter((egg) => progress.found.includes(egg.id))
    .sort((left, right) => progress.found.indexOf(right.id) - progress.found.indexOf(left.id));
  function afterRun() {
    setProgress(shell.discoveries);
    if (shell.found.length) setNews(shell.found);
    if (shell.effect) setEffect((previous) => ({ key: shell.effect, turn: previous.turn + 1 }));
  }
  return <div class="playground-screen">
    <header class="playground-heading"><h1>Agent Playground</h1>
      <SpeechLine line={{ text: `Eggs found: ${progress.found.length} of ${data.eggs.length}` }} />
    </header>
    <div class="playground-body">
      <ReadingBox label="Playground stories">
        {!news.length && <SidekickBubble lines={data.intro} />}
        <div role="status" aria-live="polite"><EggNews eggs={news} /></div>
        <ul class="playground-badges" aria-label="Egg badges">
          {badges.map((egg) => <li key={egg.id}>
            <Art artKey="badge-egg" title={egg.name} size={48} />
            <SpeechLine line={{ text: egg.name }} />
          </li>)}
        </ul>
      </ReadingBox>
      <div class="playground-terminal">
        <TerminalView shell={shell} onRun={afterRun} />
        <PlaygroundEffect key={effect.turn} effect={effect.key} />
      </div>
    </div>
    <BigButton onClick={() => store.go({ name: 'map' })}>Back to the map</BigButton>
  </div>;
}

export function Playground() {
  const store = useStore();
  const data = store.registry.playground;
  return data && Object.hasOwn(store.progress.value.completed, data.unlockedBy)
    ? <FreeTerminal data={data} /> : <Map />;
}
