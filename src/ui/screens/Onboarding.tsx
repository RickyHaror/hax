import { useLayoutEffect, useState } from 'preact/hooks';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { BigButton } from '../components/BigButton';
import { SidekickBubble } from '../components/SidekickBubble';
import { ReadAloudButton, SpeechLine } from '../components/SpeechLine';
import { codenameLines, SIGNUP_PROMPT } from '../../engine/codename';
import { TopBar } from '../components/TopBar';
import { CommandChip } from '../terminal/CommandChip';
import { TerminalWindow } from '../terminal/TerminalWindow';
import './startup.css';
function WordPicker({ words, selected, offset, choose, title }: {
  words: readonly string[]; selected: number; offset: number; choose: (index: number) => void; title: string;
}) {
  return <fieldset><legend>{title}</legend><div class="choices command-chips">
    {Array.from({ length: Math.min(6, words.length) }, (_, n) => (offset + n) % words.length)
      .map((index) => <BigButton class="command-chip" key={index} aria-pressed={selected === index}
        onClick={() => choose(index)}>{words[index]}</BigButton>)}
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
  const autoRead = store.progress.value.settings.autoRead;
  useLayoutEffect(() => {
    if (!autoRead) return;
    store.voice.speakAll([SIGNUP_PROMPT]);
    return () => store.voice.cancel();
  }, [store, autoRead]);
  const chooseBuddy = (index: number) => {
    setSidekick(index);
    const buddy = sidekicks[index]!;
    if (autoRead) store.voice.speakAll(buddy.greeting, { sidekick: buddy.id });
  };
  return <div class="startup onboarding-screen"><TopBar title="HQ" step="Join the crew" />
    <div class="startup-layout"><div class="startup-work">
    <TerminalWindow title="hax-os" status="SIGN UP"><div class="onboarding">
    <div class="onboarding-heading"><h1>{SIGNUP_PROMPT.text}</h1>
      <ReadAloudButton line={SIGNUP_PROMPT} /></div>
    <div class="name-pickers">
      <WordPicker title="First word" words={firstWords} selected={first} offset={offsets[0]!} choose={setFirst} />
      <WordPicker title="Second word" words={secondWords} selected={second} offset={offsets[1]!} choose={setSecond} />
    </div>
    <div class="name-preview">
      <div class="command-chips"><CommandChip command="Shuffle" onType={() =>
        setOffsets([freshOffset(firstWords.length, offsets[0]!), freshOffset(secondWords.length, offsets[1]!)])} /></div>
      <SpeechLine line={{ text: `Your name: ${firstWords[first]} ${secondWords[second]}`, speaker: 'narrator' }}
        parts={codenameLines(firstWords[first]!, secondWords[second]!)} />
    </div>
    <h2>Pick your buddy</h2><div class="buddy-choices">
      {sidekicks.slice(0, 3).map((buddy, index) => <section class="buddy-card" key={buddy.id}>
        <BigButton aria-label={buddy.name} aria-pressed={sidekick === index} onClick={() => chooseBuddy(index)}>
          <Art artKey={buddy.art} size={48} title={buddy.name} /><span>{buddy.name}</span>
        </BigButton><SpeechLine line={buddy.personality} sidekick={buddy.id} />
      </section>)}
    </div></div></TerminalWindow>
    <div class="startup-actions"><BigButton class="startup-primary"
      onClick={() => store.identify(first, second, sidekick)}>Next</BigButton></div></div>
    <aside class="startup-rail" aria-label="Sidekick rail"><SidekickBubble rail
      sidekickIndex={sidekick} lines={sidekicks[sidekick]!.greeting} autoRead={false} /></aside></div>
  </div>;
}
