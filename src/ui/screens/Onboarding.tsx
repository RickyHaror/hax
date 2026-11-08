import { useState } from 'preact/hooks';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { SpeechLine } from '../components/SpeechLine';
function WordPicker({ words, selected, offset, choose, title }: {
  words: readonly string[]; selected: number; offset: number; choose: (index: number) => void; title: string;
}) {
  return <fieldset><legend>{title}</legend><div class="choices">
    {Array.from({ length: Math.min(6, words.length) }, (_, n) => (offset + n) % words.length)
      .map((index) => <BigButton key={index} aria-pressed={selected === index} onClick={() => choose(index)}>{words[index]}</BigButton>)}
  </div></fieldset>;
}
function freshOffset(length: number, previous: number): number {
  return length < 2 ? 0 : (previous + 1 + Math.floor(Math.random() * (length - 1))) % length;
}
export function Onboarding() {
  const store = useStore();
  const { firstWords, secondWords, sidekicks } = store.registry;
  const [first, setFirst] = useState(0);
  const [second, setSecond] = useState(0);
  const [sidekick, setSidekick] = useState(0);
  const [offsets, setOffsets] = useState([0, 0]);
  return <div class="onboarding">
    <h1>Pick your agent name</h1>
    <div class="name-pickers">
      <WordPicker title="First word" words={firstWords} selected={first} offset={offsets[0]!} choose={setFirst} />
      <WordPicker title="Second word" words={secondWords} selected={second} offset={offsets[1]!} choose={setSecond} />
    </div>
    <div class="name-preview">
      <BigButton onClick={() => setOffsets([freshOffset(firstWords.length, offsets[0]!), freshOffset(secondWords.length, offsets[1]!)])}>Shuffle</BigButton>
      <SpeechLine line={{ text: `Your name: ${firstWords[first]} ${secondWords[second]}` }} />
    </div>
    <h2>Pick your buddy</h2><div class="buddy-choices">
      {sidekicks.slice(0, 3).map((buddy, index) => <section class="buddy-card" key={buddy.id}>
        <BigButton aria-pressed={sidekick === index} onClick={() => setSidekick(index)}>
          <Art artKey={buddy.art} size={48} title={buddy.name} /><span>{buddy.name}</span>
        </BigButton><SpeechLine line={buddy.personality} />
      </section>)}
    </div><SidekickBubble sidekickIndex={sidekick} lines={sidekicks[sidekick]!.greeting} />
    <BigButton onClick={() => store.identify(first, second, sidekick)}>Next</BigButton>
  </div>;
}
