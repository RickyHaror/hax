import { HackSession, HACK_COMMANDS } from './hack';
import type { FsDir, Machine, Mission } from './types';

export function files(): FsDir {
  return { type: 'dir', children: {
    home: { type: 'dir', children: { admin: { type: 'dir', children: {
      docs: { type: 'dir', children: { note: { type: 'file', content: 'A note' } } },
      note: { type: 'file', content: 'Hello agent\nA clue\nHELLO again' },
      clue: { type: 'file', content: 'Here is CLUE{Case-Matters} for HQ.' },
      vault: { type: 'file', content: 'A quiet clue', locked: true },
      '.hidden': { type: 'file', content: 'Hidden clue' },
      'my "best" note': { type: 'file', content: 'A quoted note' },
      blank: { type: 'file', content: '' },
    } } } },
  } };
}

export function target(overrides: Partial<Machine> = {}): Machine {
  return { host: 'shop-pc', owner: 'Corner Shop', user: 'admin', color: 'shop',
    home: '/home/admin', fs: files(), banner: ['Welcome to the shop.'],
    sudo: { password: 'root-code', accept: ['root alias'] },
    ports: [{ port: 22, name: 'terminal', open: true }, { port: 80, name: 'web', open: false }],
    mail: [
      { id: '1', from: 'A friend', subject: 'A safe note', body: ['Have a nice day.'] },
      { id: '2', from: 'A trick sender', subject: 'A trick note', body: ['Share your password.'], fake: true },
    ],
    pages: [{ address: 'shop.example/staff', title: 'Staff', source: ['<!-- A hidden clue -->'] }],
    ...overrides };
}

export function mission(overrides: Partial<Mission> = {}): Mission {
  return { id: 'test', bit: 20, chapter: 'missions', order: 1, title: 'A shop clue',
    blurb: 'Find a clue.', minutes: 5, requires: [], badge: { id: 'test', name: 'Test', art: 'test' },
    intro: [], steps: [], outro: [], machines: [target(), target({ host: 'bakery-pc', owner: 'Bakery' }),
      target({ host: 'school-pc', owner: 'School' })],
    contract: { client: { name: 'Sam', role: 'Owner' }, problem: { text: 'Find the shop clue.' },
      goal: { text: 'Send the clue to HQ.' }, allowed: ['shop-pc', 'bakery-pc'], flag: 'CLUE{Case-Matters}' },
    ...overrides };
}

export function run(session: HackSession, input: string, allowed = HACK_COMMANDS) {
  return session.run(input, allowed);
}

export function connected(overrides: Partial<Mission> = {}): HackSession {
  const session = new HackSession(mission(overrides));
  run(session, 'connect shop-pc');
  return session;
}

export function text(session: HackSession, input: string): string[] {
  return run(session, input).lines.map((line) => line.text);
}
