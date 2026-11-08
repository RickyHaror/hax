import { HACK_COMMANDS } from '../../engine/hack';
import type { HackConfig, Mission, Step } from '../../engine/types';

function step(id: string, title: string, config: HackConfig): Step {
  return { id, title, config, lines: [{ text: 'Our shop needs your help.' }],
    hints: [{ text: 'Look at the chip.' }, { text: 'Visit shop-pc. Sign in as admin.' },
      { text: 'Use the command. Then press Enter.' }], success: [{ text: 'Nice work, Agent!' }] };
}

export function hackMission(): Mission {
  return { id: 'hack-fixture', bit: 21, chapter: 'missions', order: 1, title: 'The shop clue',
    blurb: 'Find our shop clue.', minutes: 3, requires: [],
    badge: { id: 'shop', name: 'Shop star', art: 'missing' },
    intro: [{ text: 'Help our shop.' }], outro: [{ text: 'Our shop is safe.' }],
    client: { company: 'Corner Shop', contact: 'Sam', art: 'missing',
      allowed: [{ text: 'Test shop-pc.' }], notAllowed: [{ text: 'Leave other computers alone.' }] },
    contract: { client: { name: 'Sam', role: 'Shop owner' }, problem: { text: 'Find our clue.' },
      goal: { text: 'Send our clue to HQ.' }, allowed: ['shop-pc'], flag: 'CLUE{shop-safe}' },
    alarm: { limit: 2 },
    machines: [{ host: 'shop-pc', owner: 'Corner Shop', user: 'admin', color: 'shop',
      home: '/home/admin', banner: ['Welcome to the shop.'],
      login: { user: 'admin', password: 'apple-code' }, sudo: { password: 'root-code' },
      fs: { type: 'dir', children: { home: { type: 'dir', children: { admin: { type: 'dir', children: {
        'clue.txt': { type: 'file', content: 'CLUE{shop-safe}' },
        'vault.txt': { type: 'file', content: 'A quiet clue.', locked: true },
        docs: { type: 'dir', children: { note: { type: 'file', content: 'A shop note.' } } },
      } } } } } } }],
    steps: [step('visit', 'Visit the shop', { kind: 'hack', commands: [...HACK_COMMANDS],
      chips: [{ command: 'connect shop-pc', hint: 'visit our shop' }], showMe: 'connect shop-pc',
      goal: { type: 'all', goals: [{ type: 'connected', host: 'shop-pc' }, { type: 'logged-in', host: 'shop-pc' }] } }),
    step('send', 'Send the clue', { kind: 'hack', commands: ['cat', 'submit', 'pwd', 'help'],
      chips: [{ command: 'cat clue.txt', hint: 'read the clue' }], showMe: 'submit clue.txt', goal: { type: 'flag' } })],
  };
}
