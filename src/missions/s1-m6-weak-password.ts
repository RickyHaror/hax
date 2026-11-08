import type { Mission } from '../engine/types';

const flag = 'CLUE{pets-make-weak-passwords}';

export const s1m6WeakPassword: Mission = {
  id: 's1-m6-weak-password',
  bit: 21,
  order: 21,
  chapter: 'season',
  season: 's1',
  requires: ['s1-m5-log-search'],
  xp: 20,
  minutes: 10,
  title: 'The Back Door Clue',
  blurb: 'Use Sam’s clues to test his back door lock.',
  badge: { id: 's1-m6-weak-password', name: 'Lock Scout', art: 'badge-s1-m6' },
  contract: {
    client: { name: 'Sam', role: 'Corner Shop owner and toy train chief' },
    problem: { text: 'My back door password may be easy to guess.' },
    goal: { text: 'Test my lock and bring back the flag.' },
    allowed: ['shop-pc', 'door-lock'],
    flag,
  },
  alarm: { limit: 6 },
  teaches: ['unlock'],
  machines: [
    {
      host: 'shop-pc', owner: 'Corner Shop', user: 'guest', color: 'shop',
      banner: ['Corner Shop', 'Sam’s toy fan page'], home: '/home/guest',
      fs: {
        type: 'dir', children: {
          home: { type: 'dir', children: {
            guest: { type: 'dir', children: {
              'fan-page.txt': { type: 'file', content: [
                'Sam’s dog is named Biscuit.',
                'Sam’s birthday is May 12.',
                'Sam loves toy trains and his dog.',
              ].join('\n') },
            } },
          } },
        },
      },
    },
    {
      host: 'door-lock', owner: 'Corner Shop', user: 'sam', color: 'shop',
      banner: ['Corner Shop back door', 'A small lock with a big job'], home: '/home/sam',
      login: { user: 'sam', password: 'biscuit512', accept: ['Biscuit512', 'biscuit0512'] },
      fs: {
        type: 'dir', children: {
          home: { type: 'dir', children: {
            sam: { type: 'dir', children: {
              'flag.txt': { type: 'file', content: flag },
            } },
          } },
        },
      },
    },
  ],
  intro: [
    { text: 'Sam has one more job for you.', speaker: 'narrator' },
    { text: 'Please test the lock on my back door.', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'Sam’s fan page may hold a clue.' },
  ],
  steps: [
    {
      id: 'connect-shop', title: 'Visit Sam’s computer',
      lines: [{ text: 'Connect to shop-pc to find Sam’s fan page.' }],
      hints: [
        { text: 'First, find the clues on Sam’s computer.' },
        { text: 'Use connect with the host shop-pc.' },
        { text: 'Type connect shop-pc and press Enter.' },
      ],
      success: [{ text: 'You are at Sam’s computer as a guest.' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['connect', 'help', 'clear'],
        chips: [{ command: 'connect shop-pc', hint: 'Visit Sam’s computer' }],
        showMe: 'connect shop-pc', goal: { type: 'connected', host: 'shop-pc' },
      },
    },
    {
      id: 'read-clues', title: 'Meet Biscuit',
      lines: [
        { text: 'Read fan-page.txt with cat.', say: 'Read fan page dot text with cat.' },
        { text: 'Look for Sam’s dog and birthday.' },
      ],
      hints: [
        { text: 'The fan page has two clues.' },
        { text: 'Use cat to read Sam’s fan page.' },
        { text: 'Type cat fan-page.txt and press Enter.',
          say: 'Type cat, space, fan page dot text and press Enter.' },
      ],
      success: [{ text: 'Biscuit is his dog. His birthday is May 12.' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat fan-page.txt', hint: 'Read Sam’s clues' }],
        showMe: 'cat fan-page.txt',
        goal: { type: 'on', host: 'shop-pc', goal: { type: 'read', path: '/home/guest/fan-page.txt' } },
      },
    },
    {
      id: 'lock-login', title: 'Try the two clues',
      lines: [
        { text: 'Try the dog’s name with the birthday numbers.' },
        { text: 'May is month 5. Add day 12 to make 512.' },
        { text: 'Connect to door-lock. The user is sam.' },
      ],
      hints: [
        { text: 'Sam may use his dog’s name in his password.' },
        { text: 'Join biscuit and 512 to make biscuit512.' },
        { text: 'Type connect door-lock. Then enter sam and biscuit512.' },
      ],
      success: [{ text: 'You are in! The two clues worked.' }],
      config: {
        kind: 'hack', commands: ['connect', 'login', 'help', 'clear'],
        chips: [{ command: 'connect door-lock', hint: 'Test the back door' }],
        showMe: 'connect door-lock', goal: { type: 'logged-in', host: 'door-lock' },
      },
    },
    {
      id: 'unlock-door', title: 'Open the pretend lock',
      lines: [{ text: 'Use unlock to open Sam’s pretend back door.' }],
      hints: [
        { text: 'You have Sam’s permission to test this lock.' },
        { text: 'The new command is unlock.' },
        { text: 'Type unlock and press Enter.' },
      ],
      success: [{ text: 'Click! The pretend lock is open.' }],
      config: {
        kind: 'hack', commands: ['unlock', 'help', 'clear'],
        chips: [{ command: 'unlock', hint: 'Open the lock' }], showMe: 'unlock',
        goal: { type: 'on', host: 'door-lock', goal: { type: 'run', command: 'unlock' } },
      },
    },
    {
      id: 'read-flag', title: 'Find the door flag',
      lines: [{ text: 'Read flag.txt with cat.', say: 'Read flag dot text with cat.' }],
      hints: [
        { text: 'Sam’s flag is in this home folder.' },
        { text: 'Use cat to read the flag file.' },
        { text: 'Type cat flag.txt and press Enter.',
          say: 'Type cat, space, flag dot text and press Enter.' },
      ],
      success: [{ text: 'You found the flag behind Sam’s lock!' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat flag.txt', hint: 'Read Sam’s flag' }], showMe: 'cat flag.txt',
        goal: { type: 'on', host: 'door-lock', goal: { type: 'read', path: '/home/sam/flag.txt' } },
      },
    },
    {
      id: 'submit-flag', title: 'Send Sam the flag',
      lines: [{ text: 'Send the flag to finish Sam’s job.' }],
      hints: [
        { text: 'You showed Sam how his lock could open.' },
        { text: 'Use submit with the whole flag.' },
        { text: 'Type submit, a space, then CLUE and an open brace. Add pets, hyphen, make, hyphen, weak, hyphen, passwords. End with a close brace. Press Enter.' },
      ],
      success: [{ text: 'Job done! Sam gives you a toy train cheer.' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: `submit ${flag}`, hint: 'Send Sam’s flag' }],
        showMe: `submit ${flag}`, goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great work! You earned your Lock Scout badge.' },
    { text: 'Sam can use a long password with no pet names.' },
  ],
};
