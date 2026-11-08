import { useEffect, useRef, useState } from 'preact/hooks';
import type { Shell, RunResult, OutLine } from '../../../engine/shell';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import { FolderTree } from './FolderTree';
import { ReadingBox } from '../tools/ReadingBox';

export interface TerminalViewProps {
  shell: Shell;
  chips?: readonly string[];
  solution?: readonly string[];
  onRun?: (result: RunResult) => void;
}
interface DisplayLine { kind: OutLine['kind'] | 'echo'; text: string }
const welcome: DisplayLine = { kind: 'out', text: 'Type a command, or click a chip.' };

function CommandChips({ commands, run }: { commands: readonly string[]; run: (command: string) => void }) {
  return <div class="terminal-chips">{commands.map((command, index) =>
    <BigButton key={`${index}:${command}`} onClick={() => run(command)}>{command}</BigButton>)}</div>;
}

function useTerminal(shell: Shell, onRun?: TerminalViewProps['onRun']) {
  const store = useStore();
  const [value, setValue] = useState('');
  const [lines, setLines] = useState<DisplayLine[]>([welcome]);
  const [history, setHistory] = useState<string[]>([]);
  const historyIndex = useRef(-1);
  function run(command: string, chip = false) {
    if (!command.trim()) return;
    const echo: DisplayLine = { kind: 'echo', text: `${shell.prompt()} ${command}` };
    const result = shell.run(command);
    setLines((previous) => result.clear ? [] : [...previous, echo, ...result.lines]);
    setHistory((previous) => [command, ...previous]);
    historyIndex.current = -1;
    setValue(chip ? command : '');
    store.sound.play('key');
    if (result.lines.some((line) => line.kind !== 'out')) store.sound.play('tryAgain');
    onRun?.(result);
  }
  function keyDown(event: KeyboardEvent) {
    if (event.isComposing) return;
    if (event.key === 'Enter') { event.preventDefault(); run(value); }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    historyIndex.current = event.key === 'ArrowUp'
      ? Math.min(historyIndex.current + 1, history.length - 1) : Math.max(-1, historyIndex.current - 1);
    setValue(history[historyIndex.current] ?? '');
  }
  return { value, setValue, lines, run, keyDown };
}

function Output({ lines, shell, hidden, focusInput }: {
  lines: DisplayLine[]; shell: Shell; hidden: boolean; focusInput: () => void;
}) {
  const output = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (output.current) output.current.scrollTop = output.current.scrollHeight;
  });
  return <ReadingBox boxRef={output}><div class="terminal-reading">
    <FolderTree fs={shell.fs} hidden={hidden} />
    <section class="terminal-panel" aria-label="Terminal" onClick={focusInput}>
    <div class="terminal-output" role="log" aria-label="Terminal output" tabIndex={0}>
    {lines.map((line, index) => <div key={index} class={`terminal-line terminal-${line.kind}`}>
      {line.kind === 'hint' && <span class="terminal-sidekick" aria-label="Sidekick">★</span>}
      <SpeechLine line={{ text: line.text }} />
    </div>)}
    </div></section>
  </div></ReadingBox>;
}

export function TerminalView({ shell, chips = [], solution, onRun }: TerminalViewProps) {
  const terminal = useTerminal(shell, onRun);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.setAttribute('spellcheck', 'false');
    input.current?.focus();
  }, []);
  const runChip = (command: string) => { terminal.run(command, true); input.current?.focus(); };
  const hidden = shell.events.some((event) => event.type === 'run'
    && event.command === 'ls' && event.ok && event.flags.includes('a'));
  return <div class="terminal-widget">
      <Output lines={terminal.lines} shell={shell} hidden={hidden} focusInput={() => input.current?.focus()} />
      <div class="terminal-controls" onClick={() => input.current?.focus()}>
        {solution !== undefined && <div class="terminal-solution">
          <SpeechLine line={{ text: 'Try this: Click a chip to run it.' }} />
          <CommandChips commands={solution} run={runChip} />
        </div>}
        <CommandChips commands={chips.filter((chip) => !solution?.includes(chip))} run={runChip} />
        <form class="terminal-command" onSubmit={(event) => { event.preventDefault(); terminal.run(terminal.value); }}>
          <label class="terminal-input-line"><span>{shell.prompt()}</span>
            <input aria-label="Command" ref={input} value={terminal.value} type="text"
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellcheck={false}
              onInput={(event) => terminal.setValue(event.currentTarget.value)} onKeyDown={terminal.keyDown} />
            <span class="terminal-cursor" aria-hidden="true" />
          </label>
          <BigButton type="submit">Run</BigButton>
        </form>
      </div>
  </div>;
}
