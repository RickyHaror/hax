import type { RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { CommandChip as Chip } from '../../engine/types';
import { CommandChip } from './CommandChip';
import './terminal.css';

interface CommandBarProps {
  prompt: string;
  secret?: boolean;
  inputLabel?: string;
  value: string;
  suggestion: string | null;
  options: readonly string[];
  chips: readonly (string | Chip)[];
  inputRef: RefObject<HTMLInputElement | null>;
  onInput: (value: string) => void;
  onComplete: () => void;
  onRun: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}

function useInput(props: CommandBarProps) {
  const selection = useRef<{ start: number; end: number } | null>(null);
  const beforeInput = () => {
    const input = props.inputRef.current;
    selection.current = input ? { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 } : null;
  };
  const onInput = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    let next = input.value;
    if (props.secret) {
      const caret = input.selectionEnd ?? next.length;
      const tail = next.length - caret;
      const data = (event as InputEvent).data;
      const deleting = (event as InputEvent).inputType?.startsWith('delete');
      const selected = deleting && selection.current?.start === selection.current?.end ? null : selection.current;
      const end = selected?.end ?? props.value.length - tail;
      const start = selected?.start ?? (data != null ? caret - data.length : Math.min(caret, end));
      next = selection.current || next.includes('*') || data != null
        ? props.value.slice(0, start) + next.slice(start, caret) + props.value.slice(end) : next;
      input.value = '*'.repeat(next.length);
      input.setSelectionRange(caret, caret);
    }
    selection.current = null;
    props.onInput(next);
  };
  return { beforeInput, onInput };
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
  const input = useInput(props);
  const shown = props.secret ? '*'.repeat(value.length) : value;
  const type = (command: string) => { onInput(command); inputRef.current?.focus(); };
  return <div class="command-bar">
    <form class="command-row" onSubmit={(event) => { event.preventDefault(); onRun(); inputRef.current?.focus(); }}>
      <span class="terminal-prompt"><span class="prompt-full">{prompt}</span>
        <span class="prompt-short">{props.inputLabel ? prompt : prompt.slice(prompt.indexOf(':') + 1)}</span></span>
      <div class="command-field">
        <div class="command-preview" aria-hidden="true" style={{ transform: `translateX(${-scroll}px)` }}><span>{shown}</span>
          {atEnd && <><span class="command-ghost">{suggestion}</span><span class="terminal-cursor" /></>}
        </div>
        <input aria-label={props.inputLabel ?? 'Command'} ref={inputRef} value={shown} type="text"
          style={{ caretColor: atEnd ? 'transparent' : 'var(--text)' }}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellcheck={false}
          onBeforeInput={input.beforeInput} onInput={(event) => { input.onInput(event); update(); }}
          onSelect={update} onScroll={update} onKeyDown={onKeyDown} />
      </div>
      <button class="command-key" type="button" aria-label="Tab"
        onClick={() => { onComplete(); inputRef.current?.focus(); }}>Tab</button>
      <button class="command-key command-enter" type="submit" aria-label="Enter">Enter</button>
    </form>
    {!!chips.length && <div class="command-chips">{chips.map((chip, index) => {
      const data = typeof chip === 'string' ? { command: chip } : chip;
      return <CommandChip key={`${index}:${data.command}`} {...data} onType={type} />;
    })}</div>}
    {!!options.length && <div class="command-options" role="status" aria-label="Completion options">
      {options.join('   ')}
    </div>}
  </div>;
}
