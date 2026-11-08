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
            'notes.txt': { type: 'file', content: 'No socks in the soup, please.' },
            snacks: {
              type: 'dir',
              children: { 'menu.txt': { type: 'file', content: 'Today: moon cheese on toast.' } },
            },
            games: {
              type: 'dir',
              children: { 'rules.txt': { type: 'file', content: 'Hop like a frog. Then say ribbit!' } },
            },
          },
        },
      },
    },
  },
};

export const t2Move: Mission = {
  id: 't2-move',
  bit: 7,
  order: 7,
  chapter: 'terminal',
  requires: ['t1-hello'],
  minutes: 10,
  title: 'On the Move',
  blurb: 'Walk through folders. Find the frog game!',
  badge: { id: 't2-move', name: 'Folder Scout', art: 'badge-t2-move' },
  intro: [
    { text: 'Your sidekick is back for a trip!' },
    { text: 'We can move through folders with the terminal.' },
    { text: 'It is like walking from room to room.' },
    { text: 'The prompt waits while you choose what to type.' },
  ],
  steps: [
    {
      id: 'walk-in',
      title: 'Visit the snack room',
      lines: [
        { text: 'Start in your agent folder.' },
        { text: 'Use cd to walk into a folder.', say: 'Use C D to walk into a folder.' },
        { text: 'Put a space and the folder name after cd.', say: 'Put a space and the folder name after C D.' },
        { text: 'Let us visit snacks.' },
      ],
      hints: [
        { text: 'The snack room is a folder.' },
        { text: 'Use cd with the name snacks.', say: 'Use C D with the name snacks.' },
        { text: 'Type cd snacks and press Enter.', say: 'Type C D, space, snacks and press Enter.' },
      ],
      success: [{ text: 'You walked in! Is that moon cheese?' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'cd'],
        goal: { type: 'cwd', path: '/home/agent/snacks' }, chips: ['ls', 'cd snacks'],
      },
    },
    {
      id: 'walk-out',
      title: 'Step back out',
      lines: [
        { text: 'This step starts inside snacks.' },
        { text: 'Use cd .. to step back out.', say: 'Use C D, space, dot dot to step back out.' },
        { text: 'The two dots mean the folder that holds this one.' },
        { text: 'Go back to your agent folder.' },
      ],
      hints: [
        { text: 'Time to leave the snack room.' },
        { text: 'Use cd with two dots.', say: 'Use C D with two dots.' },
        { text: 'Type cd .. and press Enter.', say: 'Type C D, space, dot dot and press Enter.' },
      ],
      success: [{ text: 'Back home! You know the way out.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent/snacks', commands: ['ls', 'cat', 'cd'],
        goal: { type: 'cwd', path: '/home/agent' }, chips: ['cd ..'],
      },
    },
    {
      id: 'where-am-i',
      title: 'Ask where you are',
      lines: [
        { text: 'Use pwd to ask, "Where am I?"', say: 'Use P W D to ask, where am I?' },
        { text: 'It shows the path to your folder.' },
        { text: 'A path is like a trail of room names.' },
        { text: 'Slashes split the names along the trail.' },
      ],
      hints: [
        { text: 'Let us check our spot.' },
        { text: 'The new command shows your path.' },
        { text: 'Type pwd and press Enter.', say: 'Type P W D and press Enter.' },
      ],
      success: [{ text: 'There you are! Your path leads to the agent folder.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'cd', 'pwd'],
        goal: { type: 'run', command: 'pwd' }, chips: ['pwd'],
      },
    },
    {
      id: 'game-trip',
      title: 'Find the frog game',
      lines: [
        { text: 'We start back in your agent folder.' },
        { text: 'Walk into games. Stay there to read the rules.' },
        { text: 'Try typing the commands. The chips can help too.' },
        { text: 'Use cat to read rules.txt.', say: 'Use cat to read rules dot T X T.' },
      ],
      hints: [
        { text: 'First walk in. Then read the file.' },
        { text: 'Use cd games, then cat with the file name.', say: 'Use C D, space, games, then cat with the file name.' },
        { text: 'Type cd games, press Enter. Type cat rules.txt, press Enter.', say: 'Type C D, space, games, press Enter. Type cat, space, rules dot T X T, press Enter.' },
      ],
      success: [{ text: 'Ribbit! You found the rules all by yourself.' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent', commands: ['ls', 'cat', 'cd', 'pwd'],
        goal: { type: 'all', goals: [
          { type: 'cwd', path: '/home/agent/games' },
          { type: 'read', path: '/home/agent/games/rules.txt' },
        ] },
        chips: ['cd games', 'cat rules.txt'],
      },
    },
  ],
  outro: [
    { text: 'You can walk in, walk out, and check your path.' },
    { text: 'Your Folder Scout badge is ready. Nice trip!' },
    { text: 'Next, we will find some handy tools.' },
  ],
};
