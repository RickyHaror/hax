import { describe, expect, it } from 'vitest';
import { VirtualFs } from '../engine/fs';
import type { Machine, Mission } from '../engine/types';
import { s1m4PageSource } from './s1-m4-page-source';
import { buildVisitsLog, s1m5LogSearch } from './s1-m5-log-search';
import { s1m6WeakPassword } from './s1-m6-weak-password';

const part2 = [s1m4PageSource, s1m5LogSearch, s1m6WeakPassword];
const expected = [
  { hosts: ['bakery-web'], flag: 'CLUE{page-source-is-public}', teaches: ['view-source'], limit: 5 },
  { hosts: ['log-server'], flag: 'CLUE{grep-finds-the-needle}', teaches: ['grep'], limit: undefined },
  { hosts: ['shop-pc', 'door-lock'], flag: 'CLUE{pets-make-weak-passwords}', teaches: ['unlock'], limit: 6 },
];

function machineFor(mission: Mission, host: string): Machine {
  const machine = mission.machines?.find((entry) => entry.host === host);
  expect(machine, host).toBeDefined();
  return machine!;
}

function fileText(mission: Mission, host: string, path: string): string {
  const result = new VirtualFs(machineFor(mission, host).fs).read(path);
  expect(result.ok, path).toBe(true);
  if (!result.ok) throw new Error(`Missing file: ${path}`);
  return result.value;
}

describe('Season 1 missions 4 to 6', () => {
  for (const [index, mission] of part2.entries()) {
    it(`uses the specified contract, alarm and toolkit for ${mission.id}`, () => {
      const row = expected[index]!;
      expect(mission.teaches).toEqual(row.teaches);
      expect(mission.alarm).toEqual(row.limit === undefined ? undefined : { limit: row.limit });
      expect(mission.contract?.flag).toBe(row.flag);
      expect(mission.machines!.map((machine) => machine.host)).toEqual(row.hosts);
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
