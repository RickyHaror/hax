import type { FsDir, Mission } from '../engine/types';

const fs: FsDir = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        chief: {
          type: 'dir',
          children: {
            lunch: { type: 'file', content: 'Chief lunch: cheese toast and three peas.' },
            '.graduation_note': {
              type: 'file',
              content: 'BRX DUH D FKLHI DJHQW\nHQ has 3 gold stars. Shift back 3 spots!',
            },
          },
        },
      },
    },
  },
};

export const m7Graduation: Mission = {
  id: 'm7-graduation',
  bit: 15,
  order: 15,
  chapter: 'missions',
  requires: ['m6-socks'],
  minutes: 12,
  title: 'Agent Graduation Day',
  blurb: 'Read the chief\'s secret note. Earn your last badge!',
  client: {
    company: 'Agent HQ',
    contact: 'Chief Wiggles McGee',
    art: 'client-m7-graduation',
    allowed: [
      { text: 'Find and read my hidden note on the HQ computer.', say: 'Find and read my hidden note on the H Q computer.' },
      { text: 'Decode my note. Lock it when done.' },
    ],
    notAllowed: [
      { text: 'Leave the other agents\' files alone.' },
      { text: 'Do not change any passwords.' },
    ],
  },
  badge: { id: 'm7-graduation', name: 'Chief Agent', art: 'badge-m7-graduation' },
  intro: [
    { text: 'One last test before graduation! I hid a coded note.', speaker: 'client' },
    { text: 'I signed this permission slip for you.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'Even at HQ, we ask first.', say: 'Even at H Q, we ask first.' },
  ],
  steps: [
    {
      id: 'find-chief-note',
      title: 'Find the chief\'s note',
      lines: [
        { text: 'We start in the chief\'s folder on the pretend computer.' },
        { text: 'Use ls -a to show the hidden file.', say: 'Use L S, space, dash A to show the hidden file.' },
        { text: 'Then use cat .graduation_note to read it.', say: 'Then use cat, space, dot graduation note to read it.' },
        { text: 'Keep the dot and low line in the name.' },
      ],
      hints: [
        { text: 'The chief hid a file. Look for a dot.' },
        { text: 'Use ls -a, then read the note with cat.', say: 'Use L S, space, dash A, then read the note with cat.' },
        { text: 'Type ls -a, then cat .graduation_note.', say: 'Type L S, space, dash A, then cat, space, dot graduation note.' },
      ],
      success: [
        { text: 'You found the chief\'s code and a gold star clue!' },
        { text: 'Now let us see what the note says.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/chief',
        commands: ['ls', 'cat', 'help', 'clear'],
        goal: { type: 'all', goals: [
          { type: 'run', command: 'ls', args: ['-a'] },
          { type: 'read', path: '/home/chief/.graduation_note' },
        ] },
        chips: ['ls', 'ls -a', 'cat .graduation_note'],
      },
    },
    {
      id: 'decode-chief-note',
      title: 'Read the gold star code',
      lines: [
        { text: 'You have used a Caesar code before.' },
        { text: 'Each letter moved forward a few spots.' },
        { text: 'Use the gold stars to find the shift.' },
        { text: 'Move the letters back to read the note.' },
      ],
      hints: [
        { text: 'Count the gold stars in the clue.' },
        { text: 'There are 3 stars. Shift each letter back 3 spots.' },
        { text: 'Set the shift to 3. Type YOU ARE A CHIEF AGENT.' },
      ],
      success: [
        { text: 'The note says YOU ARE A CHIEF AGENT!' },
        { text: 'One rule to check, then one last lock.' },
      ],
      config: {
        kind: 'decoder',
        cipher: 'caesar',
        message: 'BRX DUH D FKLHI DJHQW',
        shift: 3,
        clue: { text: 'HQ has 3 gold stars. Shift back 3 spots!', say: 'H Q has three gold stars. Shift back three spots!' },
        answer: 'YOU ARE A CHIEF AGENT',
      },
    },
    {
      id: 'check-permission',
      title: 'The chief agent rule',
      lines: [
        { text: 'A chief agent still asks before testing.' },
        { text: 'Think of the slip the chief signed for you.' },
      ],
      hints: [
        { text: 'A badge does not let us test every computer.' },
        { text: 'The owner must say yes first.' },
        { text: 'Choose Permission.' },
      ],
      success: [{ text: 'Yes! Only test what you own or have permission to test.' }],
      config: {
        kind: 'choice',
        question: { text: 'What must an agent get before testing someone else\'s computer?' },
        options: [
          {
            id: 'permission', label: 'Permission',
            feedback: { text: 'Yes! Ask the owner first, just like our slip.' },
          },
          {
            id: 'hat', label: 'A fancy hat',
            feedback: { text: 'A hat can be fun. We need the owner\'s yes first.' },
          },
          {
            id: 'guess', label: 'A lucky guess',
            feedback: { text: 'Let us ask first. The owner must give permission.' },
          },
        ],
        correct: ['permission'],
      },
    },
    {
      id: 'lock-chief-note',
      title: 'One last lock',
      lockdown: true,
      lines: [
        { text: 'A hidden file is like a note taped under a desk.' },
        { text: 'Anyone who looks there can read it.' },
        { text: 'Hidden is not locked. A code is not a lock either.' },
        { text: 'Use lock .graduation_note to lock the note.', say: 'Use lock, space, dot graduation note to lock the note.' },
      ],
      hints: [
        { text: 'The chief asked us to lock the note when done.' },
        { text: 'Use lock with the hidden file name.' },
        { text: 'Type lock .graduation_note and press Enter.', say: 'Type lock, space, dot graduation note and press Enter.' },
      ],
      success: [{ text: 'The note is locked. Your last test is done!' }],
      config: {
        kind: 'terminal', fs, cwd: '/home/chief',
        commands: ['ls', 'cat', 'lock', 'help', 'clear'],
        goal: { type: 'locked', path: '/home/chief/.graduation_note' },
        chips: ['ls -a', 'cat .graduation_note', 'lock .graduation_note'],
      },
    },
  ],
  outro: [
    { text: 'You did it! You are a Chief Agent now.', speaker: 'client' },
    { text: 'I am so proud of your kind, careful work.', speaker: 'client' },
    { text: 'I am proud of you too! We make a great team.', speaker: 'sidekick' },
    { text: 'Your Chief Agent badge is here. Time for a well-earned rest!' },
  ],
};
