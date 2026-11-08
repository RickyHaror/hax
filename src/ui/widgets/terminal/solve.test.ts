import { describe, expect, it } from 'vitest';
import { VirtualFs } from '../../../engine/fs';
import { goalMet, parse, Shell } from '../../../engine/shell';
import { missions } from '../../../missions/index';
import type { TerminalConfig } from '../../../engine/types';
import { terminalConfig } from './fixtures';
import { solveTerminal } from './solve';

function prove(config: TerminalConfig, shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands)) {
  const before = shell.fs.snapshot();
  const events = shell.events;
  const cwd = shell.fs.cwd();
  const solution = solveTerminal(config, shell.state);
  expect(shell.fs.snapshot()).toEqual(before);
  expect(shell.events).toEqual(events);
  expect(shell.fs.cwd()).toBe(cwd);
  for (const command of solution) {
    const parsed = parse(command);
    expect(parsed.ok && parsed.command && config.commands.map((name) => name.split(' ')[0]).includes(parsed.command.name)).toBe(true);
    expect(shell.run(command).lines.every((line) => line.kind === 'out')).toBe(true);
  }
  expect(goalMet(config.goal, shell.state)).toBe(true);
  expect(solveTerminal(config, shell.state)).toEqual([]);
  return solution;
}

describe('solveTerminal', () => {
  for (const mission of missions) {
    for (const step of mission.steps) {
      if (step.config.kind !== 'terminal') continue;
      const config = step.config;
      it(`solves ${mission.id}/${step.id} from data and a moved state`, () => {
        prove(config);
        const shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands);
        if (config.commands.includes('cd')) shell.run('cd /');
        prove(config, shell);
      });
    }
  }

  it('uses short paths and advances the planning folder in order', () => {
    const config = terminalConfig({ type: 'all', goals: [
      { type: 'run', command: 'cd', args: ['snacks'] },
      { type: 'read', path: '/home/agent/snacks/menu.txt' },
      { type: 'cwd', path: '/home/agent' },
    ] });
    expect(prove(config)).toEqual(['cd snacks', 'cat menu.txt', 'cd ..']);
  });

  it('omits met parts and keeps existing event evidence', () => {
    const config = terminalConfig({ type: 'all', goals: [
      { type: 'read', path: '/home/agent/notes.txt' },
      { type: 'all', goals: [
        { type: 'locked', path: '/home/agent/notes.txt' },
        { type: 'deleted', path: '/home/agent/.secret' },
      ] },
    ] });
    const shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands);
    shell.run('cat notes.txt');
    expect(prove(config, shell)).toEqual(['lock notes.txt', 'rm .secret']);
  });

  it.each(['my "best" note', '-note'])('quotes or prefixes the file %s safely', (name) => {
    prove(terminalConfig({ type: 'read', path: `/home/agent/${name}` }));
  });

  it('uses an absolute path when shorter than walking back', () => {
    const config = { ...terminalConfig({ type: 'cwd', path: '/tmp' }), cwd: '/home/agent/snacks' };
    expect(prove(config)).toEqual(['cd /tmp']);
  });

  it('resolves run path arguments from home after navigation', () => {
    const config = terminalConfig({ type: 'run', command: 'cat', args: ['notes.txt'] });
    const shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands);
    shell.run('cd snacks');
    expect(prove(config, shell)).toEqual(['cat ../notes.txt']);
  });

  it('keeps flags together and works without an optional state', () => {
    const config = terminalConfig({ type: 'run', command: 'ls', args: ['-la'] });
    expect(solveTerminal(config)).toEqual(['ls -la']);
    prove(config);
  });

  it('does not invent commands outside the allowed list', () => {
    const config = { ...terminalConfig(), commands: ['ls'] };
    expect(() => solveTerminal(config)).toThrow('allowed commands');
  });
});
