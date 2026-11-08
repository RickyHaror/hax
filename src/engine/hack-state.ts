import { VirtualFs } from './fs';
import { editDistance, KNOWN_COMMANDS } from './shell';
import type { OutLine, ShellEvent } from './shell';
import type { Machine } from './types';

export const HACK_COMMANDS: readonly string[] = Object.freeze([
  ...KNOWN_COMMANDS, 'whoami', 'connect', 'login', 'exit', 'scan', 'sudo',
  'grep', 'view-source', 'decode', 'mail', 'report', 'passwd', 'chmod',
  'unlock', 'open', 'submit',
]);

export type HackEffect = Exclude<ShellEvent, { type: 'run' }>
  | { type: 'found-port'; host: string; port: number }
  | { type: 'decoded'; text: string }
  | { type: 'reported'; mailId: string }
  | { type: 'passwd' }
  | { type: 'chmod'; path: string; mode: string }
  | { type: 'flag' };
export type HackEvent = (ShellEvent | HackEffect) & { host: string };
export interface HackResult {
  lines: OutLine[];
  clear: boolean;
  alarm?: 'raised' | 'tripped';
}
export interface HackOutcome extends HackResult {
  ok: boolean;
  effects?: HackEffect[];
  wrongPassword?: boolean;
  connected?: string;
}
export interface HackMachine {
  data: Machine;
  fs: VirtualFs;
  loggedIn: boolean;
  root: boolean;
  password?: string;
}

export function createMachine(data: Machine): HackMachine {
  return { data, fs: new VirtualFs(data.fs, data.home, data.home),
    loggedIn: !data.login, root: false };
}

export function output(text: string | string[] = [], kind: OutLine['kind'] = 'out'): HackOutcome {
  const lines = (typeof text === 'string' ? [text] : text).flatMap((line) => {
    const words = line.split(/\s+/u).filter(Boolean);
    if (words.length <= 12) return [{ kind, text: line }];
    return Array.from({ length: Math.ceil(words.length / 12) }, (_, index) =>
      ({ kind, text: words.slice(index * 12, index * 12 + 12).join(' ') }));
  });
  return { ok: kind === 'out', lines, clear: false };
}

export function hint(text = 'Try help for a command you can use.'): HackOutcome {
  return output(text, 'hint');
}

export function suggest(name: string, names: readonly string[]): HackOutcome {
  if (name.length > 128) return hint('Try help for a shorter command.');
  let closest = names[0] ?? 'help';
  let best = Infinity;
  for (const candidate of names) {
    const distance = editDistance(name, candidate);
    if (distance < best) { best = distance; closest = candidate; }
  }
  return hint(`Did you mean ${closest}?`);
}

export function accepts(input: string, password: string, aliases: readonly string[] = []): boolean {
  return input === password || aliases.some((alias) => alias.toLowerCase() === input.toLowerCase());
}
