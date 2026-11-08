import type { Mission } from '../engine/types';

export const m3Zoo: Mission = {
  id: 'm3-zoo',
  bit: 11,
  order: 11,
  chapter: 'missions',
  requires: ['m2-toys'],
  minutes: 10,
  title: 'The Zany Zoo Code',
  blurb: 'Crack a silly note. Pick a real lock.',
  client: {
    company: 'Zany Zoo',
    contact: 'Zelda Banana Boots',
    art: 'client-m3-zoo',
    allowed: [
      { text: 'Read and decode my scrambled zoo note.' },
      { text: 'Pick a strong password for the pretend zoo computer.' },
    ],
    notAllowed: [
      { text: 'Leave the animal gates and food bins alone.' },
      { text: 'Do not read other zoo notes.' },
    ],
  },
  badge: { id: 'm3-zoo', name: 'Zoo Lock Star', art: 'badge-m3-zoo' },
  intro: [
    { text: 'My zoo note is scrambled. Is that a safe lock?', speaker: 'client' },
    { text: 'Please test it with this permission slip.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'Let us test this pretend note and help Zelda.' },
  ],
  steps: [
    {
      id: 'decode-note',
      title: 'Unscramble the zoo note',
      lines: [
        { text: 'A Caesar code shifts each letter along the alphabet.' },
        { text: 'It is like moving each letter a few seats.' },
        { text: 'This code moved each letter forward by three.' },
        { text: 'Move each letter back three to read it.' },
        { text: 'D turns into A. A wraps back to X.' },
      ],
      hints: [
        { text: 'The lions give a clue to the shift.' },
        { text: 'Use a shift of 3. Read each letter back three.' },
        { text: 'Set the shift to 3. Type FEED THE SEALS.' },
      ],
      success: [
        { text: 'You read the note! The seals want their lunch.' },
        { text: 'You cracked the code. Someone else could crack it too.' },
      ],
      config: {
        kind: 'decoder',
        cipher: 'caesar',
        message: 'IHHG WKH VHDOV',
        shift: 3,
        clue: { text: 'The zoo has 3 lions. Shift back 3 spots!' },
        answer: 'FEED THE SEALS',
      },
    },
    {
      id: 'check-note',
      title: 'What did the note say?',
      lines: [
        { text: 'Zelda wants to check that we read the note.' },
        { text: 'Which zoo friends need their food?' },
      ],
      hints: [
        { text: 'Think of the note you just read.' },
        { text: 'These zoo friends swim and clap their flippers.' },
        { text: 'Type seals as the answer.' },
      ],
      success: [{ text: 'Yes! The seals need food. Zelda will feed them.' }],
      config: {
        kind: 'answer',
        question: { text: 'Which animals does the note say to feed?' },
        answer: 'seals',
        accept: ['the seals', 'seal'],
      },
    },
    {
      id: 'lock-zoo-computer',
      title: 'Give the zoo a real lock',
      lockdown: true,
      lines: [
        { text: 'A scrambled note is a puzzle, not a lock.' },
        { text: 'A strong password is like a key for the zoo computer.' },
        { text: 'Use a long password that others cannot guess.' },
        { text: 'Keep it private. Do not put it in the note.' },
      ],
      hints: [
        { text: 'You just showed that the code can be cracked.' },
        { text: 'The computer needs a strong password to guard its notes.' },
        { text: 'Choose Use a strong password on the zoo computer.' },
      ],
      success: [{ text: 'The zoo computer has a strong password. Its notes are safe!' }],
      config: {
        kind: 'choice',
        question: { text: 'Which fix gives the zoo computer a real lock?' },
        options: [
          {
            id: 'shift-more', label: 'Shift the code by more letters',
            feedback: { text: 'That is still a puzzle. Try a strong password lock.' },
          },
          {
            id: 'strong-password', label: 'Use a strong password on the zoo computer',
            feedback: { text: 'Yes! A strong password guards who can read the notes.' },
          },
          {
            id: 'hide-note', label: 'Hide the note under a desk',
            feedback: { text: 'Someone could look there. Let us pick a real lock.' },
          },
        ],
        correct: ['strong-password'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! The notes have a lock now.', speaker: 'client' },
    { text: 'The seals clap for you. So do I!', speaker: 'client' },
    { text: 'Your Zoo Lock Star badge is here. Job done!' },
    { text: 'Time to rest. Your sidekick will be here.' },
  ],
};
