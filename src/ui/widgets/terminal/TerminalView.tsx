import { speechCatalog } from '../../speech-catalog';
import { useEffect, useRef, useState } from 'preact/hooks';
import { complete } from '../../../engine/complete';
import type { VirtualFs } from '../../../engine/fs';
import { KNOWN_COMMANDS, parse, type Shell, type RunResult, type OutLine } from '../../../engine/shell';
import { ReadAloudButton, SpeechLine } from '../../components/SpeechLine';
import { CommandBar } from '../../terminal/CommandBar';
import { TerminalWindow } from '../../terminal/TerminalWindow';
import { useStore } from '../../store';
import { FolderTree } from './FolderTree';
import { ReadingBox } from '../tools/ReadingBox';

export interface TerminalViewProps {
  shell: Shell;
  chips?: readonly string[];
  commands?: readonly string[];
  solution?: readonly string[];
  onRun?: (result: RunResult) => void;
}
interface DisplayLine { kind: OutLine['kind'] | 'echo' | 'folder'; text: string; prompt?: string }
const welcome: DisplayLine = { kind: 'out', text: speechCatalog.widgets.typeCommand.text };

function useTerminal(shell: Shell, onRun?: TerminalViewProps['onRun']) {
  const store = useStore();
  const [value, setValue] = useState('');
  const [lines, setLines] = useState<DisplayLine[]>([welcome]);
  const [history, setHistory] = useState<string[]>([]);
  const historyIndex = useRef(-1);
  function run() {
    if (!value.trim()) return;
    const echo: DisplayLine = { kind: 'echo', prompt: shell.prompt(), text: value };
    const result = shell.run(value);
    setLines((previous) => result.clear ? [] : [...previous, echo, ...displayLines(result, shell.fs, value)]);
    setHistory((previous) => [value, ...previous]);
    historyIndex.current = -1;
    setValue('');
    store.sound.play('key');
    if (result.lines.some((line) => line.kind !== 'out')) store.sound.play('tryAgain');
    onRun?.(result);
  }
  function keyDown(event: KeyboardEvent) {
    if (event.isComposing || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    historyIndex.current = event.key === 'ArrowUp'
      ? Math.min(historyIndex.current + 1, history.length - 1) : Math.max(-1, historyIndex.current - 1);
    setValue(history[historyIndex.current] ?? '');
  }
  return { value, setValue, lines, run, keyDown };
}

function displayLines(result: RunResult, fs: VirtualFs, input: string): DisplayLine[] {
  const parsed = parse(input);
  if (!parsed.ok || parsed.command?.name !== 'ls') return result.lines;
  const last = fs.list(parsed.command.args[0] ?? '.');
  const folders = new Set(last.ok ? last.value.filter((entry) => entry.type === 'dir').map((entry) => `${entry.name}/`) : []);
  return result.lines.map((line) => ({ ...line, kind: line.kind === 'out' && folders.has(line.text) ? 'folder' : line.kind }));
}

function OutputLine({ line }: { line: DisplayLine }) {
  return <div class={`terminal-line terminal-${line.kind}`}>
    {line.kind === 'hint' && <span class="terminal-sidekick" aria-label="Sidekick">★</span>}
    {line.prompt ? <div class="speech-line"><span><b class="terminal-prompt">{line.prompt}</b> {line.text}</span>
      <ReadAloudButton line={{ text: `${line.prompt} ${line.text}` }} /></div>
      : <SpeechLine line={{ text: line.text }} />}
  </div>;
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
    <div class="terminal-output" role="log" aria-label="Terminal output" tabIndex={0} onClick={focusInput}>
      {lines.map((line, index) => <OutputLine key={index} line={line} />)}
    </div>
  </div></ReadingBox>;
}

function useCompletion(value: string, setValue: (value: string) => void, shell: Shell, commands: readonly string[]) {
  const [options, setOptions] = useState<string[]>([]);
  const completion = complete(value, { commands, fs: shell.fs });
  const change = (next: string) => { setValue(next); setOptions([]); };
  const finish = () => {
    if (!value.trim()) return;
    setValue(completion.value);
    setOptions(completion.options.length > 1 ? completion.options : []);
  };
  return { options, suggestion: value.trim() ? completion.suggestion : null, change, finish };
}

export function TerminalView({ shell, chips = [], commands = KNOWN_COMMANDS, solution, onRun }: TerminalViewProps) {
  const terminal = useTerminal(shell, onRun);
  const input = useRef<HTMLInputElement>(null);
  const names = [...new Set([...commands.map((command) => command.split(/\s+/u)[0]!), 'help'])];
  const completion = useCompletion(terminal.value, terminal.setValue, shell, names);
  useEffect(() => {
    input.current?.setAttribute('spellcheck', 'false');
    if (typeof matchMedia === 'undefined' || !matchMedia('(max-width: 599px)').matches) input.current?.focus();
  }, []);
  const hidden = shell.events.some((event) => event.type === 'run'
    && event.command === 'ls' && event.ok && event.flags.includes('a'));
  const run = () => { terminal.run(); completion.change(''); };
  function keyDown(event: KeyboardEvent) {
    if (event.isComposing) return;
    if (event.key === 'Tab' && terminal.value.trim()) { event.preventDefault(); completion.finish(); }
    else if (event.key === 'Enter') { event.preventDefault(); run(); }
    else { completion.change(terminal.value); terminal.keyDown(event); }
  }
  const controls = <>
    {!!solution?.length && <div class="terminal-solution">
      <SpeechLine line={speechCatalog.widgets.showMe} />
      <button type="button" onClick={() => {
        const command = solution[0]!;
        completion.change(command.endsWith(' ') ? command : `${command} `); input.current?.focus();
      }}>Show me</button>
    </div>}
    <CommandBar prompt={shell.prompt()} value={terminal.value} inputRef={input}
      suggestion={completion.suggestion} options={completion.options} chips={chips}
      onInput={completion.change} onComplete={completion.finish} onRun={run} onKeyDown={keyDown} />
  </>;
  return <div class="terminal-widget">
    <TerminalWindow title={shell.prompt().slice(0, -1).replace(':', ' · ')} status="HAX" controls={controls}>
      <Output lines={terminal.lines} shell={shell} hidden={hidden} focusInput={() => input.current?.focus()} />
    </TerminalWindow>
  </div>;
}
