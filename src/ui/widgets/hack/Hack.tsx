import { createContext } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';
import { complete } from '../../../engine/complete';
import { HackSession, hackGoalMet } from '../../../engine/hack';
import type { HackConfig, Mission, PromptColor } from '../../../engine/types';
import type { OutLine } from '../../../engine/shell';
import { SpeechLine } from '../../components/SpeechLine';
import { CommandBar } from '../../terminal/CommandBar';
import { TerminalWindow } from '../../terminal/TerminalWindow';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';
import { ReadingBox } from '../tools/ReadingBox';

interface DisplayLine { text: string; kind: OutLine['kind'] | 'echo'; color?: PromptColor; prompt?: string }
export interface HackRun { session: HackSession; mission: Mission; lines: DisplayLine[] }
export const HackContext = createContext<HackRun | null>(null);
export function createHackRun(mission: Mission): HackRun {
  return { mission, session: new HackSession(mission),
    lines: [{ kind: 'out', text: 'Type a command. Press Enter to run it.' }] };
}

function promptFor(session: HackSession) {
  const { user, host, path, root } = session.prompt();
  return `${user}@${host}:${path}${root ? '#' : '$'}`;
}
function colorFor(run: HackRun): PromptColor {
  return run.mission.machines?.find((machine) => machine.host === run.session.prompt().host)?.color ?? 'hq';
}

function useCommands(run: HackRun, props: WidgetProps<HackConfig>) {
  const store = useStore();
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [, refresh] = useState(0);
  const completed = useRef(false);
  const pending = run.session.pendingInput();
  const change = (next: string) => { setValue(next); setOptions([]); };
  const names = [...new Set(props.config.commands.map((command) => command.trim().split(/\s+/u)[0]!))];
  const completion = pending ? null : complete(value, { commands: names,
    fs: run.session.machineState()!.fs, hosts: run.session.hosts });
  const finish = () => {
    if (!value.trim() || !completion) return;
    setValue(completion.value);
    setOptions(completion.options.length > 1 ? completion.options : []);
  };
  function execute() {
    if (!value.trim() && !pending) return;
    const echo: DisplayLine = { kind: 'echo', color: colorFor(run),
      prompt: pending?.label ?? promptFor(run.session), text: pending?.secret ? '*'.repeat(value.length) : value };
    const result = run.session.run(value, props.config.commands);
    const lines = result.lines.map((line, index): DisplayLine => result.alarm === 'tripped'
      && index === result.lines.length - 1 ? { ...line, kind: 'hint' } : line);
    run.lines = result.clear ? [] : [...run.lines, echo, ...lines];
    change(''); refresh((previous) => previous + 1);
    store.sound.play('key');
    if (result.lines.some((line) => line.kind !== 'out')) store.sound.play('tryAgain');
    if (!completed.current && hackGoalMet(props.config.goal, run.session)) {
      completed.current = true; store.sound.play('success'); props.onComplete();
    }
  }
  return { value, change, options, finish, execute, pending,
    suggestion: value.trim() ? completion?.suggestion ?? null : null };
}

function HackOutput({ run, focus }: { run: HackRun; focus: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; });
  return <ReadingBox boxRef={box}><div role="log" aria-label="Terminal output" class="hack-output" onClick={focus}>
    {run.lines.map((line, index) => <div key={index} class={`terminal-line terminal-${line.kind}`}
      style={line.color ? { '--prompt-color': `var(--pc-${line.color})` } : undefined}>
      {line.kind === 'hint' && <span class="terminal-sidekick" aria-label="Sidekick">★</span>}
      <SpeechLine line={{ text: `${line.prompt ? `${line.prompt} ` : ''}${line.text}` }} />
    </div>)}
  </div></ReadingBox>;
}

function HackStep(props: WidgetProps<HackConfig> & { run: HackRun }) {
  const { run, config } = props;
  const terminal = useCommands(run, props);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (typeof matchMedia === 'undefined' || !matchMedia('(max-width: 599px)').matches) input.current?.focus();
  }, []);
  const type = (value: string) => { terminal.change(value); input.current?.focus(); };
  useEffect(() => { if (props.showMe) type(config.showMe); }, [props.showMe, config.showMe]);
  const controls = <>
    {props.showMe && <div class="terminal-solution">
      <SpeechLine line={{ text: 'Show me types a command. Then press Enter.' }} />
      <button type="button" onClick={() => type(config.showMe)}>Show me</button>
    </div>}
    <CommandBar prompt={terminal.pending?.label ?? promptFor(run.session)} secret={terminal.pending?.secret}
      inputLabel={terminal.pending?.label} value={terminal.value} inputRef={input}
      chips={terminal.pending ? [] : config.chips ?? []} suggestion={terminal.suggestion} options={terminal.options}
      onInput={terminal.change} onComplete={terminal.finish} onRun={terminal.execute}
      onKeyDown={(event) => {
        if (event.isComposing) return;
        if (event.key === 'Enter') { event.preventDefault(); terminal.execute(); }
        if (event.key === 'Tab' && terminal.value.trim() && !terminal.pending) {
          event.preventDefault(); terminal.finish();
        }
      }} />
  </>;
  return <div class="terminal-widget hack-widget">
    <TerminalWindow title={promptFor(run.session)} status="HAX" color={`pc-${colorFor(run)}`} controls={controls}>
      <HackOutput run={run} focus={() => input.current?.focus()} />
    </TerminalWindow>
    {run.mission.alarm && <div class="hack-alarm" role="meter" aria-label="Alarm"
      aria-valuemin={0} aria-valuemax={run.mission.alarm.limit} aria-valuenow={run.session.alarmCount}
      aria-valuetext={`${run.session.alarmCount} of ${run.mission.alarm.limit}`}>
      Alarm: {run.session.alarmCount} of {run.mission.alarm.limit}
    </div>}
  </div>;
}

export function Hack(props: WidgetProps<HackConfig>) {
  const run = useContext(HackContext);
  if (!run) throw new Error('Hack steps need a mission session.');
  return <HackStep key={props.step.id} {...props} run={run} />;
}
