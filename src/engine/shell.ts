import { HOME } from './fs';
import type { FsError, VirtualFs } from './fs';
import type { TerminalGoal } from './types';

export const KNOWN_COMMANDS: readonly string[] = Object.freeze([
  'ls', 'cd', 'cat', 'help', 'clear', 'pwd', 'lock', 'rm',
]);

export interface OutLine { kind: 'out' | 'err' | 'hint'; text: string }
export type TokenizeResult =
  | { ok: true; tokens: string[] }
  | { ok: false; error: 'unclosed-quote' };
export interface ParsedCommand { name: string; flags: string[]; args: string[] }
export type ParseResult =
  | { ok: true; command: ParsedCommand | null }
  | { ok: false; error: 'unclosed-quote' };
export type ShellEvent =
  | { type: 'run'; command: string; flags: string[]; args: string[]; cwd: string; ok: boolean }
  | { type: 'read'; path: string }
  | { type: 'cwd'; path: string }
  | { type: 'locked'; path: string }
  | { type: 'deleted'; path: string };
export interface RunResult { lines: OutLine[]; clear: boolean }
export interface ShellState { fs: VirtualFs; events: readonly ShellEvent[] }

export function tokenize(input: string): TokenizeResult {
  const tokens: string[] = [];
  let word = '';
  let quote = '';
  let started = false;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = '';
      else word += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/u.test(char)) {
      if (started) tokens.push(word);
      word = '';
      started = false;
    } else {
      word += char;
      started = true;
    }
  }
  if (quote) return { ok: false, error: 'unclosed-quote' };
  if (started) tokens.push(word);
  return { ok: true, tokens };
}

export function parse(input: string): ParseResult {
  const result = tokenize(input);
  if (!result.ok) return result;
  const [name, ...rest] = result.tokens;
  if (name === undefined) return { ok: true, command: null };
  const flags: string[] = [];
  const args: string[] = [];
  for (const token of rest) {
    if (token.startsWith('-') && token.length > 1) flags.push(...token.slice(1));
    else args.push(token);
  }
  return { ok: true, command: { name: name.toLowerCase(), flags: [...new Set(flags)], args } };
}

export function editDistance(a: string, b: string): number {
  const left = [...a];
  const right = [...b];
  const rows = Array.from({ length: left.length + 1 }, (_, i) =>
    Array.from({ length: right.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        rows[i]![j] = Math.min(rows[i]![j]!, rows[i - 2]![j - 2]! + 1);
      }
    }
  }
  return rows[left.length]![right.length]!;
}

type Effect = Exclude<ShellEvent, { type: 'run' }>;
export interface Outcome extends RunResult { ok: boolean; event?: Effect }
type Handler = (fs: VirtualFs, command: ParsedCommand, names: readonly string[]) => Outcome;

function lines(text: string | string[], kind: OutLine['kind'] = 'out'): OutLine[] {
  return (typeof text === 'string' ? [text] : text).map((text) => ({ kind, text }));
}

function success(text: string[] = [], event?: Effect): Outcome {
  return { ok: true, lines: lines(text), clear: false, event };
}

function error(text: string, kind: 'err' | 'hint' = 'err'): Outcome {
  return { ok: false, lines: lines(text, kind), clear: false };
}

function fsError(errorValue: FsError, path: string): Outcome {
  const messages: Record<FsError['kind'], string> = {
    'not-found': `I cannot find "${path}". Try ls to look around.`,
    'not-a-dir': `"${path}" is not a folder. Try ls to find one.`,
    'is-a-dir': `"${path}" is a folder. Try a file name.`,
    locked: `"${path}" is locked. Try a file you can read.`,
    'bad-path': `The path "${path}" is empty. Try a file name.`,
  };
  return error(messages[errorValue.kind]);
}

function list(fs: VirtualFs, command: ParsedCommand): Outcome {
  const path = command.args[0] ?? '.';
  const result = fs.list(path, { all: command.flags.includes('a') });
  if (!result.ok) return fsError(result.error, path);
  const names = result.value.map((item) =>
    item.name + (item.type === 'dir' ? '/' : item.locked ? ' [locked]' : ''));
  return success(names.length ? names : ['This folder is empty.']);
}

function cd(fs: VirtualFs, command: ParsedCommand): Outcome {
  const path = command.args[0] ?? HOME;
  const result = fs.cd(path);
  return result.ok ? success([], { type: 'cwd', path: result.value }) : fsError(result.error, path);
}

function cat(fs: VirtualFs, command: ParsedCommand): Outcome {
  const path = command.args[0];
  if (path === undefined) return error('Try cat with a file name.');
  const result = fs.read(path);
  return result.ok
    ? success(result.value.split('\n'), { type: 'read', path: fs.resolve(path) })
    : fsError(result.error, path);
}

function changeFile(fs: VirtualFs, command: ParsedCommand): Outcome {
  const path = command.args[0];
  if (path === undefined) return error(`Try ${command.name} with a file name.`);
  const locking = command.name === 'lock';
  const result = locking ? fs.lock(path) : fs.remove(path);
  if (!result.ok) return fsError(result.error, path);
  return success([locking ? `You locked "${path}". Nice work!` : `You removed "${path}". Nice work!`], {
    type: locking ? 'locked' : 'deleted', path: fs.resolve(path),
  });
}

const descriptions: Readonly<Record<string, string>> = Object.freeze({
  ls: 'List files and folders.',
  cd: 'Go to a folder.',
  cat: 'Read a file.',
  help: 'Show commands you can use.',
  clear: 'Clear the screen.',
  pwd: 'Show your folder path.',
  lock: 'Lock a file.',
  rm: 'Remove a file.',
});

export const handlers: Readonly<Record<string, Handler>> = Object.freeze({
  ls: list,
  cd,
  cat,
  help: (_fs, _command, names) => success(names.map((name) => `${name}: ${descriptions[name]}`)),
  clear: () => ({ ok: true, clear: true, lines: [] }),
  pwd: (fs) => success([fs.cwd()]),
  lock: changeFile,
  rm: changeFile,
});

function unknown(name: string, names: readonly string[]): RunResult {
  let closest: string | undefined;
  let best = 3;
  for (const candidate of names) {
    const distance = editDistance(name, candidate);
    if (distance < best) {
      best = distance;
      closest = candidate;
    }
  }
  return {
    clear: false,
    lines: closest
      ? lines(`Did you mean ${closest}?`, 'hint')
      : lines('Hmm, I do not know that one. Try help.', 'err'),
  };
}

export class Shell {
  readonly fs: VirtualFs;
  private readonly names: readonly string[];
  private readonly history: ShellEvent[] = [];

  constructor(fs: VirtualFs, allowed: readonly string[]) {
    this.fs = fs;
    const bareNames = allowed.map((entry) => entry.trim().split(/\s+/u)[0]!);
    const names = [...new Set(bareNames.filter((name) => KNOWN_COMMANDS.includes(name)))];
    this.names = names.includes('help') ? names : [...names, 'help'];
  }

  get events(): readonly ShellEvent[] {
    return structuredClone(this.history);
  }

  get state(): ShellState {
    return { fs: this.fs, events: this.events };
  }

  prompt(): string {
    const cwd = this.fs.cwd();
    const path = cwd === HOME || cwd.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd;
    return `agent@hax:${path}$`;
  }

  run(input: string): RunResult {
    const result = parse(input);
    if (!result.ok) return { clear: false, lines: lines('Close your quote and try again.', 'err') };
    const command = result.command;
    if (!command) return { clear: false, lines: [] };
    if (!KNOWN_COMMANDS.includes(command.name)) return unknown(command.name, this.names);
    const cwd = this.fs.cwd();
    const outcome = this.execute(command);
    this.history.push({ type: 'run', command: command.name, flags: command.flags, args: command.args,
      cwd, ok: outcome.ok });
    if (outcome.event) this.history.push(outcome.event);
    return { lines: outcome.lines, clear: outcome.clear };
  }

  private execute(command: ParsedCommand): Outcome {
    const { name, flags } = command;
    if (!this.names.includes(name)) {
      return error('You will learn that one soon!', 'hint');
    }
    if (flags.some((flag) => name !== 'ls' || !['a', 'l'].includes(flag))) {
      return error('That flag does not work here. Try help.');
    }
    const maxArgs = ['help', 'clear', 'pwd'].includes(name) ? 0 : 1;
    if (command.args.length > maxArgs) {
      return error(maxArgs === 0
        ? 'Try that command on its own.' : 'Try one path at a time.');
    }
    return handlers[name]!(this.fs, command, this.names);
  }
}

function resolveFrom(fs: VirtualFs, path: string, cwd: string): string {
  return fs.resolve(path.startsWith('/') || path === '~' || path.startsWith('~/') ? path : `${cwd}/${path}`);
}

function runGoal(goal: Extract<TerminalGoal, { type: 'run' }>, state: ShellState): boolean {
  return state.events.some((event) => event.type === 'run' && event.ok
    && event.command.toLowerCase() === goal.command.toLowerCase()
    && (goal.args ?? []).every((arg) => arg.startsWith('-') && arg.length > 1
      ? [...arg.slice(1)].every((flag) => event.flags.includes(flag))
      : event.args.some((value) => value === arg
        || resolveFrom(state.fs, value, event.cwd) === resolveFrom(state.fs, arg, HOME))));
}

export function goalMet(goal: TerminalGoal, state: ShellState): boolean {
  if (goal.type === 'all') return goal.goals.every((item) => goalMet(item, state));
  if (goal.type === 'run') return runGoal(goal, state);
  const path = state.fs.resolve(goal.path);
  switch (goal.type) {
    case 'read': return state.events.some((event) => event.type === 'read' && event.path === path);
    case 'cwd': return state.fs.cwd() === path;
    case 'locked': return state.fs.isLocked(path);
    case 'deleted': return !state.fs.exists(path)
      && state.events.some((event) => event.type === 'deleted' && event.path === path);
  }
}
