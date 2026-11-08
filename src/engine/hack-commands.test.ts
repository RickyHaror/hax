import { describe, expect, it } from 'vitest';
import { HackSession, hackGoalMet } from './hack';
import { connected, mission, run, target, text } from './hack-test-data';

describe('existing shell commands on machines', () => {
  it('lists visible, hidden and long entries including changed modes', () => {
    const session = connected();
    expect(text(session, 'ls')).not.toContain('.hidden');
    expect(text(session, 'ls -a')).toContain('.hidden');
    expect(text(session, 'ls -l')).toContain('644 note');
    expect(text(session, 'ls -al')).toContain('644 .hidden');
    expect(text(session, 'ls -al')).toContain('dir docs/');
    run(session, 'chmod 600 .hidden');
    expect(text(session, 'ls -al')).toContain('600 .hidden');
    expect(text(session, 'ls docs')).toEqual(['note']);
    expect(text(session, 'ls missing')[0]).toMatch(/Try/u);
    expect(text(session, 'ls -l note')[0]).toMatch(/Try/u);
  });

  it('navigates, reads, prints cwd, clears and identifies the user', () => {
    const session = connected();
    expect(text(session, 'whoami')).toEqual(['admin']);
    expect(text(session, 'pwd')).toEqual(['/home/admin']);
    expect(text(session, 'cat note')).toEqual(['Hello agent', 'A clue', 'HELLO again']);
    expect(text(session, 'cat blank')).toEqual(['']);
    run(session, 'cd docs');
    expect(text(session, 'cat ~/note')).toContain('A clue');
    expect(text(session, 'pwd')).toEqual(['/home/admin/docs']);
    run(session, 'cd ~');
    expect(session.prompt().path).toBe('~');
    const events = session.events.length;
    expect(run(session, 'clear')).toMatchObject({ clear: true, lines: [] });
    expect(session.events.length).toBe(events + 1);
  });

  it('locks and removes only readable files, recording evidence', () => {
    const session = connected();
    run(session, 'lock note');
    expect(session.machineState()!.fs.isLocked('note')).toBe(true);
    expect(run(session, 'cat note').lines[0]?.kind).toBe('hint');
    expect(run(session, 'rm note').lines[0]?.kind).toBe('hint');
    run(session, 'rm blank');
    expect(session.machineState()!.fs.exists('blank')).toBe(false);
    for (const input of ['cd note', 'cat docs', 'lock docs', 'rm docs', 'cd missing', 'rm missing']) {
      expect(run(session, input).lines[0]?.kind).toBe('hint');
    }
  });

  it('does not echo typed addresses from paths that resolve to files', () => {
    const session = connected();
    const address = ['outside', 'example'].join('.');
    for (const input of [`lock ${address}/../note`, `rm ${address}/../blank`]) {
      const result = run(session, input);
      expect(result.lines[0]?.kind).toBe('out');
      expect(JSON.stringify(result)).not.toContain(address);
    }
  });

  it('shows help for only the allowed commands', () => {
    const session = connected();
    const result = session.run('help', ['help', 'ls -a', 'ls', 'connect', 'unknown']);
    expect(result.lines.map((line) => line.text.split(':')[0])).toEqual(['help', 'ls', 'connect']);
    expect(result.lines.every((line) => !line.text.includes('undefined'))).toBe(true);
  });
});

describe('scan, grep and source', () => {
  it('lists owners and open or closed ports, earning only open port evidence', () => {
    const session = new HackSession(mission());
    expect(text(session, 'scan')).toContain('shop-pc: Corner Shop');
    expect(text(session, 'scan shop-pc')).toEqual(['22 terminal: open', '80 web: closed']);
    expect(hackGoalMet({ type: 'found-port', host: 'shop-pc', port: 22 }, session)).toBe(true);
    expect(hackGoalMet({ type: 'found-port', host: 'hq', port: 22 }, session)).toBe(false);
    expect(hackGoalMet({ type: 'found-port', host: 'shop-pc', port: 80 }, session)).toBe(false);
    expect(text(session, 'scan unknown')[0]).toMatch(/^Did you mean/u);
    expect(text(session, 'scan hq')).toEqual(['No ports are listed.']);
  });

  it('finds literal case insensitive matching lines with original numbers', () => {
    const session = connected();
    expect(text(session, 'grep hElLo note')).toEqual(['1: Hello agent', '3: HELLO again']);
    expect(hackGoalMet({ type: 'read', path: '~/note' }, session)).toBe(true);
    for (const input of ['grep absent note', 'grep hello vault', 'grep hello docs', 'grep hello missing']) {
      expect(run(session, input).lines[0]?.kind).toBe('hint');
    }
  });

  it('prints only page source from the current machine data', () => {
    const session = connected();
    expect(text(session, 'view-source shop.example/staff')).toEqual(['<!-- A hidden clue -->']);
    expect(run(session, 'view-source other.example').lines[0]?.kind).toBe('hint');
    run(session, 'exit');
    expect(run(session, 'view-source shop.example/staff').lines[0]?.kind).toBe('hint');
  });
});

describe('decode, mail, permissions and submission', () => {
  it('decodes base64 text and Unicode with no crashes on invalid data', () => {
    const session = connected();
    expect(text(session, 'decode SGVsbG8=')).toEqual(['Hello']);
    expect(text(session, 'decode SGVsbG8')).toEqual(['Hello']);
    expect(text(session, 'decode 8J+QsQ==')).toEqual(['🐱']);
    expect(hackGoalMet({ type: 'decoded', text: 'Hello' }, session)).toBe(true);
    for (const value of ['???', 'A', 'SGVsbG8===', '/w==', 'AA==', 'SG Vs bG8=']) {
      expect(run(session, `decode "${value}"`).lines[0]?.kind).toBe('hint');
    }
    const address = ['outside', 'test'].join('.');
    expect(run(session, `decode ${btoa(address)}`).lines[0]?.text).not.toContain(address);
  });

  it('reads and reports only fake mail by its data number', () => {
    const session = connected();
    expect(text(session, 'mail')).toEqual(['1: A safe note', '2: A trick note']);
    expect(text(session, 'mail 1')).toEqual(['A friend', 'A safe note', 'Have a nice day.']);
    expect(run(session, 'report 1').lines[0]?.kind).toBe('hint');
    expect(hackGoalMet({ type: 'reported', host: 'shop-pc', mailId: '1' }, session)).toBe(false);
    expect(run(session, 'report 2').lines[0]?.kind).toBe('out');
    expect(hackGoalMet({ type: 'reported', host: 'shop-pc', mailId: '2' }, session)).toBe(true);
    for (const input of ['mail 9', 'report 9']) expect(run(session, input).lines[0]?.kind).toBe('hint');
    run(session, 'exit');
    expect(text(session, 'mail')).toEqual(['No mail here yet.']);
  });

  it('changes valid file modes only and keeps the latest value', () => {
    const session = connected();
    for (const input of ['chmod 999 note', 'chmod abc note', 'chmod 60 note', 'chmod 600 docs', 'chmod 600 missing']) {
      expect(run(session, input).lines[0]?.kind).toBe('hint');
    }
    run(session, 'chmod 600 note');
    const goal = { type: 'chmod' as const, host: 'shop-pc', path: '~/note', mode: '600' };
    expect(hackGoalMet(goal, session)).toBe(true);
    run(session, 'chmod 644 note');
    expect(hackGoalMet(goal, session)).toBe(false);
    expect(text(session, 'ls -l')).toContain('644 note');
  });

  it('opens the contract on any machine and submits exact flags or readable files', () => {
    const session = connected();
    expect(text(session, 'open')).toEqual([
      'Find the shop clue.', 'Send the clue to HQ.', 'You may visit:', 'shop-pc', 'bakery-pc',
    ]);
    for (const value of ['CLUE{case-Matters}', 'clue{Case-Matters}', 'extra CLUE{Case-Matters}', 'vault', 'note', 'docs']) {
      expect(run(session, `submit ${value}`).lines[0]?.kind).toBe('hint');
      expect(hackGoalMet({ type: 'flag' }, session)).toBe(false);
    }
    run(session, 'submit "  CLUE{Case-Matters}  "');
    expect(hackGoalMet({ type: 'flag' }, session)).toBe(true);
    const byFile = connected();
    run(byFile, 'submit clue');
    expect(hackGoalMet({ type: 'flag' }, byFile)).toBe(true);
    const atHq = new HackSession(mission());
    run(atHq, 'submit CLUE{Case-Matters}');
    expect(hackGoalMet({ type: 'flag' }, atHq)).toBe(true);
  });

  it('gives hints when optional mission data is absent', () => {
    const session = new HackSession(mission({ contract: undefined, machines: [target({ listed: false })] }));
    for (const input of ['open', 'submit CLUE{Case-Matters}']) {
      expect(run(session, input).lines[0]?.kind).toBe('hint');
    }
    expect(text(session, 'scan')).toEqual(['No computers are listed yet.']);
  });
});
