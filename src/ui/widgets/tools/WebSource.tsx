import { speechCatalog } from '../../speech-catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { WebSourceConfig } from '../../../engine/types';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import { Answer } from '../Answer';
import type { WidgetProps } from '../Widget';
import { tokenizeSource, type SourceToken } from './tokenize-source';
import { ReadingBox } from './ReadingBox';

function sourceLines(source: string): SourceToken[][] {
  const lines: SourceToken[][] = [[]];
  for (const token of tokenizeSource(source)) {
    token.text.split('\n').forEach((text, index) => {
      if (index) lines.push([]);
      lines.at(-1)!.push({ kind: token.kind, text });
    });
  }
  return lines;
}
function SourcePanel({ source, answer, reveal }: { source: string; answer: string; reveal: boolean }) {
  const panel = useRef<HTMLPreElement>(null);
  useEffect(() => { if (reveal) panel.current?.querySelector('mark')?.scrollIntoView?.({ block: 'nearest' }); }, [reveal]);
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  return <ReadingBox><pre class="tool-source" aria-label="Page source" ref={panel}><code>
    {sourceLines(source).map((tokens, index) => {
      const highlighted = reveal && normalize(tokens.map((token) => token.text).join('')).includes(normalize(answer));
      const content = tokens.map((token, part) => <span key={part} class={`source-${token.kind}`}>{token.text}</span>);
      return <span class="source-line" key={index}>{highlighted ? <mark>{content}</mark> : content}{'\n'}</span>;
    })}
  </code></pre></ReadingBox>;
}
function PretendPage({ page }: { page: WebSourceConfig['page'] }) {
  const store = useStore();
  const [pretend, setPretend] = useState(false);
  return <ReadingBox><section class="tool-page" aria-label="Pretend page">
    {page.blocks.map((block, index) => block.type === 'button'
      ? <BigButton key={index} onClick={() => { setPretend(true); store.sound.play('click'); }}>{block.text}</BigButton>
      : block.type === 'heading' ? <h3 key={index}><SpeechLine line={{ text: block.text }} /></h3>
        : <div role="paragraph" key={index}><SpeechLine line={{ text: block.text }} /></div>)}
    {pretend && <SpeechLine line={speechCatalog.tools.pretendPage} />}
  </section></ReadingBox>;
}
export function WebSource({ step, config, showMe, onComplete }: WidgetProps<WebSourceConfig>) {
  const store = useStore();
  const revealCount = store.revealCount.value;
  const [viewCode, setViewCode] = useState(false);
  useEffect(() => { if (showMe) setViewCode(true); }, [showMe, revealCount]);
  return <section class="mission-tool web-source">
    <div class="tool-browser">
      <div class="tool-browser-heading">
      <div class="tool-tab"><SpeechLine line={{ text: config.page.title }} /></div>
      <div class="tool-address" aria-label="Pretend address">{config.page.address}</div>
      <BigButton aria-pressed={viewCode} onClick={() => {
        setViewCode(!viewCode); store.sound.play('click');
      }}>View Code</BigButton>
      </div>
      {viewCode ? <SourcePanel source={config.source} answer={config.answer} reveal={showMe} />
        : <PretendPage page={config.page} />}
    </div>
    <Answer config={{ kind: 'answer', question: speechCatalog.tools.secretQuestion, answer: config.answer }}
      step={step} showMe={showMe} onComplete={onComplete} />
  </section>;
}
