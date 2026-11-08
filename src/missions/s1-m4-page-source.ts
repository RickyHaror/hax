import type { Mission } from '../engine/types';

const flag = 'CLUE{page-source-is-public}';

export const s1m4PageSource: Mission = {
  id: 's1-m4-page-source',
  bit: 19,
  order: 19,
  chapter: 'season',
  season: 's1',
  requires: ['s1-m3-hidden-folder'],
  xp: 20,
  minutes: 10,
  title: 'The Bakery Page',
  blurb: 'Find a secret in the bakery page source.',
  badge: { id: 's1-m4-page-source', name: 'Source Star', art: 'badge-s1' },
  contract: {
    client: { name: 'Bea', role: 'Sunny Bakery owner and bun taster' },
    problem: { text: 'My web page may show a secret.' },
    goal: { text: 'Find the secret and bring back my flag.' },
    allowed: ['bakery-web'],
    flag,
  },
  alarm: { limit: 5 },
  teaches: ['view-source'],
  machines: [{
    host: 'bakery-web', owner: 'Sunny Bakery', user: 'admin', color: 'bakery',
    banner: ['Sunny Bakery', 'Fresh buns and warm smiles!'],
    home: '/home/admin',
    login: { user: 'admin', password: 'cupcake42' },
    fs: {
      type: 'dir', children: {
        home: { type: 'dir', children: {
          admin: { type: 'dir', children: {
            'flag.txt': { type: 'file', content: flag },
          } },
        } },
      },
    },
    pages: [{
      address: 'sunny-bakery.example',
      title: 'Sunny Bakery',
      source: [
        '<!doctype html>',
        '<html>',
        '<head><title>Sunny Bakery</title></head>',
        '<body>',
        '<h1>Warm buns!</h1>',
        '<p>Come for a cake.</p>',
        '<!-- admin password: cupcake42 -->',
        '<p>Bea says hello!</p>',
        '</body>',
        '</html>',
      ],
    }],
  }],
  intro: [
    { text: 'Bea has a new job for you.', speaker: 'narrator' },
    { text: 'Please check my bakery page.', speaker: 'client' },
    { text: 'We only hack what we own or have permission to hack.' },
    { text: 'A page source shows the words behind a web page.' },
  ],
  steps: [
    {
      id: 'read-source', title: 'Peek at the page',
      lines: [
        { text: 'Use view-source to peek behind the page.' },
        { text: 'Look for a note with a password.' },
      ],
      hints: [
        { text: 'The page may have a secret note.' },
        { text: 'Use view-source with the bakery address.' },
        { text: 'Type view-source, a space, then sunny, hyphen, bakery.example. Press Enter.',
          say: 'Type view source, space, sunny bakery dot example. Press Enter.' },
      ],
      success: [{ text: 'You found the admin password in a note!' }],
      config: {
        kind: 'hack', start: 'hq', commands: ['view-source', 'help', 'clear'],
        chips: [{ command: 'view-source sunny-bakery.example', hint: 'Read the source' }],
        showMe: 'view-source sunny-bakery.example',
        goal: { type: 'run', command: 'view-source', args: ['sunny-bakery.example'] },
      },
    },
    {
      id: 'bakery-login', title: 'Try the secret',
      lines: [
        { text: 'Connect to Bea’s web server. Use admin as the user.' },
        { text: 'When it asks, type the password cupcake42.' },
      ],
      hints: [
        { text: 'Use the secret from the page note.' },
        { text: 'The user is admin. The password is cupcake42.' },
        { text: 'Type connect, a space, then bakery, hyphen, web. Press Enter.' },
      ],
      success: [{ text: 'You are in! Bea can fix this hole.' }],
      config: {
        kind: 'hack', commands: ['connect', 'login', 'help', 'clear'],
        chips: [{ command: 'connect bakery-web', hint: 'Visit the bakery' }],
        showMe: 'connect bakery-web', goal: { type: 'logged-in', host: 'bakery-web' },
      },
    },
    {
      id: 'read-flag', title: 'Find Bea’s flag',
      lines: [
        { text: 'Read flag.txt with cat.', say: 'Read flag dot text with cat.' },
      ],
      hints: [
        { text: 'The flag is in your home folder.' },
        { text: 'Use cat to read the flag file.' },
        { text: 'Type cat flag.txt and press Enter.',
          say: 'Type cat, space, flag dot text and press Enter.' },
      ],
      success: [{ text: 'You found Bea’s flag. Great work!' }],
      config: {
        kind: 'hack', commands: ['ls', 'cat', 'cd', 'pwd', 'help', 'clear'],
        chips: [{ command: 'cat flag.txt', hint: 'Read the flag' }],
        showMe: 'cat flag.txt',
        goal: { type: 'on', host: 'bakery-web', goal: { type: 'read', path: '/home/admin/flag.txt' } },
      },
    },
    {
      id: 'submit-flag', title: 'Send the flag',
      lines: [{ text: 'Send the flag to finish Bea’s job.' }],
      hints: [
        { text: 'Your flag proves you found the hole.' },
        { text: 'Use submit with the whole flag.' },
        { text: 'Type submit, a space, then CLUE and an open brace. Add page, hyphen, source, hyphen, is, hyphen, public. End with a close brace. Press Enter.' },
      ],
      success: [{ text: 'Job done! Bea gives you a bun cheer!' }],
      config: {
        kind: 'hack', commands: ['submit', 'help', 'clear'],
        chips: [{ command: `submit ${flag}`, hint: 'Send Bea’s flag' }],
        showMe: `submit ${flag}`, goal: { type: 'flag' },
      },
    },
  ],
  outro: [
    { text: 'Great find! You earned your Source Star badge.' },
    { text: 'Bea can change the password and remove the page note.' },
  ],
};
