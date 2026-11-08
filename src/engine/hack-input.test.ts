import { describe, expect, it } from 'vitest';
import { HackSession, hackGoalMet } from './hack';
import { connected, mission, run, target, text } from './hack-test-data';

function withLogin(limit?: number): HackSession {
  return new HackSession(mission({ machines: [target({ login: {
    user: 'admin', password: 'login-code', accept: ['other spelling'],
  } })], alarm: limit === undefined ? undefined : { limit } }));
}

function login(session: HackSession, password = 'login-code', user = 'admin') {
  run(session, 'connect shop-pc');
  run(session, user);
  return run(session, password);
}

describe('prompted login and input secrecy', () => {
  it('connects only after the user and password, and never logs answers', () => {
    const session = withLogin();
    expect(run(session, 'connect shop-pc').lines[0]?.text).toBe('User name:');
    expect(session.prompt().host).toBe('hq');
    expect(session.pendingInput()).toEqual({ label: 'User name:', secret: false });
    run(session, 'admin');
    expect(session.pendingInput()).toEqual({ label: 'Password:', secret: true });
    const before = session.events;
    const result = session.run('login-code', []);
    expect(session.prompt()).toMatchObject({ user: 'admin', host: 'shop-pc' });
    expect(session.pendingInput()).toBeNull();
    expect(session.events).toEqual(before);
    expect(JSON.stringify([session.events, result])).not.toContain('login-code');
    expect(hackGoalMet({ type: 'logged-in', host: 'shop-pc' }, session)).toBe(true);
    run(session, 'exit');
    run(session, 'connect shop-pc');
    expect(session.pendingInput()).toBeNull();
  });

  it('accepts password aliases without changing the canonical spelling', () => {
    const session = withLogin();
    expect(login(session, 'OTHER SPELLING').lines[0]?.kind).toBe('out');
    expect(session.prompt().host).toBe('shop-pc');
  });

  it('treats all prompted answers as data, even commands or quotes', () => {
    const session = withLogin();
    run(session, 'connect shop-pc');
    run(session, 'sudo rm clue');
    const before = session.events;
    const result = run(session, "cat '");
    expect(result.lines[0]?.kind).toBe('hint');
    expect(session.events).toEqual(before);
    expect(session.machineState('shop-pc')!.fs.exists('clue')).toBe(true);
    expect(session.pendingInput()).toBeNull();
    expect(login(session).lines[0]?.kind).toBe('out');
    expect(text(session, 'login')).toEqual(['User name:']);
    run(session, 'admin');
    expect(run(session, 'login-code').lines[0]?.kind).toBe('out');
  });

  it('asks for login when the first hack step starts on a protected host', () => {
    const data = mission({ machines: [target({ login: { user: 'admin', password: 'login-code' } })] });
    data.steps = [{ id: 'start', title: 'Start', lines: [], success: [],
      hints: [{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }],
      config: { kind: 'hack', start: 'shop-pc', commands: ['login'], showMe: 'login',
        goal: { type: 'logged-in', host: 'shop-pc' } } }];
    const session = new HackSession(data);
    expect(session.pendingInput()?.secret).toBe(false);
    run(session, 'admin');
    run(session, 'login-code');
    expect(session.prompt().host).toBe('shop-pc');
  });
});

describe('sudo', () => {
  it('prompts once, runs the held command and keeps root per machine', () => {
    const session = connected();
    expect(text(session, 'sudo pwd')).toEqual(['Password:']);
    expect(session.prompt().root).toBe(false);
    const result = run(session, 'root-code');
    expect(result.lines.map((line) => line.text)).toContain('/home/admin');
    expect(JSON.stringify([result, session.events])).not.toContain('root-code');
    expect(session.prompt()).toMatchObject({ user: 'root', host: 'shop-pc', root: true });
    expect(text(session, 'whoami')).toEqual(['root']);
    expect(hackGoalMet({ type: 'root', host: 'shop-pc' }, session)).toBe(true);
    expect(hackGoalMet({ type: 'run', command: 'sudo', args: ['pwd'] }, session)).toBe(true);
    expect(text(session, 'sudo cat "my \'best\' note"')[0]).toMatch(/Try/u);
    expect(text(session, 'sudo cat \'my "best" note\'')).toEqual(['A quoted note']);
    expect(session.pendingInput()).toBeNull();
    run(session, 'connect bakery-pc');
    expect(session.prompt().root).toBe(false);
    run(session, 'exit');
    expect(session.prompt().root).toBe(true);
  });

  it('records sudo on its source machine before navigation', () => {
    const session = connected();
    run(session, 'sudo cd docs');
    run(session, 'root-code');
    expect(session.events.find((event) => event.type === 'run' && event.command === 'sudo'))
      .toMatchObject({ host: 'shop-pc', cwd: '/home/admin', ok: true });
    run(session, 'sudo connect bakery-pc');
    expect(session.prompt().host).toBe('bakery-pc');
    expect(session.events.at(-1)).toMatchObject({ type: 'run', command: 'sudo', host: 'shop-pc',
      cwd: '/home/admin/docs', ok: true });
  });

  it('honours aliases and gates nested commands before asking for secrets', () => {
    const session = connected();
    expect(session.run('sudo rm note', ['sudo', 'pwd']).lines[0]?.text)
      .toBe('You will learn that one soon!');
    expect(session.pendingInput()).toBeNull();
    expect(run(session, 'sudo typo').lines[0]?.text).toMatch(/^Did you mean/u);
    run(session, 'sudo pwd');
    run(session, 'ROOT ALIAS');
    expect(session.prompt().root).toBe(true);
    const noSudo = connected({ machines: [target({ sudo: undefined })] });
    expect(run(noSudo, 'sudo pwd').lines[0]?.kind).toBe('hint');
  });

  it('checks the new step allowlist before running a held command', () => {
    const session = connected();
    run(session, 'sudo rm note');
    const result = session.run('root-code', ['sudo', 'pwd']);
    expect(result.lines.at(-1)?.text).toBe('You will learn that one soon!');
    expect(session.machineState()!.fs.exists('note')).toBe(true);
    expect(session.prompt().root).toBe(true);
  });
});

describe('alarm raises and calm reset', () => {
  it('counts wrong passwords, resets the stack and keeps files and earned access', () => {
    const session = withLogin(2);
    expect(login(session, 'wrong').alarm).toBe('raised');
    expect(session.alarmCount).toBe(1);
    expect(hackGoalMet({ type: 'logged-in', host: 'shop-pc' }, session)).toBe(false);
    login(session);
    run(session, 'rm blank');
    run(session, 'sudo pwd');
    run(session, 'root-code');
    run(session, 'unlock vault');
    const result = run(session, 'wrong again');
    expect(result.alarm).toBe('tripped');
    expect(result.lines.map((line) => line.text)).toContain('HQ pulled you out. Your work is safe.');
    expect(session.alarmCount).toBe(0);
    expect(session.prompt().host).toBe('hq');
    expect(session.pendingInput()).toBeNull();
    expect(session.machineState('shop-pc')!.fs.exists('blank')).toBe(false);
    expect(session.machineState('shop-pc')).toMatchObject({ root: true, loggedIn: true });
    expect(text(session, 'exit')).toEqual(['You are already at HQ.']);
    run(session, 'connect shop-pc');
    expect(session.pendingInput()).toBeNull();
  });

  it('raises for sudo, and starts a fresh count after a trip', () => {
    const session = connected({ alarm: { limit: 1 } });
    run(session, 'sudo pwd');
    expect(run(session, 'wrong').alarm).toBe('tripped');
    expect(session.prompt().host).toBe('hq');
    run(session, 'connect shop-pc');
    run(session, 'sudo pwd');
    expect(run(session, 'wrong again').alarm).toBe('tripped');
    expect(session.alarmCount).toBe(0);
  });

  it('has no alarm when the mission does not define one', () => {
    const session = withLogin();
    expect(login(session, 'wrong').alarm).toBeUndefined();
    expect(session.alarmCount).toBe(0);
    expect(session.prompt().host).toBe('hq');
  });
});

describe('unlock and passphrase changes', () => {
  it('unlocks with the login password, using sudo only without login', () => {
    const session = withLogin();
    login(session);
    run(session, 'unlock vault');
    expect(run(session, 'root-code').lines[0]?.kind).toBe('hint');
    expect(session.machineState()!.fs.isLocked('vault')).toBe(true);
    run(session, 'unlock vault');
    const result = run(session, 'login-code');
    expect(JSON.stringify([result, session.events])).not.toContain('login-code');
    expect(text(session, 'cat vault')).toEqual(['A quiet clue']);
    const noLogin = connected();
    run(noLogin, 'unlock vault');
    run(noLogin, 'root-code');
    expect(noLogin.machineState()!.fs.isLocked('vault')).toBe(false);
    expect(run(noLogin, 'unlock vault').lines[0]?.kind).toBe('hint');
    const noPassword = connected({ machines: [target({ sudo: undefined })] });
    expect(run(noPassword, 'unlock vault').lines[0]?.kind).toBe('hint');
    expect(noPassword.pendingInput()).toBeNull();
  });

  it.each(['short', 'one-two-three', 'three long words', 'longword--anotherword',
    'longword-anotherword', '123456-234567-345678', 'longword-otherword-last-'])('nudges weak %s', (value) => {
    const session = connected();
    run(session, 'passwd');
    expect(session.pendingInput()?.secret).toBe(true);
    expect(run(session, value).lines[0]?.kind).toBe('hint');
    expect(session.pendingInput()).toBeNull();
    expect(hackGoalMet({ type: 'passwd', host: 'shop-pc' }, session)).toBe(false);
  });

  it('requires matching strong answers, stores no answer evidence, and updates login and unlock', () => {
    const session = withLogin(2);
    login(session);
    run(session, 'passwd');
    run(session, 'bright-green-trees');
    expect(session.pendingInput()).toEqual({ label: 'Type it once more:', secret: true });
    expect(run(session, 'bright-green-tree').lines[0]?.kind).toBe('hint');
    expect(hackGoalMet({ type: 'passwd', host: 'shop-pc' }, session)).toBe(false);
    run(session, 'passwd');
    run(session, 'bright-green-trees');
    const result = run(session, 'bright-green-trees');
    expect(hackGoalMet({ type: 'passwd', host: 'shop-pc' }, session)).toBe(true);
    expect(JSON.stringify([session.events, result])).not.toContain('bright-green-trees');
    run(session, 'login');
    run(session, 'admin');
    expect(run(session, 'login-code').alarm).toBe('raised');
    run(session, 'login');
    run(session, 'admin');
    expect(run(session, 'bright-green-trees').lines[0]?.kind).toBe('out');
    run(session, 'unlock vault');
    run(session, 'bright-green-trees');
    expect(session.machineState()!.fs.isLocked('vault')).toBe(false);
    expect(session.alarmCount).toBe(1);
  });
});
