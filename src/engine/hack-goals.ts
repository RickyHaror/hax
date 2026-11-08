import type { HackSession } from './hack';
import type { HackGoal, TerminalGoal } from './types';
import type { VirtualFs } from './fs';
import type { HackEvent } from './hack-state';

interface GoalState { fs: VirtualFs; events: readonly HackEvent[]; home: string }

function resolveFrom(state: GoalState, path: string, cwd: string): string {
  return state.fs.resolve(path.startsWith('/') || path === '~' || path.startsWith('~/')
    ? path : `${cwd}/${path}`);
}

function terminalGoal(goal: TerminalGoal, state: GoalState): boolean {
  if (goal.type === 'all') return goal.goals.every((goal) => terminalGoal(goal, state));
  if (goal.type === 'run') return state.events.some((event) => event.type === 'run' && event.ok
    && event.command === goal.command.toLowerCase()
    && (goal.args ?? []).every((arg) => arg.startsWith('-') && arg.length > 1
      ? [...arg.slice(1)].every((flag) => event.flags.includes(flag))
      : event.args.some((value) => value === arg
        || resolveFrom(state, value, event.cwd) === resolveFrom(state, arg, state.home))));
  const path = state.fs.resolve(goal.path);
  switch (goal.type) {
    case 'cwd': return state.fs.cwd() === path;
    case 'read': return state.events.some((event) => event.type === 'read' && event.path === path);
    case 'locked': return state.fs.isLocked(path);
    case 'deleted': return !state.fs.exists(path)
      && state.events.some((event) => event.type === 'deleted' && event.path === path);
  }
}

export function hackGoalMet(goal: HackGoal, session: HackSession): boolean {
  const events = session.events;
  switch (goal.type) {
    case 'all': return goal.goals.every((goal) => hackGoalMet(goal, session));
    case 'on': {
      const state = session.machineState(goal.host);
      return !!state && terminalGoal(goal.goal, state);
    }
    case 'connected': return session.prompt().host === goal.host;
    case 'logged-in': return session.machineState(goal.host)?.loggedIn === true;
    case 'root': return session.machineState(goal.host)?.root === true;
    case 'found-port': return events.some((event) => event.type === 'found-port'
      && event.host === goal.host && event.port === goal.port);
    case 'decoded': return events.some((event) => event.type === 'decoded' && event.text === goal.text);
    case 'reported': return events.some((event) => event.type === 'reported'
      && event.host === goal.host && event.mailId === goal.mailId);
    case 'passwd': return events.some((event) => event.type === 'passwd' && event.host === goal.host);
    case 'chmod': {
      const state = session.machineState(goal.host);
      if (!state) return false;
      const path = state.fs.resolve(goal.path);
      return events.some((event) => event.type === 'chmod' && event.host === goal.host
        && event.path === path && event.mode === goal.mode)
        && modeAt(state.fs, path) === goal.mode;
    }
    case 'flag': return events.some((event) => event.type === 'flag');
    default: return terminalGoal(goal, session.machineState()!);
  }
}

function modeAt(fs: VirtualFs, path: string): string | undefined {
  const slash = path.lastIndexOf('/');
  const result = fs.list(path.slice(0, slash) || '/', { all: true });
  return result.ok ? result.value.find((entry) => entry.name === path.slice(slash + 1))?.mode : undefined;
}
