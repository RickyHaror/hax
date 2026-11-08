import { describe, expect, it } from 'vitest';
import type { FsDir, FsNode, HackConfig, HackGoal, Line, Machine, Mission } from '../engine/types';
import { collectLines } from '../../scripts/checks/collect-lines';
import { lineProblems } from '../../scripts/checks/readability';
import { missions } from './index';
import { s1m4PageSource } from './s1-m4-page-source';
import { buildVisitsLog, s1m5LogSearch } from './s1-m5-log-search';
import { s1m6WeakPassword } from './s1-m6-weak-password';

const part2 = [s1m4PageSource, s1m5LogSearch, s1m6WeakPassword];
const expected = [
  { id: 's1-m4-page-source', bit: 19, previous: 's1-m3-hidden-folder',
    hosts: ['bakery-web'], flag: 'CLUE{page-source-is-public}', teaches: ['view-source'], limit: 5 },
  { id: 's1-m5-log-search', bit: 20, previous: 's1-m4-page-source',
    hosts: ['log-server'], flag: 'CLUE{grep-finds-the-needle}', teaches: ['grep'], limit: undefined },
  { id: 's1-m6-weak-password', bit: 21, previous: 's1-m5-log-search',
    hosts: ['shop-pc', 'door-lock'], flag: 'CLUE{pets-make-weak-passwords}', teaches: ['unlock'], limit: 6 },
];

function visitValues(value: unknown, visit: (value: unknown) => void): void {
  visit(value);
  if (Array.isArray(value)) value.forEach((child) => visitValues(child, visit));
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((child) => visitValues(child, visit));
  }
}

function strings(value: unknown): string[] {
  const found: string[] = [];
  visitValues(value, (child) => {
    if (typeof child === 'string') found.push(child);
  });
  return found;
}

function resolvePath(fs: FsDir, path: string): FsNode | undefined {
  if (!path.startsWith('/')) return undefined;
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  let node: FsNode = fs;
  for (const part of parts) {
    if (node.type !== 'dir' || !Object.hasOwn(node.children, part)) return undefined;
    node = node.children[part]!;
  }
  return node;
}

function machineFor(mission: Mission, host: string): Machine {
  const machine = mission.machines?.find((entry) => entry.host === host);
  expect(machine, host).toBeDefined();
  return machine!;
}

function fileText(mission: Mission, host: string, path: string): string {
  const node = resolvePath(machineFor(mission, host).fs, path);
  expect(node?.type, path).toBe('file');
  if (node?.type !== 'file') throw new Error(`Missing file: ${path}`);
  return node.content;
}

function checkLine(line: Line): void {
  expect(line.text.trim(), line.text).not.toBe('');
  expect(Object.keys(line).every((key) => ['text', 'say', 'speaker'].includes(key))).toBe(true);
  expect(line.say, line.text).not.toBe(line.text);
  if (/\b(?:ls|cd|pwd)\b/i.test(line.text) || /[\w-]+\.[\w-]+|\.[\w-]+/.test(line.text)) {
    expect(typeof line.say, line.text).toBe('string');
    expect(line.say?.trim(), line.text).toBeTruthy();
  }
  expect(lineProblems(line.text), line.text).toEqual([]);
}

function checkGoal(goal: HackGoal, config: HackConfig, mission: Mission, host: string): void {
  if ('host' in goal) machineFor(mission, goal.host);
  if (goal.type === 'on') {
    checkGoal(goal.goal, config, mission, goal.host);
  } else if (goal.type === 'all') {
    goal.goals.forEach((child) => checkGoal(child, config, mission, host));
  } else if (goal.type === 'run') {
    expect(config.commands).toContain(goal.command);
  } else if (goal.type === 'read' || goal.type === 'cwd') {
    const machine = machineFor(mission, host);
    expect(config.commands).toContain(goal.type === 'read' ? 'cat' : 'cd');
    expect(resolvePath(machine.fs, goal.path)?.type, `${host}:${goal.path}`)
      .toBe(goal.type === 'read' ? 'file' : 'dir');
  }
}

/** Rejoin commands spelled out with punctuation names for early readers. */
function typedHint(text: string): string {
  return text.replace(/^Type /, '')
    .replace(/(?: and press Enter|\. Press Enter)\.$/, '')
    .replace(/\. Add /g, '')
    .replace(/, open brace/g, '{')
    .replace(/\. Close brace/g, '}')
    .replace(/, dash, /g, '-')
    .replace(/, dot, /g, '.');
}

function checkHackSteps(mission: Mission): void {
  let host = 'hq';
  expect(mission.steps.length).toBeGreaterThan(0);
  for (const [index, step] of mission.steps.entries()) {
    expect(step.config.kind, step.id).toBe('hack');
    if (step.config.kind !== 'hack') throw new Error('Expected a hack step');
    const config = step.config;
    if (index === 0) expect(config.start).toBe('hq');
    host = config.start ?? host;
    expect(step.hints, step.id).toHaveLength(3);
    expect(typedHint(step.hints[2].text).split('. Then enter ')[0], step.id).toBe(config.showMe);
    expect(config.chips?.length, step.id).toBeGreaterThanOrEqual(1);
    expect(config.chips?.length, step.id).toBeLessThanOrEqual(3);
    for (const chip of config.chips ?? []) {
      expect(config.commands, chip.command).toContain(chip.command.trim().split(/\s+/)[0]);
      expect(chip.hint?.trim(), chip.command).toBeTruthy();
    }
    expect(config.commands, config.showMe).toContain(config.showMe.trim().split(/\s+/)[0]);
    checkGoal(config.goal, config, mission, host);
    if ('host' in config.goal) host = config.goal.host;
  }
  const last = mission.steps.at(-1)!.config;
  if (last.kind !== 'hack') throw new Error('Expected a final hack step');
  expect(last.goal).toEqual({ type: 'flag' });
  expect(last.showMe).toBe(`submit ${mission.contract?.flag}`);
  expect(last.commands).toContain('submit');
}

function fileNames(mission: Mission): Set<string> {
  const names = new Set<string>();
  visitValues(mission.machines, (value) => {
    if (value && typeof value === 'object' && 'type' in value && value.type === 'dir'
      && 'children' in value) {
      Object.keys(value.children as Record<string, unknown>).forEach((name) => names.add(name));
    }
  });
  return names;
}

function checkAddresses(mission: Mission): void {
  const names = fileNames(mission);
  for (const value of strings(mission)) {
    expect(value, 'No web links or numeric addresses').not.toMatch(/http|www\.|\b(?:\d{1,3}\.){3}\d{1,3}\b/i);
    for (const match of value.matchAll(/(?:[\w.+-]+@)?[\w-]+(?:\.[\w-]+)+/g)) {
      const address = match[0];
      if (names.has(address)) continue;
      expect(address, value).toMatch(/\.example$/);
    }
  }
}

describe('Season 1 missions 4 to 6', () => {
  it('has unique ids, bits and orders with no registry clashes', () => {
    const combined = [...missions, ...part2];
    for (const field of ['id', 'bit', 'order'] as const) {
      expect(new Set(combined.map((mission) => mission[field])).size).toBe(combined.length);
    }
  });

  for (const [index, mission] of part2.entries()) {
    describe(mission.id, () => {
      it('uses the specified metadata, contract, alarm and toolkit', () => {
        const row = expected[index]!;
        expect(mission).toMatchObject({
          id: row.id, bit: row.bit, order: row.bit, chapter: 'season', season: 's1',
          xp: 20, minutes: 10, requires: [row.previous], teaches: row.teaches,
          badge: { id: row.id, art: 'badge-s1' },
        });
        expect(mission.alarm).toEqual(row.limit === undefined ? undefined : { limit: row.limit });
        expect(mission.contract?.flag).toBe(row.flag);
        expect(mission.contract?.client.name.trim()).toBeTruthy();
        expect(mission.contract?.client.role.trim()).toBeTruthy();
        expect(mission.contract?.problem.text.trim()).toBeTruthy();
        expect(mission.contract?.goal.text.trim()).toBeTruthy();
        const hosts = mission.machines!.map((machine) => machine.host);
        expect(hosts).toEqual(row.hosts);
        expect(new Set(hosts).size).toBe(hosts.length);
        expect(new Set(mission.contract?.allowed)).toEqual(new Set(hosts));
        expect(hosts).not.toContain('hq');
        expect(mission.intro.some((line) =>
          /only hack.*own.*permission to hack/.test(line.text))).toBe(true);
      });

      it('places its flag in a file and uses valid homes and banners', () => {
        const contents: string[] = [];
        for (const machine of mission.machines!) {
          expect(resolvePath(machine.fs, machine.home)?.type, machine.host).toBe('dir');
          expect(['hq', 'shop', 'bakery', 'library']).toContain(machine.color);
          expect(machine.banner.length).toBeGreaterThanOrEqual(1);
          expect(machine.banner.length).toBeLessThanOrEqual(4);
          machine.banner.forEach((line) => {
            expect(line.trim()).not.toBe('');
            expect(line.length).toBeLessThanOrEqual(36);
          });
          visitValues(machine.fs, (node) => {
            if (node && typeof node === 'object' && 'type' in node && node.type === 'file'
              && 'content' in node && typeof node.content === 'string') contents.push(node.content);
          });
        }
        expect(contents.some((content) => content.includes(mission.contract!.flag))).toBe(true);
      });

      it('has usable commands, hint ladders and goals on the right machines', () => {
        checkHackSteps(mission);
      });

      it('keeps all Lines readable with distinct spoken commands and file names', () => {
        const lines = collectLines(mission);
        const rawLines: unknown[] = [];
        visitValues(mission, (value) => {
          if (value && typeof value === 'object' && 'text' in value
            && typeof value.text === 'string') rawLines.push(value);
        });
        expect(lines.length).toBeGreaterThan(0);
        expect(lines).toEqual(rawLines);
        lines.forEach(checkLine);
      });

      it('uses only pretend addresses in every string', () => {
        checkAddresses(mission);
      });
    });
  }

  it('puts the bakery password in a public HTML comment', () => {
    const bakery = machineFor(s1m4PageSource, 'bakery-web');
    expect(bakery).toMatchObject({
      owner: 'Sunny Bakery', color: 'bakery', user: 'admin', home: '/home/admin',
      login: { user: 'admin', password: 'cupcake42' },
    });
    expect(bakery.pages).toHaveLength(1);
    const page = bakery.pages![0]!;
    expect(page.address).toBe('sunny-bakery.example');
    expect(page.source.length).toBeGreaterThanOrEqual(8);
    expect(page.source.length).toBeLessThanOrEqual(12);
    expect(page.source).toContain(`<!-- admin password: ${bakery.login!.password} -->`);
    expect(s1m4PageSource.steps[0]!.config).toMatchObject({
      goal: { type: 'run', command: 'view-source', args: [page.address] },
    });
    expect(s1m4PageSource.steps[1]!.config).toMatchObject({
      goal: { type: 'logged-in', host: 'bakery-web' },
    });
  });

  it('builds the same large log with exactly one flag and a few oops lines', () => {
    const log = fileText(s1m5LogSearch, 'log-server', '/var/log/visits.log');
    expect(machineFor(s1m5LogSearch, 'log-server')).toMatchObject({
      owner: 'Corner Town Library', color: 'library', user: 'helper', home: '/home/helper',
    });
    expect(machineFor(s1m5LogSearch, 'log-server').login).toBeUndefined();
    expect(buildVisitsLog()).toBe(buildVisitsLog());
    expect(log).toBe(buildVisitsLog());
    const lines = log.split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(1500);
    expect(lines).toHaveLength(2000);
    expect(lines.filter((line) => line.includes(s1m5LogSearch.contract!.flag))).toHaveLength(1);
    expect(lines.filter((line) => line.includes('CLUE'))).toHaveLength(1);
    const bumps = lines.filter((line) => line.includes('oops'));
    expect(bumps.length).toBeGreaterThan(1);
    expect(bumps.length).toBeLessThanOrEqual(6);
    const goals = s1m5LogSearch.steps.map((step) => step.config.kind === 'hack' && step.config.goal);
    expect(goals).toEqual([
      { type: 'connected', host: 'log-server' },
      { type: 'on', host: 'log-server', goal: { type: 'run', command: 'ls', args: ['/var/log'] } },
      { type: 'on', host: 'log-server', goal: { type: 'run', command: 'grep', args: ['oops', '/var/log/visits.log'] } },
      { type: 'on', host: 'log-server', goal: { type: 'run', command: 'grep', args: ['CLUE', '/var/log/visits.log'] } },
      { type: 'flag' },
    ]);
  });

  it('makes Sam’s dog and birthday match the door password', () => {
    const clue = fileText(s1m6WeakPassword, 'shop-pc', '/home/guest/fan-page.txt');
    const shop = machineFor(s1m6WeakPassword, 'shop-pc');
    const door = machineFor(s1m6WeakPassword, 'door-lock');
    expect(shop).toMatchObject({ owner: 'Corner Shop', color: 'shop', user: 'guest', home: '/home/guest' });
    expect(shop.login).toBeUndefined();
    expect(clue).toContain('Sam’s dog is named Biscuit.');
    expect(clue).toContain('Sam’s birthday is May 12.');
    expect(door).toMatchObject({ owner: 'Corner Shop', color: 'shop', user: 'sam', home: '/home/sam' });
    expect(door.login).toEqual({
      user: 'sam', password: `${'Biscuit'.toLowerCase()}${5}${12}`,
      accept: ['Biscuit512', 'biscuit0512'],
    });
    expect(s1m6WeakPassword.steps[2]!.config).toMatchObject({
      goal: { type: 'logged-in', host: 'door-lock' },
    });
    expect(s1m6WeakPassword.steps[3]!.config).toMatchObject({
      goal: { type: 'on', host: 'door-lock', goal: { type: 'run', command: 'unlock' } },
    });
  });
});
