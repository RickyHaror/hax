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
            'notes.txt': { type: 'file', content: 'The duck wears tiny boots.' },
            'joke.txt': { type: 'file', content: 'What do cats eat for lunch? Mice cream!' },
            snacks: { type: 'dir', children: {} },
            games: { type: 'dir', children: {} },
          },
        },
      },
    },
  },
};

export const t1Hello: Mission = {
  id: 't1-hello',
  bit: 6,
  order: 6,
  chapter: 'terminal',
  requires: ['b5-passwords'],
  minutes: 10,
  title: 'Hello Terminal',
  blurb: 'Talk to the computer. Find a silly joke!',
  badge: { id: 't1-hello', name: 'Terminal Pal', art: 'badge-t1-hello' },
  intro: [
    { text: 'I am your sidekick. Let us try the terminal!' },
    { text: 'The terminal lets you talk to the computer by typing.' },
    { text: 'A command tells it what to do.' },
    { text: 'The prompt waits for your command.' },
    { text: 'This is a pretend computer. We can learn here.' },
  ],
  steps: [
    {
      id: 'look',
      title: 'Peek inside',
      lines: [
        { text: 'We start in your agent folder.' },
        { text: 'A folder is like a room for files.' },
        { text: 'Use ls to peek into the room.', say: 'Use L S to peek into the room.' },
        { text: 'It lists the names of files and folders.' },
        { text: 'Click the ls chip to try it.', say: 'Click the L S chip to try it.' },
      ],
      hints: [
        { text: 'Let us see what is here.' },
        { text: 'The chip holds our first command.' },
        { text: 'Click ls, or type ls and press Enter.', say: 'Click L S, or type L S and press Enter.' },
      ],
      success: [{ text: 'Nice peek! There are files to read.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls'],
        goal: { type: 'run', command: 'ls' }, chips: ['ls'],
      },
    },
    {
      id: 'read-note',
      title: 'Read the note',
      lines: [
        { text: 'A file is like a sheet of paper.' },
        { text: 'The cat command shows what is on that paper.', say: 'The cat command shows what is on that paper.' },
        { text: 'Put a space and the file name after cat.', say: 'Put a space and the file name after cat.' },
        { text: 'Read notes.txt with the chip.', say: 'Read notes dot T X T with the chip.' },
      ],
      hints: [
        { text: 'Our note has a silly fact.' },
        { text: 'Use cat with the name notes.txt.', say: 'Use cat with the name notes dot T X T.' },
        { text: 'Type cat notes.txt and press Enter.', say: 'Type cat, space, notes dot T X T and press Enter.' },
      ],
      success: [{ text: 'You read the note! Those boots must be small.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat'],
        goal: { type: 'read', path: '/home/agent/notes.txt' },
        chips: ['ls', 'cat notes.txt'],
      },
    },
    {
      id: 'type-joke',
      title: 'Type for a joke',
      lines: [
        { text: 'Let us try typing this time.' },
        { text: 'Use ls if you want to see the names again.', say: 'Use L S if you want to see the names again.' },
        { text: 'Read joke.txt with cat.', say: 'Read joke dot T X T with cat.' },
        { text: 'Press Enter to send each command.' },
        { text: 'Take your time. The hints can help.' },
      ],
      hints: [
        { text: 'Which command reads a file?' },
        { text: 'Use cat, a space, then joke.txt.', say: 'Use cat, a space, then joke dot T X T.' },
        { text: 'Type cat joke.txt and press Enter.', say: 'Type cat, space, joke dot T X T and press Enter.' },
      ],
      success: [{ text: 'You typed a command! That joke was worth a peek.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat'],
        goal: { type: 'read', path: '/home/agent/joke.txt' },
      },
    },
  ],
  outro: [
    { text: 'You can list files and read them. Great work!' },
    { text: 'Your Terminal Pal badge is ready.' },
    { text: 'Next time, we will walk into folders.' },
  ],
};
