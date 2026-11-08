import type { FsDir, FsNode, TerminalConfig, TerminalGoal } from '../../../engine/types';

const dir = (children: Record<string, FsNode>): FsDir => ({ type: 'dir', children });
export function terminalConfig(goal: TerminalGoal = { type: 'read', path: '/home/agent/notes.txt' }): TerminalConfig {
  return {
    kind: 'terminal', cwd: '/home/agent', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear', 'lock', 'rm'],
    fs: dir({ home: dir({ agent: dir({
      'notes.txt': { type: 'file', content: 'The duck wears tiny boots.\nNice boots!' },
      '.secret': { type: 'file', content: 'A cheese hat!' },
      'locked.txt': { type: 'file', content: 'A secret.', locked: true },
      'my "best" note': { type: 'file', content: 'A good note.' },
      '-note': { type: 'file', content: 'A small note.' },
      snacks: dir({ 'menu.txt': { type: 'file', content: 'Moon cheese.' } }),
    }) }), tmp: dir({ box: dir({ 'outside.txt': { type: 'file', content: 'Outside.' } }) }) }),
    goal,
  };
}
