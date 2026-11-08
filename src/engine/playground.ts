import { VirtualFs } from './fs';
import type { StorageLike } from './progress';
import { parse, Shell, type RunResult, type ShellEvent } from './shell';
import type { Playground, PlaygroundEgg } from './types';

export const PLAYGROUND_KEY = 'hax.v1.playground';
export interface PlaygroundProgress { found: string[]; discovered: string[] }
const commands = Object.freeze(['ls', 'cd', 'pwd', 'cat', 'help', 'clear', 'lock']);

export function loadPlayground(storage: StorageLike | null | undefined): PlaygroundProgress {
  try {
    const value: unknown = JSON.parse(storage?.getItem(PLAYGROUND_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return { found: [], discovered: [] };
    const { found, discovered } = value as Record<string, unknown>;
    if (!Array.isArray(found) || !Array.isArray(discovered)
      || ![...found, ...discovered].every((id) => typeof id === 'string')) {
      return { found: [], discovered: [] };
    }
    return { found: [...new Set(found)], discovered: [...new Set(discovered)] };
  } catch { return { found: [], discovered: [] }; }
}

export function savePlayground(storage: StorageLike | null | undefined, state: PlaygroundProgress): boolean {
  try {
    if (!storage) return false;
    storage.setItem(PLAYGROUND_KEY, JSON.stringify(state));
    return true;
  } catch { return false; }
}

export function clearPlayground(storage: StorageLike | null | undefined): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(PLAYGROUND_KEY);
    return true;
  } catch { return false; }
}

export function findEggs(eggs: readonly PlaygroundEgg[], found: readonly string[],
  events: readonly ShellEvent[], fs: VirtualFs): PlaygroundEgg[] {
  return eggs.filter((egg) => !found.includes(egg.id) && events.some((event) => {
    const trigger = egg.trigger;
    if (trigger.type === 'command') {
      return event.type === 'run' && event.ok
        && event.command === trigger.command.trim().toLowerCase();
    }
    return event.type === trigger.type && 'path' in event
      && fs.resolve(event.path) === fs.resolve(trigger.path);
  }));
}

/** A free-play shell keeps its discoveries separate from mission saves. */
export class PlaygroundShell extends Shell {
  private progress: PlaygroundProgress;
  found: PlaygroundEgg[] = [];
  effect: string | undefined;

  constructor(private readonly playground: Playground, private readonly name: string,
    private readonly storage: StorageLike | null | undefined) {
    super(new VirtualFs(playground.fs, playground.cwd), commands);
    const loaded = loadPlayground(storage);
    this.progress = {
      found: loaded.found.filter((id) => playground.eggs.some((egg) => egg.id === id)),
      discovered: loaded.discovered.filter((name) => playground.commands.some((command) => command.name === name)),
    };
    this.record([{ type: 'cwd', path: this.fs.cwd() }]);
  }

  get discoveries(): PlaygroundProgress { return structuredClone(this.progress); }

  override run(input: string): RunResult {
    this.found = [];
    this.effect = undefined;
    const parsed = parse(input);
    const command = parsed.ok ? parsed.command : null;
    const secret = this.playground.commands.find((entry) => entry.name === command?.name);
    if (secret && command) {
      if (command.args.length || command.flags.length) {
        return { clear: false, lines: [{ kind: 'hint', text: 'Try that command on its own.' }] };
      }
      if (!this.progress.discovered.includes(secret.name)) this.progress.discovered.push(secret.name);
      this.effect = secret.effect;
      this.record([{ type: 'run', command: secret.name, args: [], flags: [], cwd: this.fs.cwd(), ok: true }]);
      return { clear: false, lines: secret.output.map((text) =>
        ({ kind: 'out', text: text.replaceAll('{name}', this.name) })) };
    }
    const start = this.events.length;
    const result = super.run(input);
    const events = this.events.slice(start);
    if (events.some((event) => event.type === 'run' && event.command === 'help' && event.ok)) {
      result.lines.push(...this.playground.commands.filter((entry) => this.progress.discovered.includes(entry.name))
        .map((entry) => ({ kind: 'out' as const, text: `${entry.name}: ${entry.help}` })));
    }
    this.record(events);
    return result;
  }

  private record(events: readonly ShellEvent[]) {
    this.found = findEggs(this.playground.eggs, this.progress.found, events, this.fs);
    this.progress.found.push(...this.found.map((egg) => egg.id));
    savePlayground(this.storage, this.progress);
  }
}
