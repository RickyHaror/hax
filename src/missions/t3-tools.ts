import type { FsDir, Mission } from '../engine/types';

const fs: FsDir = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        agent: {
          type: 'dir',
          children: {
            'notes.txt': { type: 'file', content: 'The desk has a secret snack note.' },
            '.snack': { type: 'file', content: 'The secret snack is a cheese hat!' },
            games: { type: 'dir', children: {} },
          },
        },
      },
    },
  },
};

export const t3Tools: Mission = {
  id: 't3-tools',
  bit: 8,
  order: 8,
  chapter: 'terminal',
  requires: ['t2-move'],
  minutes: 10,
  title: 'Agent Tools',
  blurb: 'Get help, tidy the screen, and find a hidden note.',
  badge: { id: 't3-tools', name: 'Tool Star', art: 'badge-t3-tools' },
  intro: [
    { text: 'Your sidekick has some handy tools to share.' },
    { text: 'We start in your agent folder each time.' },
    { text: 'Type to talk to the terminal, or use a chip.' },
    { text: 'The prompt waits for you. There is no rush.' },
  ],
  steps: [
    {
      id: 'get-help',
      title: 'Ask for help',
      lines: [
        { text: 'The help command lists the tools you can use.' },
        { text: 'It is like asking a friend for a tip.' },
        { text: 'Try the help chip.' },
      ],
      hints: [
        { text: 'You can always ask for a tip.' },
        { text: 'The new tool is called help.' },
        { text: 'Type help and press Enter.' },
      ],
      success: [{ text: 'Nice! Now you know where to find your tools.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'cd', 'pwd', 'help'],
        goal: { type: 'run', command: 'help' }, chips: ['help'],
      },
    },
    {
      id: 'tidy-screen',
      title: 'Make some space',
      lines: [
        { text: 'Try ls to put some names on the screen.', say: 'Try L S to put some names on the screen.' },
        { text: 'The clear command wipes old words from the screen.' },
        { text: 'It is like wiping a chalk board.' },
        { text: 'Your files stay safe. Just the screen gets a tidy.' },
      ],
      hints: [
        { text: 'Let us make room for new words.' },
        { text: 'Use clear to tidy the screen.' },
        { text: 'Type clear and press Enter.' },
      ],
      success: [{ text: 'All tidy! Your files are still here.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        goal: { type: 'run', command: 'clear' }, chips: ['ls', 'clear'],
      },
    },
    {
      id: 'spot-hidden',
      title: 'Look under the desk',
      lines: [
        { text: 'A hidden file is like a note taped under a desk.' },
        { text: 'Its name starts with a dot.' },
        { text: 'Plain ls does not show it.', say: 'Plain L S does not show it.' },
        { text: 'Use ls -a to show hidden files too.', say: 'Use L S, space, dash A to show hidden files too.' },
        { text: 'The extra part asks to show all the names.' },
      ],
      hints: [
        { text: 'There is one hidden note to find.' },
        { text: 'Add a space, dash, and a to ls.', say: 'Add a space, dash, and A to L S.' },
        { text: 'Type ls -a and press Enter.', say: 'Type L S, space, dash A and press Enter.' },
      ],
      success: [{ text: 'You found a name with a dot! A hidden note!' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        goal: { type: 'run', command: 'ls', args: ['-a'] }, chips: ['ls', 'ls -a'],
      },
    },
    {
      id: 'read-hidden',
      title: 'Read the secret snack',
      lines: [
        { text: 'Our hidden file is called .snack.', say: 'Our hidden file is called dot snack.' },
        { text: 'Use cat to read it, just like any file.' },
        { text: 'Keep the dot when you type its name.' },
        { text: 'Try typing this one. You can do it!' },
      ],
      hints: [
        { text: 'What might our secret snack be?' },
        { text: 'Use cat with the full name .snack.', say: 'Use cat with the full name dot snack.' },
        { text: 'Type cat .snack and press Enter.', say: 'Type cat, space, dot snack and press Enter.' },
      ],
      success: [{ text: 'A cheese hat! You read the hidden note. Great work!' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        goal: { type: 'read', path: '/home/agent/.snack' },
      },
    },
  ],
  outro: [
    { text: 'You earned your Tool Star badge!' },
    { text: 'You can ask for help and find hidden files.' },
    { text: 'Take a rest. Your first client is next!' },
  ],
};
