import type { Mission } from '../engine/types';

export const s1m2StickyNote: Mission = {
  id: 's1-m2-sticky-note', bit: 17, order: 17, chapter: 'season', season: 's1',
  requires: ['s1-m1-toy-shop'], xp: 20, minutes: 10,
  title: 'Password in a Note',
  blurb: 'Find a note and help Sam keep the till safe.',
  badge: { id: 's1-m2-sticky-note', name: 'Note Scout', art: 'badge-s1-m2' },
  contract: {
    client: { name: 'Sam', role: 'Corner Shop owner' },
    problem: { text: 'I left a password on my desk.' },
    goal: { text: 'Please check if that note opens my till.' },
    allowed: ['shop-pc', 'shop-till'], flag: 'CLUE{never-leave-passwords-on-notes}',
  },
  alarm: { limit: 5 }, teaches: ['cat', 'cd'],
  machines: [
    {
      host: 'shop-pc', owner: 'Corner Shop', user: 'guest', color: 'shop',
      banner: ['Corner Shop', 'Welcome to the shop desk.'], home: '/home/guest',
      fs: { type: 'dir', children: {
        home: { type: 'dir', children: {
          guest: { type: 'dir', children: {
            desk: { type: 'dir', children: {
              'sticky-note.txt': { type: 'file', content: 'Till name: cashier\nTill password: sunflower7' },
            } },
          } },
        } },
      } },
    },
    {
      host: 'shop-till', owner: 'Corner Shop', user: 'cashier', color: 'shop',
      banner: ['Corner Shop Till', 'Coins for toys!'], home: '/home/cashier',
      login: { user: 'cashier', password: 'sunflower7' },
      fs: { type: 'dir', children: {
        home: { type: 'dir', children: {
          cashier: { type: 'dir', children: {
            'flag.txt': { type: 'file', content: 'CLUE{never-leave-passwords-on-notes}' },
          } },
        } },
      } },
    },
  ],
  intro: [
    { text: 'Sam has one more toy shop puzzle for you.' },
    { text: 'I left a note on my desk.', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'Sam lets us check the shop computer and till.' },
  ],
  steps: [
    {
      id: 'connect', title: 'Visit the desk',
      lines: [{ text: 'Start on shop-pc. The desk folder is there.' }],
      hints: [
        { text: 'The note is on the shop computer.' },
        { text: 'Use connect to visit shop-pc.' },
        { text: 'Type connect shop-pc and press Enter.' },
      ],
      success: [{ text: 'You are at the shop desk!' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['connect', 'help', 'clear'],
        chips: [{ command: 'connect shop-pc', hint: 'Visit the desk' }],
        showMe: 'connect shop-pc', goal: { type: 'connected', host: 'shop-pc' },
      },
    },
    {
      id: 'desk', title: 'Open the desk folder',
      lines: [{ text: 'Use cd desk to go into the desk folder.', say: 'Use C D, space, desk to go into the desk folder.' }],
      hints: [
        { text: 'A folder can hold more files.' },
        { text: 'Use cd with the folder name desk.', say: 'Use C D with the folder name desk.' },
        { text: 'Type cd desk and press Enter.', say: 'Type C D, space, desk and press Enter.' },
      ],
      success: [{ text: 'You opened the desk folder.' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cd desk', hint: 'Open the folder' }], showMe: 'cd desk',
        goal: { type: 'on', host: 'shop-pc', goal: { type: 'cwd', path: '/home/guest/desk' } },
      },
    },
    {
      id: 'read-note', title: 'Read the note',
      lines: [
        { text: 'Cat lets you read a file.' },
        { text: 'Read sticky-note.txt to find the till password.', say: 'Read sticky note dot text to find the till password.' },
      ],
      hints: [
        { text: 'The note has the clue you need.' },
        { text: 'Use cat with the note file name.' },
        { text: 'Type cat sticky-note.txt and press Enter.', say: 'Type cat, space, sticky note dot text and press Enter.' },
      ],
      success: [{ text: 'The till name is cashier. Its password is sunflower7.' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat sticky-note.txt', hint: 'Read the note' }], showMe: 'cat sticky-note.txt',
        goal: { type: 'on', host: 'shop-pc', goal: { type: 'read', path: '/home/guest/desk/sticky-note.txt' } },
      },
    },
    {
      id: 'login-till', title: 'Check the till',
      lines: [
        { text: 'Connect to shop-till next.' },
        { text: 'Use cashier for the name and sunflower7 for the password.' },
      ],
      hints: [
        { text: 'Try the name and password from the note.' },
        { text: 'The till is called shop-till.' },
        { text: 'Type connect shop-till. Then enter cashier and sunflower7.' },
      ],
      success: [{ text: 'The note opened the till. We found the hole!' }],
      config: {
        kind: 'hack', commands: ['connect', 'login', 'help', 'clear'],
        chips: [{ command: 'connect shop-till', hint: 'Visit the till' }, { command: 'login cashier', hint: 'Sign in' }],
        showMe: 'connect shop-till', goal: { type: 'logged-in', host: 'shop-till' },
      },
    },
    {
      id: 'read-flag', title: 'Read the till flag',
      lines: [{ text: 'Read flag.txt on the till.', say: 'Read flag dot text on the till.' }],
      hints: [
        { text: 'The flag is in the till home folder.' },
        { text: 'Use cat to read the flag file.' },
        { text: 'Type cat flag.txt and press Enter.', say: 'Type cat, space, flag dot text and press Enter.' },
      ],
      success: [{ text: 'You found the flag. Nice work!' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat flag.txt', hint: 'Read the flag' }], showMe: 'cat flag.txt',
        goal: { type: 'on', host: 'shop-till', goal: { type: 'read', path: '/home/cashier/flag.txt' } },
      },
    },
    {
      id: 'submit', title: 'Hand in the flag',
      lines: [{ text: 'Send this flag to your case book.' }],
      hints: [
        { text: 'Your case book needs this flag too.' },
        { text: 'Use submit with the whole flag.' },
        { text: 'Type submit, a space, then CLUE and an open brace. Add never, hyphen, leave, hyphen, passwords, hyphen, on, hyphen, notes. End with a close brace. Press Enter.' },
      ],
      success: [{ text: 'Case closed! The note helped us spot the hole.' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: 'submit CLUE{never-leave-passwords-on-notes}', hint: 'Finish the case' }],
        showMe: 'submit CLUE{never-leave-passwords-on-notes}', goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great work! You earned your Note Scout badge.' },
    { text: 'Sam can change the password and put the note away.' },
  ],
};
