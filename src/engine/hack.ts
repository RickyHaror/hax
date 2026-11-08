import { HOME } from './fs';
import { parse, tokenize } from './shell';
import type { ParsedCommand } from './shell';
import type { Mission } from './types';
import { ordinary, validCommand } from './hack-commands';
import { answer, inputLabel } from './hack-input';
import type { Pending } from './hack-input';
import { createMachine, HACK_COMMANDS, hint, output, suggest } from './hack-state';
import type { HackEvent, HackMachine, HackOutcome, HackResult } from './hack-state';

export { HACK_COMMANDS } from './hack-state';
export type { HackEvent, HackResult } from './hack-state';
export { hackGoalMet } from './hack-goals';

export class HackSession {
  private readonly machines = new Map<string, HackMachine>();
  private readonly mission: Mission;
  private stack = ['hq'];
  private history: HackEvent[] = [];
  private pending: Pending | undefined;
  private count = 0;

  constructor(mission: Mission) {
    this.mission = structuredClone(mission);
    for (const data of this.mission.machines ?? []) this.machines.set(data.host, createMachine(data));
    if (!this.machines.has('hq')) this.machines.set('hq', createMachine({
      host: 'hq', user: 'agent', color: 'hq', owner: 'HQ', listed: false,
      home: HOME, banner: ['Welcome to HQ.'],
      fs: { type: 'dir', children: { home: { type: 'dir', children: {
        agent: { type: 'dir', children: {} },
      } } } },
    }));
    const first = this.mission.steps.find((step) => step.config.kind === 'hack')?.config;
    if (first?.kind === 'hack' && first.start && first.start !== 'hq') {
      const machine = this.machines.get(first.start);
      if (machine && this.mission.contract?.allowed.includes(first.start)) {
        if (machine.loggedIn) this.stack.push(first.start);
        else this.pending = { type: 'user', host: first.start, connecting: true };
      }
    }
  }

  get events(): readonly HackEvent[] { return structuredClone(this.history); }
  get alarmCount(): number { return this.count; }
  get hosts(): readonly string[] { return [...this.machines.keys()]; }

  /** Read progress without exposing machine passwords or pending answers. */
  machineState(host = this.currentHost()) {
    const machine = this.machines.get(host);
    return machine ? { fs: machine.fs, loggedIn: machine.loggedIn, root: machine.root,
      home: machine.data.home, events: this.events.filter((event) => event.host === host) } : undefined;
  }

  prompt(): { user: string; host: string; path: string; root: boolean } {
    const machine = this.current();
    const cwd = machine.fs.cwd();
    const home = machine.data.home;
    const path = cwd === home || cwd.startsWith(`${home}/`) ? `~${cwd.slice(home.length)}` : cwd;
    return { user: machine.root ? 'root' : machine.data.user,
      host: this.currentHost(), path, root: machine.root };
  }

  pendingInput(): { label: string; secret: boolean } | null {
    return this.pending ? inputLabel(this.pending) : null;
  }

  run(input: string, allowed: readonly string[]): HackResult {
    const result = this.process(input, allowed);
    return { lines: result.lines, clear: result.clear,
      ...(result.alarm ? { alarm: result.alarm } : {}) };
  }

  private process(input: string, allowed: readonly string[]): HackOutcome {
    const names = [...new Set(allowed.map((entry) => entry.trim().split(/\s+/u)[0]!)
      .filter((name) => HACK_COMMANDS.includes(name)))];
    if (this.pending) return this.answerInput(input, names);
    const parsed = tokenize(input);
    if (!parsed.ok) return hint('Close your quote and try again.');
    if (!parsed.tokens.length) return output();
    const name = parsed.tokens[0]!.toLowerCase();
    if (!HACK_COMMANDS.includes(name)) return suggest(name, names);
    if (!names.includes(name)) return hint('You will learn that one soon!');
    if (name === 'sudo') return this.sudo(parsed.tokens.slice(1), names);
    const result = parse(input);
    if (!result.ok || !result.command) return hint();
    return this.execute(result.command, names);
  }

  private execute(command: ParsedCommand, names: readonly string[]): HackOutcome {
    const host = this.currentHost();
    const cwd = this.current().fs.cwd();
    const result = validCommand(command) ? this.dispatch(command, names) : hint();
    this.history.push({ type: 'run', host, cwd, command: command.name,
      flags: command.flags, args: command.args, ok: result.ok });
    this.record(result, host);
    return result;
  }

  private dispatch(command: ParsedCommand, names: readonly string[]): HackOutcome {
    switch (command.name) {
      case 'connect': return this.connect(command.args[0]!);
      case 'exit':
        if (this.stack.length === 1) return hint('You are already at HQ.');
        this.stack.pop();
        return output('You are back on the last computer.');
      case 'scan': return this.scan(command.args[0]);
      case 'login':
        if (!this.current().data.login) return hint('You are signed in.');
        return this.ask({ type: 'user', host: this.currentHost(), connecting: false });
      case 'passwd': return this.ask({ type: 'passphrase', host: this.currentHost() });
      case 'unlock': return this.unlock(command.args[0]!);
      default: return ordinary(this.current(), command, names, this.mission.contract);
    }
  }

  private connect(host: string): HackOutcome {
    const machine = this.machines.get(host);
    if (!machine) return suggest(host, this.hosts);
    if (!this.mission.contract?.allowed.includes(host)) {
      return hint('That computer is not yours. Only touch what you are allowed to.');
    }
    if (!machine.loggedIn) return this.ask({ type: 'user', host, connecting: true });
    this.stack.push(host);
    return output(machine.data.banner);
  }

  private scan(host?: string): HackOutcome {
    if (host === undefined) {
      const listed = [...this.machines.values()].filter((machine) => machine.data.listed !== false);
      return output(listed.length ? listed.map(({ data }) => `${data.host}: ${data.owner}`)
        : ['No computers are listed yet.']);
    }
    const machine = this.machines.get(host);
    if (!machine) return suggest(host, this.hosts);
    const ports = machine.data.ports ?? [];
    return { ...output(ports.length ? ports.map((port) =>
      `${port.port} ${port.name}: ${port.open ? 'open' : 'closed'}`) : ['No ports are listed.']),
    effects: ports.filter((port) => port.open).map((port) => ({ type: 'found-port', host, port: port.port })) };
  }

  private unlock(path: string): HackOutcome {
    const machine = this.current();
    if (!machine.fs.isLocked(path)) return hint('Try unlock with a locked file name.');
    if (!machine.data.login && !machine.data.sudo) return hint('This computer has no file password.');
    return this.ask({ type: 'unlock', host: this.currentHost(), path: machine.fs.resolve(path) });
  }

  private ask(pending: Pending): HackOutcome {
    this.pending = pending;
    return output(inputLabel(pending).label);
  }

  private sudo(tokens: string[], names: readonly string[]): HackOutcome {
    if (!tokens.length || tokens[0]!.toLowerCase() === 'sudo') return hint('Try sudo with one command.');
    const text = tokens.map((token) => `'${token.replace(/'/gu, "'\"'\"'")}'`).join(' ');
    const parsed = parse(text);
    if (!parsed.ok || !parsed.command) return hint();
    const command = parsed.command;
    if (!HACK_COMMANDS.includes(command.name)) return suggest(command.name, names);
    if (!names.includes(command.name)) return hint('You will learn that one soon!');
    if (!validCommand(command)) return hint();
    if (!this.current().data.sudo) return hint('This computer does not need sudo.');
    const host = this.currentHost();
    const cwd = this.current().fs.cwd();
    if (this.current().root) {
      const result = this.execute(command, names);
      this.sudoEvent(text, host, cwd, result.ok);
      return result;
    }
    return this.ask({ type: 'sudo', host, cwd, command: text });
  }

  private answerInput(input: string, names: readonly string[]): HackOutcome {
    const pending = this.pending!;
    const result = answer(pending, input, this.machines.get(pending.host)!);
    this.pending = result.pending;
    this.record(result.outcome, pending.host);
    if (result.command !== undefined) {
      const next = this.process(result.command, names);
      if (pending.type === 'sudo') this.sudoEvent(result.command, pending.host, pending.cwd, next.ok);
      return { ...next, lines: [...result.outcome.lines, ...next.lines] };
    }
    if (pending.type === 'sudo') this.sudoEvent(pending.command, pending.host, pending.cwd, false);
    return result.outcome;
  }

  private sudoEvent(input: string, host: string, cwd: string, ok: boolean): void {
    const parsed = tokenize(input);
    if (!parsed.ok) return;
    this.history.push({ type: 'run', host, command: 'sudo', args: parsed.tokens,
      flags: [], cwd, ok });
  }

  private record(result: HackOutcome, host: string): void {
    for (const effect of result.effects ?? []) {
      this.history.push({ ...effect, host: effect.type === 'found-port' ? effect.host : host });
    }
    if (result.connected) this.stack.push(result.connected);
    if (result.wrongPassword && this.mission.alarm) {
      this.count++;
      result.alarm = 'raised';
      if (this.count >= this.mission.alarm.limit) {
        this.stack = ['hq'];
        this.count = 0;
        this.pending = undefined;
        result.alarm = 'tripped';
        result.lines.push(...output('HQ pulled you out. Your work is safe.').lines);
      }
    }
  }

  private currentHost(): string { return this.stack[this.stack.length - 1]!; }
  private current(): HackMachine { return this.machines.get(this.currentHost())!; }
}
