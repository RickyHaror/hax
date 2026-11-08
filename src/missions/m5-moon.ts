import type { FsDir, Mission } from '../engine/types';

const doorLog = [
  '3:00 AM  Sneaky Sam  door opened',
  '9:00 AM  Stella  door opened',
  '9:05 AM  Stella  door closed',
  '10:00 AM  Pip  door opened',
  '10:05 AM  Pip  door closed',
  '12:00 PM  Luna  door opened',
  '12:05 PM  Luna  door closed',
  '4:00 PM  Stella  door opened',
  '4:05 PM  Stella  door closed',
];

const fs: FsDir = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        agent: {
          type: 'dir',
          children: {
            museum: {
              type: 'dir',
              children: {
                'door.log': { type: 'file', content: doorLog.join('\n') },
              },
            },
          },
        },
      },
    },
  },
};

export const m5Moon: Mission = {
  id: 'm5-moon',
  bit: 13,
  order: 13,
  chapter: 'missions',
  requires: ['m4-cupcake'],
  minutes: 14,
  title: 'The Moon Base Museum Mystery',
  blurb: 'Find an odd door log clue. Make the moon doors safer.',
  client: {
    company: 'Moon Base Museum',
    contact: 'Captain Cosmo Crumpet',
    art: 'client-m5-moon',
    allowed: [
      { text: 'Read the museum door log.' },
      { text: 'Help make our doors safer.' },
    ],
    notAllowed: [
      { text: 'Leave the moon rocks and the gift shop alone.' },
      { text: 'Do not read staff mail.' },
    ],
  },
  badge: { id: 'm5-moon', name: 'Log Detective', art: 'badge-m5-moon' },
  intro: [
    { text: 'A moon rock got moved in the night!', speaker: 'client' },
    { text: 'Please help. This slip gives you permission to read our log.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'We will look for clues on the pretend museum computer.' },
  ],
  steps: [
    {
      id: 'read-door-log',
      title: 'Find the door diary',
      lines: [
        { text: 'A log is like a diary the computer keeps.' },
        { text: 'It writes down what happens and when.' },
        { text: 'Use ls to find the museum folder.', say: 'Use L S to find the museum folder.' },
        { text: 'Use cd museum to go inside. Then use ls.', say: 'Use C D museum to go inside. Then use L S.' },
        { text: 'Use cat door.log to read the log.', say: 'Use cat door dot log to read the log.' },
      ],
      hints: [
        { text: 'Look for the folder with the museum name.' },
        { text: 'Go inside the museum folder with cd museum.', say: 'Go inside the museum folder with C D museum.' },
        { text: 'Type ls. Then cd museum. Then ls and cat door.log.', say: 'Type L S. Then C D museum. Then L S and cat door dot log.' },
      ],
      success: [
        { text: 'You found the door diary! Let us check the names.' },
        { text: 'Each line tells us who used the door and when.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cd', 'pwd', 'cat', 'help', 'clear'],
        goal: { type: 'all', goals: [
          { type: 'cwd', path: '/home/agent/museum' },
          { type: 'read', path: '/home/agent/museum/door.log' },
        ] },
        chips: ['ls', 'cd museum', 'ls', 'cat door.log'],
      },
    },
    {
      id: 'find-odd-name',
      title: 'Who came for moon rocks?',
      lines: [
        { text: 'Stella, Pip, and Luna work here in the day.', speaker: 'client' },
        { text: 'The museum is closed at night.', speaker: 'client' },
        { text: 'Look for a name and time that seem odd.' },
      ],
      hints: [
        { text: 'One line looks different from the rest.' },
        { text: 'Look for a time when the museum is closed.' },
        { text: 'Pick Sneaky Sam.' },
      ],
      success: [
        { text: 'Sneaky Sam is not on the staff list!' },
        { text: 'He just wanted to see the moon rocks.', speaker: 'client' },
        { text: 'He still needs permission to come in.' },
      ],
      config: {
        kind: 'log-read',
        fileName: 'door.log',
        lines: doorLog,
        question: { text: 'Who snuck in when the museum was closed?' },
        options: [
          { id: 'stella', label: 'Stella' },
          { id: 'pip', label: 'Pip' },
          { id: 'sneaky-sam', label: 'Sneaky Sam' },
          { id: 'luna', label: 'Luna' },
        ],
        correct: 'sneaky-sam',
      },
    },
    {
      id: 'find-odd-time',
      title: 'When did Sam come in?',
      lines: [
        { text: 'Read the time next to Sam in the log.' },
        { text: 'AM can mean early morning, while we are still asleep.' },
      ],
      hints: [
        { text: 'Find the line with Sam, then check its time.' },
        { text: 'His line is at the top. It says AM.' },
        { text: 'Pick 3:00 AM.', say: 'Pick three in the morning.' },
      ],
      success: [
        { text: 'Yes! Sam came in at three in the morning.' },
        { text: 'The door log helped us spot the odd visit.' },
      ],
      config: {
        kind: 'log-read',
        fileName: 'door.log',
        lines: doorLog,
        question: { text: 'What time did Sneaky Sam come in?' },
        options: [
          { id: 'nine-am', label: '9:00 AM' },
          { id: 'three-am', label: '3:00 AM' },
          { id: 'four-pm', label: '4:00 PM' },
        ],
        correct: 'three-am',
      },
    },
    {
      id: 'change-door-code',
      title: 'Give the door a new code',
      lockdown: true,
      lines: [
        { text: 'Sam got in. The old door code needs a change.' },
        { text: 'A door code is like a secret key for staff.' },
        { text: 'Keep the new code secret so it stays safe.' },
      ],
      hints: [
        { text: 'The old code let someone in at night.' },
        { text: 'We need a fresh code that stays secret.' },
        { text: 'Choose Pick a new secret door code.' },
      ],
      success: [{ text: 'The door has a new secret code. Nice work!' }],
      config: {
        kind: 'choice',
        question: { text: 'How should we make the door code safer?' },
        options: [
          {
            id: 'keep-code', label: 'Keep the old code',
            feedback: { text: 'Sam got in with that code. Let us change it.' },
          },
          {
            id: 'new-code', label: 'Pick a new secret door code',
            feedback: { text: 'Yes! The old code will no longer open the door.' },
          },
          {
            id: 'door-note', label: 'Write the code on the door',
            feedback: { text: 'Someone could read it there. Keep the new code secret.' },
          },
        ],
        correct: ['new-code'],
      },
    },
    {
      id: 'turn-on-alert',
      title: 'Help the keeper spot night visits',
      lockdown: true,
      lines: [
        { text: 'An alert is like a bell for the museum keeper.' },
        { text: 'It tells staff when a door opens at night.' },
        { text: 'Staff can check the log and see what happened.' },
      ],
      hints: [
        { text: 'The keeper needs to know about night visits.' },
        { text: 'Pick the alert that spots a door opening at night.' },
        { text: 'Choose Turn on an alert when a door opens at night.' },
      ],
      success: [{ text: 'The night alert is on. Staff can check each visit!' }],
      config: {
        kind: 'choice',
        question: { text: 'What helps staff spot a door opening at night?' },
        options: [
          {
            id: 'lunch-bell', label: 'Ring a bell at lunch',
            feedback: { text: 'Lunch bells are fun. Try an alert for night visits.' },
          },
          {
            id: 'moon-song', label: 'Sing a song to the moon',
            feedback: { text: 'A moon song sounds fun. Staff need a door alert too.' },
          },
          {
            id: 'night-alert', label: 'Turn on an alert when a door opens at night',
            feedback: { text: 'Yes! Staff will know when to check the door log.' },
          },
        ],
        correct: ['night-alert'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! Our doors are safer now.', speaker: 'client' },
    { text: 'I will ask Sam to visit in the day.', speaker: 'client' },
    { text: 'You earned the Log Detective badge!' },
    { text: 'Case closed. Time for a rest with your sidekick.' },
  ],
};
