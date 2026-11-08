import type { Mission } from '../engine/types';

export const s1m1ToyShop: Mission = {
  id: 's1-m1-toy-shop', bit: 16, order: 16, chapter: 'season', season: 's1',
  requires: ['t3-tools'], xp: 20, minutes: 10,
  title: 'Toy Shop Computer',
  blurb: 'Help Sam check an old toy shop computer.',
  badge: { id: 's1-m1-toy-shop', name: 'Toy Scout', art: 'badge-s1-m1' },
  contract: {
    client: { name: 'Sam', role: 'Corner Shop owner' },
    problem: { text: 'My old toy shop computer has a weak password.' },
    goal: { text: 'Please find the flag on my computer.' },
    allowed: ['shop-pc'], flag: 'CLUE{default-passwords-are-easy}',
  },
  alarm: { limit: 8 },
  teaches: ['login', 'whoami', 'ls'],
  machines: [{
    host: 'shop-pc', owner: 'Corner Shop', user: 'admin', color: 'shop',
    banner: ['Corner Shop', 'Toys, tops, and tiny trains!'],
    login: { user: 'admin', password: 'admin' }, home: '/home/admin',
    fs: { type: 'dir', children: {
      home: { type: 'dir', children: {
        admin: { type: 'dir', children: {
          'flag.txt': { type: 'file', content: 'CLUE{default-passwords-are-easy}' },
          'toys.txt': { type: 'file', content: 'Red train\nBlue bear\nGreen top' },
          'snacks.txt': { type: 'file', content: 'Apple slices for the toy crew.' },
        } },
      } },
    } },
  }],
  intro: [
    { text: 'Sam runs the toy shop on the corner.', speaker: 'narrator' },
    { text: 'Please check my old computer.', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'Sam gave us permission. Let us find the flag!' },
  ],
  steps: [
    {
      id: 'connect', title: 'Try the old password',
      lines: [
        { text: 'Connect takes you to a pretend computer.' },
        { text: 'The shop computer is called shop-pc.' },
        { text: 'Type connect shop-pc and press Enter.' },
        { text: 'It asks for a name, then a password.' },
        { text: 'Try a guess. The hints can help if you need.' },
      ],
      hints: [
        { text: 'A computer can come from the box with an easy password. That factory password stays until someone changes it.' },
        { text: 'Try admin for both the name and password.' },
        { text: 'Show me types connect shop-pc for you. Press Enter. Then type admin two times when asked.' },
      ],
      success: [{ text: 'You are in! That password was easy to guess.' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['connect', 'help', 'clear'],
        chips: [{ command: 'connect shop-pc', hint: 'Visit Sam' }],
        showMe: 'connect shop-pc', goal: { type: 'logged-in', host: 'shop-pc' },
      },
    },
    {
      id: 'whoami', title: 'Check your name',
      lines: [{ text: 'Whoami shows the name you signed in with.' }],
      hints: [
        { text: 'Which name does this computer know you by?' },
        { text: 'Use whoami to ask your name.' },
        { text: 'Type whoami and press Enter.' },
      ],
      success: [{ text: 'Your name here is admin. Nice check!' }],
      config: {
        kind: 'hack', commands: ['whoami', 'help', 'clear'],
        chips: [{ command: 'whoami', hint: 'See your name' }], showMe: 'whoami',
        goal: { type: 'on', host: 'shop-pc', goal: { type: 'run', command: 'whoami' } },
      },
    },
    {
      id: 'read-flag', title: 'Find the flag',
      lines: [
        { text: 'Use ls to list the files.', say: 'Use L S to list the files.' },
        { text: 'Then use cat flag.txt to read the flag.', say: 'Then use cat, space, flag dot text to read the flag.' },
      ],
      hints: [
        { text: 'The flag is in your home folder.' },
        { text: 'List the names. Then read the flag file.' },
        { text: 'Type ls. Then type cat flag.txt.', say: 'Type L S. Then type cat, space, flag dot text.' },
      ],
      success: [{ text: 'You found the flag! Let us hand it in.' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'ls', hint: 'List files' }, { command: 'cat flag.txt', hint: 'Read the flag' }],
        showMe: 'cat flag.txt',
        goal: { type: 'on', host: 'shop-pc', goal: { type: 'read', path: '/home/admin/flag.txt' } },
      },
    },
    {
      id: 'submit', title: 'Hand in the flag',
      lines: [{ text: 'Submit sends the flag to your case book.' }],
      hints: [
        { text: 'Your case book needs the whole flag.' },
        { text: 'Use submit with the flag you found.' },
        { text: 'Show me types the flag for you. Just press Enter!' },
      ],
      success: [{ text: 'Case closed! Sam can now fix the password.' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: 'submit CLUE{default-passwords-are-easy}', hint: 'Finish the case' }],
        showMe: 'submit CLUE{default-passwords-are-easy}', goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great work! You earned your Toy Scout badge.' },
    { text: 'Sam can choose a new, long password for the shop.' },
  ],
};
