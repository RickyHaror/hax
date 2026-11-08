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
            menu: { type: 'file', content: 'Cheese pizza. Pea pizza. Sock pizza? Just a joke!' },
            '.secret_sauce': {
              type: 'file', content: '1 cup of tomato. 2 pinches of giggles. Stir and grin!',
            },
          },
        },
      },
    },
  },
};

export const m1Pizza: Mission = {
  id: 'm1-pizza',
  bit: 9,
  order: 9,
  chapter: 'missions',
  requires: ['t3-tools'],
  minutes: 12,
  title: 'The Secret Sauce',
  blurb: 'Find a hidden recipe. Help Pete lock it up.',
  client: {
    company: "Pepperoni Pete's Pizza",
    contact: 'Pete Cheese Knees',
    art: 'client-m1-pizza',
    allowed: [
      { text: 'Look in the shop computer for my sauce recipe.' },
      { text: 'Read the recipe, then lock its file.' },
    ],
    notAllowed: [
      { text: 'Leave the menu as it is.' },
      { text: 'Do not test any other shop.' },
    ],
  },
  badge: { id: 'm1-pizza', name: 'Sauce Guard', art: 'badge-m1-pizza' },
  intro: [
    { text: 'Help! My secret sauce recipe needs a lock!', speaker: 'client' },
    { text: 'This slip says what you may test.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'We will use the pretend shop computer.' },
  ],
  steps: [
    {
      id: 'look-around',
      title: 'Peek at the shop files',
      lines: [
        { text: 'We start in the agent folder on the shop computer.' },
        { text: 'Use ls to list the files.', say: 'Use L S to list the files.' },
        { text: 'A file list is like a list of drawer labels.' },
      ],
      hints: [
        { text: 'First, see what is here.' },
        { text: 'The ls tool lists names.', say: 'The L S tool lists names.' },
        { text: 'Type ls and press Enter.', say: 'Type L S and press Enter.' },
      ],
      success: [{ text: 'There is the menu. Where is that sauce recipe?' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'help'],
        goal: { type: 'run', command: 'ls' }, chips: ['ls'],
      },
    },
    {
      id: 'find-sauce',
      title: 'Find the hidden file',
      lines: [
        { text: 'A hidden file is like a note taped under a desk.' },
        { text: 'Anyone who looks there can find it.' },
        { text: 'Use ls -a to show hidden names.', say: 'Use L S, space, dash A to show hidden names.' },
      ],
      hints: [
        { text: 'The recipe name starts with a dot.' },
        { text: 'Add dash a to ls for all names.', say: 'Add dash A to L S for all names.' },
        { text: 'Type ls -a and press Enter.', say: 'Type L S, space, dash A and press Enter.' },
      ],
      success: [
        { text: 'You found .secret_sauce!', say: 'You found dot secret sauce!' },
        { text: 'A hidden file is still there. It is not locked.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'help'],
        goal: { type: 'run', command: 'ls', args: ['-a'] }, chips: ['ls', 'ls -a'],
      },
    },
    {
      id: 'read-sauce',
      title: 'Read the recipe',
      lines: [
        { text: 'Pete said we may read this recipe.' },
        { text: 'Use cat .secret_sauce to read it.', say: 'Use cat, space, dot secret sauce to read it.' },
        { text: 'Keep the dot and the low line in the name.' },
      ],
      hints: [
        { text: 'The cat tool reads a file.' },
        { text: 'Use cat with the full hidden file name.' },
        { text: 'Type cat .secret_sauce and press Enter.', say: 'Type cat, space, dot secret sauce and press Enter.' },
      ],
      success: [
        { text: 'Giggles in the sauce! What a silly recipe!' },
        { text: 'We read it with no key. It needs a lock.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'help'],
        goal: { type: 'read', path: '/home/agent/.secret_sauce' }, chips: ['cat .secret_sauce'],
      },
    },
    {
      id: 'lock-sauce',
      title: 'Lock the recipe',
      lockdown: true,
      lines: [
        { text: 'Hiding is not the same as locking.' },
        { text: 'A lock keeps people from reading the file.' },
        { text: 'Use lock .secret_sauce to lock it.', say: 'Use lock, space, dot secret sauce to lock it.' },
      ],
      hints: [
        { text: 'The recipe needs more than a hiding place.' },
        { text: 'Use lock with the hidden file name.' },
        { text: 'Type lock .secret_sauce and press Enter.', say: 'Type lock, space, dot secret sauce and press Enter.' },
      ],
      success: [{ text: 'The recipe is locked! Pete can keep his giggles safe.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'lock', 'help'],
        goal: { type: 'locked', path: '/home/agent/.secret_sauce' }, chips: ['lock .secret_sauce'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! My sauce has a lock now.', speaker: 'client' },
    { text: 'You earned the Sauce Guard badge!' },
    { text: 'Job done. Take a rest with your sidekick.' },
  ],
};
