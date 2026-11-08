import { describe, expect, it } from 'vitest';
import { HackSession, hackGoalMet } from './hack';
import type { HackGoal, TerminalGoal } from './types';
import { connected, mission, run } from './hack-test-data';

describe('all goal variants', () => {
  it.each([
    { type: 'connected', host: 'absent' }, { type: 'logged-in', host: 'absent' },
    { type: 'root', host: 'absent' }, { type: 'found-port', host: 'shop-pc', port: 22 },
    { type: 'decoded', text: 'Hello' }, { type: 'reported', host: 'shop-pc', mailId: '2' },
    { type: 'passwd', host: 'shop-pc' }, { type: 'chmod', host: 'shop-pc', path: '~/note', mode: '600' },
    { type: 'flag' }, { type: 'read', path: '~/note' }, { type: 'deleted', path: '~/note' },
    { type: 'run', command: 'ls' }, { type: 'on', host: 'absent', goal: { type: 'cwd', path: '~' } },
  ] satisfies HackGoal[])('starts unmet for $type', (goal) => {
    expect(hackGoalMet(goal, connected())).toBe(false);
  });

  it('uses current machine for plain goals and named machine for on goals', () => {
    const session = connected();
    run(session, 'cat note');
    run(session, 'lock note');
    run(session, 'rm blank');
    const goals: TerminalGoal[] = [
      { type: 'read', path: '~/note' }, { type: 'locked', path: '~/note' },
      { type: 'deleted', path: '~/blank' }, { type: 'cwd', path: '~' },
      { type: 'run', command: 'CAT', args: ['~/note'] },
    ];
    for (const goal of goals) expect(hackGoalMet(goal, session)).toBe(true);
    const onGoal: HackGoal = { type: 'on', host: 'shop-pc', goal: { type: 'all', goals } };
    expect(hackGoalMet(onGoal, session)).toBe(true);
    run(session, 'connect bakery-pc');
    for (const goal of goals.filter((goal) => goal.type !== 'cwd')) {
      expect(hackGoalMet(goal, session)).toBe(false);
    }
    expect(hackGoalMet(onGoal, session)).toBe(true);
  });

  it('matches paths using machine home and each run cwd', () => {
    const session = connected();
    run(session, 'cd docs');
    run(session, 'cat note');
    run(session, 'ls -al ~');
    run(session, 'cd /');
    for (const args of [['docs/note'], ['/home/admin/docs/note'], ['~/docs/note']]) {
      expect(hackGoalMet({ type: 'run', command: 'cat', args }, session)).toBe(true);
    }
    expect(hackGoalMet({ type: 'run', command: 'cat', args: ['~/note'] }, session)).toBe(false);
    expect(hackGoalMet({ type: 'run', command: 'ls', args: ['-la', '~'] }, session)).toBe(true);
    expect(hackGoalMet({ type: 'run', command: 'ls', args: ['-z', '~'] }, session)).toBe(false);
  });

  it('does not earn run or file evidence from rejected commands', () => {
    const session = connected();
    run(session, 'cat note extra');
    run(session, 'cat missing');
    run(session, 'ls -az');
    for (const goal of [
      { type: 'run', command: 'cat' }, { type: 'read', path: '~/note' },
      { type: 'run', command: 'ls' }, { type: 'deleted', path: '~/missing' },
    ] satisfies HackGoal[]) expect(hackGoalMet(goal, session)).toBe(false);
  });

  it('requires every goal in nested all and keeps evidence after leaving', () => {
    const session = connected();
    const goal: HackGoal = { type: 'all', goals: [
      { type: 'on', host: 'shop-pc', goal: { type: 'read', path: '~/note' } },
      { type: 'all', goals: [{ type: 'decoded', text: 'Hello' }, { type: 'flag' }] },
    ] };
    expect(hackGoalMet({ type: 'all', goals: [] }, session)).toBe(true);
    expect(hackGoalMet(goal, session)).toBe(false);
    run(session, 'cat note');
    run(session, 'decode SGVsbG8=');
    expect(hackGoalMet(goal, session)).toBe(false);
    run(session, 'submit clue');
    run(session, 'exit');
    expect(hackGoalMet(goal, session)).toBe(true);
    expect(hackGoalMet({ type: 'on', host: 'bakery-pc', goal: { type: 'read', path: '~/note' } }, session)).toBe(false);
  });

  it('checks current file mode and presence as well as earned chmod evidence', () => {
    const session = connected();
    const goal: HackGoal = { type: 'chmod', host: 'shop-pc', path: '~/note', mode: '600' };
    run(session, 'chmod 600 note');
    expect(hackGoalMet(goal, session)).toBe(true);
    run(session, 'rm note');
    expect(hackGoalMet(goal, session)).toBe(false);
    expect(hackGoalMet({ ...goal, host: 'absent' }, session)).toBe(false);
  });

  it('treats HQ as logged in without a login command', () => {
    const session = new HackSession(mission());
    expect(hackGoalMet({ type: 'connected', host: 'hq' }, session)).toBe(true);
    expect(hackGoalMet({ type: 'logged-in', host: 'hq' }, session)).toBe(true);
    expect(hackGoalMet({ type: 'root', host: 'hq' }, session)).toBe(false);
  });
});
