import { describe, expect, it } from 'vitest';
import { HackSession, HACK_COMMANDS, hackGoalMet } from './hack';
import { connected, mission, run, target, text } from './hack-test-data';

describe('session construction and isolation', () => {
  it('adds HQ with its own home and hides it from scan', () => {
    const session = new HackSession(mission());
    expect(session.prompt()).toEqual({ user: 'agent', host: 'hq', path: '~', root: false });
    expect(session.machineState()?.fs.cwd()).toBe('/home/agent');
    expect(text(session, 'scan')).toContain('shop-pc: Corner Shop');
    expect(text(session, 'scan').join(' ')).not.toContain('hq');
  });

  it('keeps supplied HQ data and starts only the first hack step', () => {
    const data = mission({ machines: [target({ host: 'hq', user: 'captain', listed: false })] });
    expect(new HackSession(data).prompt().user).toBe('captain');
    const step = (start: string) => ({ id: start, title: 'Visit a shop', lines: [], success: [],
      hints: [{ text: 'Look.' }, { text: 'Try.' }, { text: 'Go.' }] as const,
      config: { kind: 'hack' as const, start, commands: ['ls'], showMe: 'ls',
        goal: { type: 'connected' as const, host: start } } });
    const session = new HackSession(mission({ steps: [step('shop-pc'), step('bakery-pc')] }));
    expect(session.prompt().host).toBe('shop-pc');
    run(session, 'cd docs');
    expect(session.prompt().path).toBe('~/docs');
    run(session, 'cd');
    expect(session.prompt().path).toBe('~');
    expect(session.machineState()?.fs.resolve('~')).toBe('/home/admin');
  });

  it('does not mutate mission data or share machines, sessions or event snapshots', () => {
    const data = mission();
    const original = structuredClone(data);
    const first = new HackSession(data);
    const second = new HackSession(data);
    run(first, 'connect shop-pc');
    run(first, 'rm note');
    run(first, 'connect bakery-pc');
    expect(first.machineState()?.fs.exists('note')).toBe(true);
    expect(second.prompt().host).toBe('hq');
    expect(second.machineState('shop-pc')?.fs.exists('note')).toBe(true);
    const events = first.events;
    events[0]!.host = 'changed';
    expect(first.events[0]?.host).toBe('hq');
    data.contract!.allowed.length = 0;
    expect(run(first, 'connect shop-pc').lines[0]?.kind).toBe('out');
    expect(original.machines).toEqual(data.machines);
  });
});

describe('permissions, scope and stack', () => {
  it.each(HACK_COMMANDS)('gates known but unavailable %s', (command) => {
    const session = connected();
    expect(session.run(command, []).lines).toEqual([
      { kind: 'hint', text: 'You will learn that one soon!' },
    ]);
    expect(session.pendingInput()).toBeNull();
  });

  it('uses allowed command names, host suggestions and exact scope wording', () => {
    const session = connected({ alarm: { limit: 2 } });
    expect(session.run('sl', ['ls -a']).lines[0]?.text).toBe('Did you mean ls?');
    expect(text(session, 'connect shop-p')).toEqual(['Did you mean shop-pc?']);
    expect(text(session, 'connect school-pc')).toEqual([
      'That computer is not yours. Only touch what you are allowed to.',
    ]);
    expect(session.prompt().host).toBe('shop-pc');
    expect(session.alarmCount).toBe(0);
    expect(text(session, 'connect __proto__')[0]).toMatch(/^Did you mean/u);
  });

  it('returns one machine at a time and retains each current folder', () => {
    const session = connected();
    run(session, 'cd docs');
    run(session, 'connect bakery-pc');
    expect(session.prompt().path).toBe('~');
    run(session, 'exit');
    expect(session.prompt()).toMatchObject({ host: 'shop-pc', path: '~/docs' });
    run(session, 'exit');
    expect(session.prompt().host).toBe('hq');
    expect(text(session, 'exit')).toEqual(['You are already at HQ.']);
    expect(hackGoalMet({ type: 'connected', host: 'shop-pc' }, session)).toBe(false);
  });
});

describe('all commands reject wrong arguments without effects', () => {
  it.each([
    'ls one two', 'cd one two', 'cat', 'pwd extra', 'help extra', 'clear extra',
    'lock', 'rm', 'whoami extra', 'connect', 'login extra', 'exit extra', 'scan one two',
    'sudo', 'sudo sudo pwd', 'grep word', 'view-source', 'decode', 'mail one two',
    'report', 'passwd extra', 'chmod 600', 'unlock', 'open extra', 'submit',
    'cat ""', 'ls -z', 'cd -a', 'cat note extra', 'sudo rm note extra',
  ])('gives a hint for %s', (input) => {
    const session = connected();
    const before = session.machineState()!.fs.snapshot();
    const result = run(session, input);
    expect(result.lines.some((line) => line.kind === 'hint')).toBe(true);
    expect(session.pendingInput()).toBeNull();
    expect(session.machineState()!.fs.snapshot()).toEqual(before);
    expect(hackGoalMet({ type: 'run', command: input.split(' ')[0]! }, session)).toBe(false);
  });
});

describe('never stuck and short output', () => {
  it.each(['', ' \n\t', "cat '", '__proto__', 'constructor', 'toString', '\0', '🐱',
    'x'.repeat(10000), 'decode %%%', 'grep "[" note', 'connect ""'])('handles %j', (input) => {
    const session = connected();
    expect(() => run(session, input)).not.toThrow();
    expect(run(session, 'pwd').lines).toHaveLength(1);
  });

  it('keeps all output lines within twelve words', () => {
    const session = connected();
    const inputs = ['help', 'open', 'scan', 'scan shop-pc', 'ls -al', 'cat note',
      'grep hello note', 'mail', 'mail 2', 'report 1', 'report 2', 'decode ???',
      'connect school-pc', 'connect unknown', 'view-source shop.example/staff', 'chmod 999 note'];
    for (const input of inputs) {
      for (const line of run(session, input).lines) {
        expect(line.text.trim().split(/\s+/u).filter(Boolean).length).toBeLessThanOrEqual(12);
        expect(line.text).not.toMatch(/[\u2013\u2014]| - /u);
      }
    }
  });
});
