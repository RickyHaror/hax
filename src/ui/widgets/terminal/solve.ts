import { HOME, VirtualFs } from '../../../engine/fs';
import { goalMet, Shell, type ShellState } from '../../../engine/shell';
import type { TerminalConfig, TerminalGoal } from '../../../engine/types';

function quote(value: string): string {
  if (value && !/[\s'"]/u.test(value)) return value;
  return value.split('"').map((part) => `"${part}"`).join(`'"'`);
}

function simplePath(path: string, fs: VirtualFs): string {
  const target = fs.resolve(path);
  const from = fs.cwd().split('/').filter(Boolean);
  const to = target.split('/').filter(Boolean);
  let shared = 0;
  while (shared < from.length && from[shared] === to[shared]) shared++;
  let relative = [...from.slice(shared).map(() => '..'), ...to.slice(shared)].join('/') || '.';
  if (relative.startsWith('-')) relative = `./${relative}`;
  return quote(relative.length <= target.length ? relative : target);
}

function commandFor(goal: Exclude<TerminalGoal, { type: 'all' }>, fs: VirtualFs): string {
  if (goal.type !== 'run') {
    const command = { read: 'cat', cwd: 'cd', locked: 'lock', deleted: 'rm' }[goal.type];
    return `${command} ${simplePath(goal.path, fs)}`;
  }
  const args = (goal.args ?? []).map((arg) => {
    if (arg.startsWith('-')) return arg;
    if (['ls', 'cd', 'cat', 'lock', 'rm'].includes(goal.command.toLowerCase())) {
      const path = arg.startsWith('/') || arg.startsWith('~') ? arg : `${HOME}/${arg}`;
      return simplePath(path, fs);
    }
    return quote(arg);
  });
  return [goal.command, ...args].join(' ');
}

/** Plan on a detached file system so asking for help changes nothing. */
export function solveTerminal(config: TerminalConfig, state?: ShellState): string[] {
  const working: ShellState = {
    fs: new VirtualFs(state?.fs.snapshot() ?? config.fs, state?.fs.cwd() ?? config.cwd),
    events: state?.events.slice() ?? [],
  };
  const commands: string[] = [];
  function visit(goal: TerminalGoal) {
    if (goalMet(goal, working)) return;
    if (goal.type === 'all') { goal.goals.forEach(visit); return; }
    const command = commandFor(goal, working.fs);
    const shell = new Shell(working.fs, config.commands);
    const result = shell.run(command);
    working.events = [...working.events, ...shell.events];
    if (result.lines.some((line) => line.kind !== 'out') || !goalMet(goal, working)) {
      throw new Error(`Cannot solve terminal goal with allowed commands: ${command}`);
    }
    commands.push(command);
  }
  visit(config.goal);
  if (!goalMet(config.goal, working)) throw new Error('Terminal goals cannot be met together.');
  return commands;
}
