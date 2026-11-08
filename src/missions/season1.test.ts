import { describe, expect, it } from 'vitest';
import { collectLines } from '../../scripts/checks/collect-lines';
import { fleschKincaidGrade, lineProblems, MAX_GRADE } from '../../scripts/checks/readability';
import { VirtualFs } from '../engine/fs';
import type { FsNode, HackConfig, HackGoal, Line, Machine, Mission } from '../engine/types';
import { missions } from './index';
import { season1, season1Missions } from './season1';

const plannedIds = [
  's1-m1-toy-shop', 's1-m2-sticky-note', 's1-m3-hidden-folder',
  's1-m4-page-source', 's1-m5-log-search', 's1-m6-weak-password',
];

function checkLine(line: Line): void {
  expect(line.text.trim(), line.text).not.toBe('');
  expect(Object.keys(line).every((key) => ['text', 'say', 'speaker'].includes(key))).toBe(true);
  expect(line.say, line.text).not.toBe(line.text);
  if (/\b(?:ls|cd|pwd)\b/i.test(line.text) || /[\w-]+\.[\w-]+|\.[\w-]+/.test(line.text)) {
    expect(typeof line.say, line.text).toBe('string');
    expect(line.say?.trim(), line.text).toBeTruthy();
  }
  if (line.speaker !== undefined) {
    expect(['sidekick', 'client', 'narrator', 'player']).toContain(line.speaker);
  }
  expect(lineProblems(line.text), line.text).toEqual([]);
}

function walk(value: unknown, visit: (value: unknown) => void): void {
  visit(value);
  if (value && typeof value === 'object') Object.values(value).forEach((child) => walk(child, visit));
}

function fileContents(node: FsNode): string[] {
  return node.type === 'file' ? [node.content] : Object.values(node.children).flatMap(fileContents);
}

function fileNames(node: FsNode): string[] {
  if (node.type === 'file') return [];
  return Object.entries(node.children).flatMap(([name, child]) => [name, ...fileNames(child)]);
}

function checkAddresses(mission: Mission): void {
  const names = new Set((mission.machines ?? []).flatMap((machine) => fileNames(machine.fs)));
  walk(mission, (value) => {
    if (typeof value !== 'string') return;
    expect(value).not.toMatch(/http|www\./i);
    for (const address of value.match(/(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*/gi) ?? []) {
      expect(address.endsWith('.example') || names.has(address), address).toBe(true);
    }
  });
}

function machineAt(mission: Mission, host: string): Machine {
  const machine = mission.machines?.find((entry) => entry.host === host);
  expect(machine, host).toBeDefined();
  return machine!;
}

function checkGoal(mission: Mission, config: HackConfig, goal: HackGoal, host: string): void {
  if ('host' in goal) machineAt(mission, goal.host);
  if (goal.type === 'all') {
    goal.goals.forEach((child) => checkGoal(mission, config, child, host));
  } else if (goal.type === 'on') {
    checkGoal(mission, config, goal.goal, goal.host);
  } else if (goal.type === 'run') {
    expect(config.commands).toContain(goal.command);
  } else if (goal.type === 'read' || goal.type === 'cwd') {
    const fs = new VirtualFs(machineAt(mission, host).fs);
    expect(goal.path.startsWith('/'), goal.path).toBe(true);
    expect(config.commands).toContain(goal.type === 'read' ? 'cat' : 'cd');
    if (goal.type === 'cwd') expect(fs.isDir(goal.path), goal.path).toBe(true);
    else expect(fs.read(goal.path).ok, goal.path).toBe(true);
  }
}

/** Turn a spelled-out command back into its exact typed form. */
function dictatedCommand(text: string): string {
  return text.replace(/^Type /, '')
    .replace(', a space, then ', ' ')
    .replace(' and an open brace. Add ', '{')
    .replaceAll(', hyphen, ', '-')
    .replace('. End with a close brace. Press Enter.', '}')
    .replace('. Press Enter.', '');
}

function checkSteps(mission: Mission): void {
  let host = 'hq';
  expect(mission.steps.length).toBeGreaterThan(0);
  expect(mission.steps[0]?.config).toMatchObject({ kind: 'hack', start: 'hq' });
  expect(new Set(mission.steps.map((step) => step.id)).size).toBe(mission.steps.length);
  for (const step of mission.steps) {
    expect(step.config.kind).toBe('hack');
    if (step.config.kind !== 'hack') throw new Error('Expected a hack step');
    const config = step.config;
    const [command, target] = config.showMe.trim().split(/\s+/);
    if (command === 'connect') host = target!;
    expect(step.hints).toHaveLength(3);
    expect(config.chips?.length).toBeGreaterThanOrEqual(1);
    expect(config.chips?.length).toBeLessThanOrEqual(3);
    for (const chip of config.chips ?? []) {
      expect(chip.hint?.trim()).toBeTruthy();
      expect(config.commands, chip.command).toContain(chip.command.trim().split(/\s+/)[0]);
    }
    expect(config.commands, config.showMe).toContain(command);
    const hint = step.hints[2].text;
    expect(hint.includes(config.showMe) || dictatedCommand(hint) === config.showMe, step.id).toBe(true);
    checkGoal(mission, config, config.goal, host);
  }
  const final = mission.steps.at(-1)!.config as HackConfig;
  expect(final.goal).toEqual({ type: 'flag' });
  expect(final.commands).toContain('submit');
  expect(final.showMe).toBe(`submit ${mission.contract!.flag}`);
}

interface Route {
  machine?: Machine;
  fs?: VirtualFs;
  command: string;
  args: string[];
  read?: { host: string; path: string; content: string };
}

/** Follow the authored commands using the real file system, with transport assumed by the spec. */
function followCommand(mission: Mission, route: Route, input: string): void {
  const [command, ...args] = input.split(/\s+/);
  route.command = command!;
  route.args = args;
  route.read = undefined;
  if (command === 'connect') {
    expect(mission.contract!.allowed).toContain(args[0]);
    route.machine = machineAt(mission, args[0]!);
    route.fs = new VirtualFs(route.machine.fs, route.machine.home);
    expect(route.fs.cwd()).toBe(route.machine.home);
  } else if (command === 'login') {
    expect(route.machine?.login?.user).toBe(args[0]);
  } else if (command === 'cd') {
    expect(route.fs!.cd(args[0]).ok, input).toBe(true);
  } else if (command === 'cat') {
    const result = route.fs!.read(args[0]!);
    expect(result.ok, input).toBe(true);
    if (result.ok) route.read = {
      host: route.machine!.host, path: route.fs!.resolve(args[0]!), content: result.value,
    };
  } else if (command === 'ls') {
    expect(route.fs!.list(undefined, { all: args.includes('-a') }).ok).toBe(true);
  } else if (command === 'submit') {
    expect(args).toEqual([mission.contract!.flag]);
  }
}

function checkRouteGoal(route: Route, goal: HackGoal): void {
  if (goal.type === 'on') {
    expect(route.machine?.host).toBe(goal.host);
    checkRouteGoal(route, goal.goal);
  } else if (goal.type === 'all') {
    goal.goals.forEach((child) => checkRouteGoal(route, child));
  } else if (goal.type === 'read') {
    expect(route.read?.host).toBe(route.machine?.host);
    expect(route.read?.path).toBe(goal.path);
  } else if (goal.type === 'cwd') {
    expect(route.fs?.cwd()).toBe(goal.path);
  } else if (goal.type === 'connected' || goal.type === 'logged-in') {
    expect(route.machine?.host).toBe(goal.host);
    if (goal.type === 'logged-in') expect(route.machine?.login).toBeDefined();
  } else if (goal.type === 'run') {
    expect(route.command).toBe(goal.command);
    if (goal.args) expect(route.args).toEqual(goal.args);
  } else if (goal.type === 'flag') {
    expect(route.command).toBe('submit');
  } else {
    throw new Error(`No data route check for ${goal.type}`);
  }
}

function checkFlagRoute(mission: Mission): void {
  const route: Route = { command: '', args: [] };
  let foundFlag = false;
  for (const step of mission.steps) {
    if (step.config.kind !== 'hack') throw new Error('Expected a hack step');
    followCommand(mission, route, step.config.showMe);
    checkRouteGoal(route, step.config.goal);
    if (route.read?.content.includes(mission.contract!.flag)) foundFlag = true;
    if (step.config.goal.type === 'flag') expect(foundFlag).toBe(true);
  }
  expect(foundFlag).toBe(true);
}

describe('Corner Town season data', () => {
  it('lists all six planned missions but exports only the first three', () => {
    expect(season1).toMatchObject({ id: 's1', number: 1, title: 'Corner Town', requires: null });
    expect(season1.blurb.trim()).not.toBe('');
    expect(season1.missions).toEqual(plannedIds);
    expect(season1Missions.map((mission) => mission.id)).toEqual(plannedIds.slice(0, 3));
    for (const field of ['id', 'bit', 'order'] as const) {
      const values = [...missions, ...season1Missions].map((mission) => mission[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  for (const mission of season1Missions) {
    describe(mission.id, () => {
      it('matches its schema, season position, permission and reward', () => {
        const index = season1.missions.indexOf(mission.id);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(mission).toMatchObject({
          chapter: 'season', season: 's1', bit: 16 + index, order: 16 + index, xp: 20, minutes: 10,
          requires: index === 0 ? [] : [season1.missions[index - 1]],
          badge: { id: mission.id, art: 'badge-s1' },
        });
        expect(mission.badge.name.trim()).not.toBe('');
        expect(mission.intro.some((line) => /only hack.*own.*permission.*hack/i.test(line.text))).toBe(true);
        expect(mission.contract?.client.name.trim()).toBeTruthy();
        expect(mission.contract?.client.role.trim()).toBeTruthy();
        expect(mission.contract?.flag).toMatch(/^CLUE\{[^}]+\}$/);
        expect(mission.machines?.length).toBeGreaterThan(0);
        const hosts = mission.machines!.map((machine) => machine.host);
        expect(hosts).not.toContain('hq');
        expect(new Set(hosts).size).toBe(hosts.length);
        expect(new Set(mission.contract!.allowed)).toEqual(new Set(hosts));
        expect(mission.machines!.some((machine) =>
          fileContents(machine.fs).some((text) => text.includes(mission.contract!.flag)))).toBe(true);
      });

      it('has usable steps and a reachable flag in its authored data route', () => {
        checkSteps(mission);
        checkFlagRoute(mission);
      });

      it('uses short banners and only pretend addresses', () => {
        for (const machine of mission.machines!) {
          expect(['hq', 'shop', 'bakery', 'library']).toContain(machine.color);
          expect(machine.banner.length).toBeGreaterThanOrEqual(1);
          expect(machine.banner.length).toBeLessThanOrEqual(4);
          for (const line of machine.banner) {
            expect(line.trim()).not.toBe('');
            expect(line.length).toBeLessThanOrEqual(36);
          }
          expect(new VirtualFs(machine.fs).isDir(machine.home)).toBe(true);
        }
        checkAddresses(mission);
      });

      it('checks every Line and reads at an early elementary level', () => {
        const lines = collectLines(mission);
        expect(lines.length).toBeGreaterThan(0);
        lines.forEach(checkLine);
        // Also inspect text objects so extra keys cannot hide a broken Line from collection.
        walk(mission, (value) => {
          if (value && typeof value === 'object' && 'text' in value) checkLine(value as Line);
        });
        expect(fleschKincaidGrade(lines.map((line) => line.text))).toBeLessThanOrEqual(MAX_GRADE);
      });
    });
  }

  it('supplies the specified working login data and alarms', () => {
    const [toy, note, hidden] = season1Missions as [Mission, Mission, Mission];
    expect(machineAt(toy, 'shop-pc').login).toEqual({ user: 'admin', password: 'admin' });
    expect(toy.alarm).toEqual({ limit: 5 });
    expect(machineAt(note, 'shop-pc').login).toBeUndefined();
    const till = machineAt(note, 'shop-till');
    expect(till.login).toEqual({ user: 'cashier', password: 'sunflower7' });
    const clue = new VirtualFs(machineAt(note, 'shop-pc').fs).read('/home/guest/desk/sticky-note.txt');
    expect(clue.ok).toBe(true);
    if (clue.ok) {
      expect(clue.value).toContain(till.login!.user);
      expect(clue.value).toContain(till.login!.password);
    }
    expect(note.alarm).toEqual({ limit: 5 });
    expect(machineAt(hidden, 'game-server').login).toBeUndefined();
    expect(hidden.alarm).toBeUndefined();
  });

  it('reveals the hidden folder only when all names are requested', () => {
    const machine = machineAt(season1Missions[2]!, 'game-server');
    const fs = new VirtualFs(machine.fs, machine.home);
    expect(fs.list()).toEqual({ ok: true, value: [
      { name: 'games', type: 'dir', hidden: false, locked: false },
    ] });
    const all = fs.list(undefined, { all: true });
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.value.some((entry) => entry.name === '.secret' && entry.type === 'dir')).toBe(true);
  });
});

describe('season data validation guards', () => {
  it('rejects invalid Lines, copy, commands and goal paths', () => {
    expect(() => checkLine({ text: ' ' })).toThrow();
    expect(() => checkLine({ text: 'Read flag.txt.' })).toThrow();
    expect(() => checkLine({ text: 'Type ls.', say: 'Type ls.' })).toThrow();
    expect(() => checkLine({ text: 'Hello!', extra: true } as Line)).toThrow();
    expect(() => checkLine({ text: 'We need authentication.' })).toThrow();
    const mission = season1Missions[0]!;
    const config = mission.steps[3]!.config as HackConfig;
    for (const goal of [
      { type: 'read', path: '/missing' },
      { type: 'read', path: '/home/admin' },
      { type: 'cwd', path: '/home/admin/flag.txt' },
      { type: 'on', host: 'unknown', goal: { type: 'run', command: 'ls' } },
      { type: 'run', command: 'unlock' },
    ] satisfies HackGoal[]) {
      expect(() => checkGoal(mission, config, goal, 'shop-pc')).toThrow();
    }
  });

  it('rejects a flag route with a wrong host, missing connection or locked flag', () => {
    const original = season1Missions[1]!;
    const wrongHost = structuredClone(original);
    (wrongHost.steps[3]!.config as HackConfig).showMe = 'connect shop-pc';
    expect(() => checkFlagRoute(wrongHost)).toThrow();
    const missingConnection = structuredClone(original);
    missingConnection.steps.splice(3, 1);
    expect(() => checkFlagRoute(missingConnection)).toThrow();
    const locked = structuredClone(original);
    const till = machineAt(locked, 'shop-till');
    const home = till.fs.children.home;
    if (home?.type !== 'dir') throw new Error('Missing home');
    const cashier = home.children.cashier;
    if (cashier?.type !== 'dir') throw new Error('Missing cashier');
    const flag = cashier.children['flag.txt'];
    if (flag?.type !== 'file') throw new Error('Missing flag');
    flag.locked = true;
    expect(() => checkFlagRoute(locked)).toThrow();
  });

  it('allows pretend addresses and file names but rejects other addresses', () => {
    const mission = structuredClone(season1Missions[0]!);
    mission.blurb = 'Visit shop.example and read flag.txt.';
    expect(() => checkAddresses(mission)).not.toThrow();
    for (const text of ['Visit shop.invalid.', 'Use the http protocol.', 'Visit www.shop.example.']) {
      mission.blurb = text;
      expect(() => checkAddresses(mission)).toThrow();
    }
  });
});
