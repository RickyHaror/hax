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
            staff: {
              type: 'dir',
              children: {
                'baker.txt': {
                  type: 'file',
                  content: 'My name is Barry Buttercream.\nMy dog is named Sprinkles.\nSprinkles was born in 2019.\nI bake cakes shaped like socks.',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const m4Cupcake: Mission = {
  id: 'm4-cupcake',
  bit: 12,
  order: 12,
  chapter: 'missions',
  requires: ['m3-zoo'],
  minutes: 14,
  title: 'The Cupcake Castle Password',
  blurb: 'Guess a weak password. Help the baker pick strong words.',
  client: {
    company: 'Cupcake Castle',
    contact: 'Barry Buttercream',
    art: 'client-m4-cupcake',
    allowed: [
      { text: 'Try to guess my login password on the pretend bakery computer.' },
      { text: 'Help me pick a better password.' },
    ],
    notAllowed: [
      { text: 'Leave the recipes and the cash box alone.' },
      { text: "Do not try anyone else's password." },
    ],
  },
  badge: { id: 'm4-cupcake', name: 'Password Pastry Pro', art: 'badge-m4-cupcake' },
  intro: [
    { text: 'I worry my password is too easy to guess!', speaker: 'client' },
    { text: 'I give written permission on this slip. Please try guessing it.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'We only guess because Barry said yes in writing.' },
  ],
  steps: [
    {
      id: 'read-baker-profile',
      title: 'Find the baker file',
      lines: [
        { text: 'Let us read about Barry to find password clues.' },
        { text: 'People often use clues from their lives in passwords.' },
        { text: 'Start in your agent folder. Use ls to look around.', say: 'Start in your agent folder. Use L S to look around.' },
        { text: 'Use cd staff to walk into the staff folder.', say: 'Use C D staff to walk into the staff folder.' },
        { text: 'Use cat baker.txt to read his file.', say: 'Use cat baker dot T X T to read his file.' },
      ],
      hints: [
        { text: 'The staff folder holds a file about Barry.' },
        { text: 'Walk into staff. Then read baker.txt with cat.', say: 'Walk into staff. Then read baker dot T X T with cat.' },
        { text: 'Type cd and press Enter. Then type cd staff, then cat baker.txt.', say: 'Type C D and press Enter. Then type C D staff, then cat baker dot T X T.' },
      ],
      success: [
        { text: 'Sprinkles and a birth year! Keep those clues in mind.' },
        { text: 'Now let us try them on the baker card.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cd', 'pwd', 'cat', 'help', 'clear'],
        goal: { type: 'all', goals: [
          { type: 'cwd', path: '/home/agent/staff' },
          { type: 'read', path: '/home/agent/staff/baker.txt' },
        ] },
        chips: ['cd', 'ls', 'cd staff', 'ls', 'cat baker.txt'],
      },
    },
    {
      id: 'guess-password',
      title: 'Read the baker card',
      lines: [
        { text: 'A password is like a secret handshake for a computer.' },
        { text: 'People often use pet names and birthdays as passwords.' },
        { text: 'These clues can make a password easy to guess.' },
        { text: 'Read the card. Try a password for the username barry.' },
      ],
      hints: [
        { text: 'Read the baker card for clues.' },
        { text: "Try his dog's name with the year it was born." },
        { text: 'Type sprinkles2019 as the password.', say: 'Type sprinkles, then two zero one nine, as the password.' },
      ],
      success: [
        { text: 'You guessed it! That password was too easy to guess.' },
        { text: 'The pet name and birth year gave it away.' },
      ],
      config: {
        kind: 'password-guess',
        profile: {
          name: 'Barry Buttercream',
          art: 'profile-m4-cupcake',
          facts: [
            { text: 'My dog is named Sprinkles.', speaker: 'client' },
            { text: 'Sprinkles was born in 2019.', speaker: 'client' },
            { text: 'I bake cakes shaped like socks.', speaker: 'client' },
          ],
        },
        username: 'barry',
        password: 'sprinkles2019',
        accept: ['sprinkles 2019', '2019sprinkles'],
      },
    },
    {
      id: 'check-clues',
      title: 'What gave it away?',
      lines: [
        { text: 'Barry wants to know why his password was weak.' },
        { text: 'Which clues helped you guess it?' },
      ],
      hints: [
        { text: 'Think about the baker card.' },
        { text: "You used his dog's name and a birth year." },
        { text: 'Choose His pet name and birth year.' },
      ],
      success: [{ text: 'Yes! Others could guess those clues too.' }],
      config: {
        kind: 'choice',
        question: { text: 'Why was the password easy to guess?' },
        options: [
          {
            id: 'pet-and-year', label: 'His pet name and birth year',
            feedback: { text: 'Yes! Both clues were right there on his card.' },
          },
          {
            id: 'sock-cakes', label: 'His cakes look like socks',
            feedback: { text: 'Silly cakes make us smile. Try the clues in the password.' },
          },
          {
            id: 'cupcake-smell', label: 'The computer smells like cake',
            feedback: { text: 'A sweet smell gives no password clue. Read the card again.' },
          },
        ],
        correct: ['pet-and-year'],
      },
    },
    {
      id: 'build-passphrase',
      title: 'Bake a strong passphrase',
      lockdown: true,
      lines: [
        { text: 'A passphrase is a password made from words.' },
        { text: 'Three random words make it long and hard to guess.' },
        { text: 'A silly word picture can be easy to remember.' },
        { text: 'Pick three words for Barry. Leave out pet names and birthdays.' },
      ],
      hints: [
        { text: 'Think of a silly picture made from words.' },
        { text: 'Pick three different word tiles.' },
        { text: 'Choose moon, boots, and waffle.' },
      ],
      success: [{ text: 'A long word team! Barry has a strong new passphrase.' }],
      config: {
        kind: 'passphrase',
        words: ['moon', 'boots', 'waffle', 'frog', 'cloud', 'drum', 'plum', 'kite'],
        count: 3,
      },
    },
    {
      id: 'keep-password-safe',
      title: 'Keep the sweet secret safe',
      lockdown: true,
      lines: [
        { text: 'Never use pet names or birthdays in a password.' },
        { text: 'Do not share it. Keep your secret safe.' },
        { text: 'Longer is stronger. Pick a good rule for Barry.' },
      ],
      hints: [
        { text: 'Think of ways to keep the new password safe.' },
        { text: 'Good rules keep clues and secrets out of sight.' },
        { text: 'Choose Never use pet names or birthdays.' },
      ],
      success: [{ text: 'Barry knows the rules. His password has a strong start!' }],
      config: {
        kind: 'choice',
        question: { text: 'Which rule helps keep a password safe?' },
        options: [
          {
            id: 'no-pet-clues', label: 'Never use pet names or birthdays',
            feedback: { text: 'Yes! Those clues can be easy to find.' },
          },
          {
            id: 'keep-secret', label: 'Do not share it',
            feedback: { text: 'Yes! Keep your password secret.' },
          },
          {
            id: 'make-long', label: 'Longer is stronger',
            feedback: { text: 'Yes! Long, random words are hard to guess.' },
          },
          {
            id: 'dog-name', label: "Use your dog's name",
            feedback: { text: 'We just guessed a pet name. Try random words instead.' },
          },
          {
            id: 'oven-note', label: 'Tape it to the oven',
            feedback: { text: 'Someone could read it there. Keep the password secret.' },
          },
        ],
        correct: ['no-pet-clues', 'keep-secret', 'make-long'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! My password is much harder to guess.', speaker: 'client' },
    { text: 'Sprinkles gives you a happy tail wag!', speaker: 'client' },
    { text: 'You earned the Password Pastry Pro badge!' },
    { text: 'Job done. Time for a rest with your sidekick.' },
  ],
};
