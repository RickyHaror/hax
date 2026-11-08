import type { RefObject } from 'preact';
import { useLayoutEffect, useState } from 'preact/hooks';
import { CommandChip } from './CommandChip';
import './terminal.css';

interface CommandBarProps {
  prompt: string;
  value: string;
  suggestion: string | null;
  options: readonly string[];
  chips: readonly string[];
  inputRef: RefObject<HTMLInputElement | null>;
  onInput: (value: string) => void;
  onComplete: () => void;
  onRun: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

function usePreview(inputRef: RefObject<HTMLInputElement | null>, value: string) {
  const [atEnd, setAtEnd] = useState(true);
  const [scroll, setScroll] = useState(0);
  const update = () => {
    const input = inputRef.current;
    if (!input) return;
    setAtEnd(input.selectionStart === input.value.length && input.selectionEnd === input.value.length);
    setScroll(input.scrollLeft);
  };
  useLayoutEffect(update, [value]);
  return { atEnd, scroll, update };
}

export function CommandBar(props: CommandBarProps) {
  const { prompt, value, suggestion, options, chips, inputRef, onInput, onComplete, onRun, onKeyDown } = props;
  const { atEnd, scroll, update } = usePreview(inputRef, value);
  const type = (command: string) => { onInput(command); inputRef.current?.focus(); };
  return <div class="command-bar">
    <form class="command-row" onSubmit={(event) => { event.preventDefault(); onRun(); inputRef.current?.focus(); }}>
      <span class="terminal-prompt"><span class="prompt-full">{prompt}</span>
        <span class="prompt-short">{prompt.slice(prompt.indexOf(':') + 1)}</span></span>
      <div class="command-field">
        <div class="command-preview" aria-hidden="true" style={{ transform: `translateX(${-scroll}px)` }}><span>{value}</span>
          {atEnd && <><span class="command-ghost">{suggestion}</span><span class="terminal-cursor" /></>}
        </div>
        <input aria-label="Command" ref={inputRef} value={value} type="text"
          style={{ caretColor: atEnd ? 'transparent' : 'var(--text)' }}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellcheck={false}
          onInput={(event) => { onInput(event.currentTarget.value); update(); }}
          onSelect={update} onScroll={update} onKeyDown={onKeyDown} />
      </div>
      <button class="command-key" type="button" aria-label="Tab"
        onClick={() => { onComplete(); inputRef.current?.focus(); }}>Tab</button>
      <button class="command-key command-enter" type="submit" aria-label="Enter">Enter</button>
    </form>
    {!!chips.length && <div class="command-chips">{chips.map((command, index) =>
      <CommandChip key={`${index}:${command}`} command={command} onType={type} />)}</div>}
    {!!options.length && <div class="command-options" role="status" aria-label="Completion options">
      {options.join('   ')}
    </div>}
  </div>;
}
