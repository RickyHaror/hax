import type { Mission } from '../engine/types';

export const s1m3HiddenFolder: Mission = {
  id: 's1-m3-hidden-folder', bit: 18, order: 18, chapter: 'season', season: 's1',
  requires: ['s1-m2-sticky-note'], xp: 20, minutes: 10,
  title: 'Hidden Folder',
  blurb: 'Help Mo find a flag in the arcade computer.',
  badge: { id: 's1-m3-hidden-folder', name: 'Dot Scout', art: 'badge-s1-m3' },
  contract: {
    client: { name: 'Mo', role: 'Corner Town Arcade owner' },
    problem: { text: 'I hid a flag. Can you still find it?' },
    goal: { text: 'Please check the hidden folder on my game server.' },
    allowed: ['game-server'], flag: 'CLUE{hidden-is-not-safe}',
  },
  teaches: ['ls -a', 'pwd'],
  machines: [{
    host: 'game-server', owner: 'Corner Town Arcade', user: 'player', color: 'library',
    banner: ['Corner Town Arcade', 'Ready for a silly game?'], home: '/home/player',
    fs: { type: 'dir', children: {
      home: { type: 'dir', children: {
        player: { type: 'dir', children: {
          games: { type: 'dir', children: {
            'bean-race.txt': { type: 'file', content: 'Hop like a bean to win!' },
            'sock-hop.txt': { type: 'file', content: 'Find the sock with a top hat.' },
            'duck-dance.txt': { type: 'file', content: 'Wiggle like a duck. Quack!' },
          } },
          '.secret': { type: 'dir', children: {
            'flag.txt': { type: 'file', content: 'CLUE{hidden-is-not-safe}' },
          } },
        } },
      } },
    } },
  }],
  intro: [
    { text: 'Mo runs the Corner Town Arcade.' },
    { text: 'Can you find my hidden flag?', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'Mo gave us permission to check the game server.' },
  ],
  steps: [
    {
      id: 'connect', title: 'Visit the arcade',
      lines: [{ text: 'Connect to the game server to start the search.' }],
      hints: [
        { text: 'Mo gave us one game server to check.' },
        { text: 'The name is game, hyphen, server.' },
        { text: 'Type connect, a space, then game, hyphen, server. Press Enter.' },
      ],
      success: [{ text: 'Welcome to the arcade computer!' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['connect', 'help', 'clear'],
        chips: [{ command: 'connect game-server', hint: 'Visit Mo' }], showMe: 'connect game-server',
        goal: { type: 'connected', host: 'game-server' },
      },
    },
    {
      id: 'list', title: 'Look at the names',
      lines: [
        { text: 'Use ls to list the names.', say: 'Use L S to list the names.' },
        { text: 'Can you see a flag yet?' },
      ],
      hints: [
        { text: 'Start with a plain list.' },
        { text: 'The ls command shows most names.', say: 'The L S command shows most names.' },
        { text: 'Type ls and press Enter.', say: 'Type L S and press Enter.' },
      ],
      success: [{ text: 'Just games! Some names may be hidden.' }],
      config: {
        kind: 'hack', commands: ['ls', 'help', 'clear'],
        chips: [{ command: 'ls', hint: 'List names' }], showMe: 'ls',
        goal: { type: 'on', host: 'game-server', goal: { type: 'run', command: 'ls', args: [] } },
      },
    },
    {
      id: 'list-all', title: 'Show hidden names',
      lines: [
        { text: 'A dot at the start hides a name.' },
        { text: 'Use ls -a to see hidden names too.', say: 'Use L S, space, dash A to see hidden names too.' },
      ],
      hints: [
        { text: 'The plain list left something out.' },
        { text: 'Add a space, dash, and a to the list command.' },
        { text: 'Type ls -a and press Enter.', say: 'Type L S, space, dash A and press Enter.' },
      ],
      success: [{ text: 'You found .secret!', say: 'You found dot secret!' }],
      config: {
        kind: 'hack', commands: ['ls', 'help', 'clear'],
        chips: [{ command: 'ls -a', hint: 'Show all names' }], showMe: 'ls -a',
        goal: { type: 'on', host: 'game-server', goal: { type: 'run', command: 'ls', args: ['-a'] } },
      },
    },
    {
      id: 'secret', title: 'Open the hidden folder',
      lines: [{ text: 'Use cd .secret to open it.', say: 'Use C D, space, dot secret to open it.' }],
      hints: [
        { text: 'Hidden folders work like other folders.' },
        { text: 'Keep the dot at the start of the name.' },
        { text: 'Type cd .secret and press Enter.', say: 'Type C D, space, dot secret and press Enter.' },
      ],
      success: [{ text: 'You are in the hidden folder!' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cd .secret', hint: 'Open the folder' }], showMe: 'cd .secret',
        goal: { type: 'on', host: 'game-server', goal: { type: 'cwd', path: '/home/player/.secret' } },
      },
    },
    {
      id: 'where', title: 'Check where you are',
      lines: [{ text: 'Use pwd to see your full folder path.', say: 'Use P W D to see your full folder path.' }],
      hints: [
        { text: 'A path tells you where a folder lives.' },
        { text: 'The pwd command shows your path.', say: 'The P W D command shows your path.' },
        { text: 'Type pwd and press Enter.', say: 'Type P W D and press Enter.' },
      ],
      success: [{ text: 'That path leads to the hidden folder.' }],
      config: {
        kind: 'hack', commands: ['pwd', 'ls', 'cat', 'cd', 'help', 'clear'],
        chips: [{ command: 'pwd', hint: 'See your path' }], showMe: 'pwd',
        goal: { type: 'on', host: 'game-server', goal: { type: 'run', command: 'pwd' } },
      },
    },
    {
      id: 'read-flag', title: 'Read the hidden flag',
      lines: [{ text: 'Read flag.txt in this folder.', say: 'Read flag dot text in this folder.' }],
      hints: [
        { text: 'A hidden folder did not keep this flag safe.' },
        { text: 'Use cat with the flag file name.' },
        { text: 'Type cat flag.txt and press Enter.', say: 'Type cat, space, flag dot text and press Enter.' },
      ],
      success: [{ text: 'You found the hidden flag!' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat flag.txt', hint: 'Read the flag' }], showMe: 'cat flag.txt',
        goal: { type: 'on', host: 'game-server', goal: { type: 'read', path: '/home/player/.secret/flag.txt' } },
      },
    },
    {
      id: 'submit', title: 'Hand in the flag',
      lines: [{ text: 'Send the hidden flag to your case book.' }],
      hints: [
        { text: 'You have the flag. Time to finish!' },
        { text: 'Use submit with the whole flag.' },
        { text: 'Show me types the flag for you. Just press Enter!' },
      ],
      success: [{ text: 'Case closed! Mo knows a dot is not a lock.' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: 'submit CLUE{hidden-is-not-safe}', hint: 'Finish the case' }],
        showMe: 'submit CLUE{hidden-is-not-safe}', goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great work! You earned your Dot Scout badge.' },
    { text: 'Mo can use a password to keep secret files safe.' },
  ],
};
