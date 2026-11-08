import type { Mission } from '../engine/types';

export const b5Passwords: Mission = {
  id: 'b5-passwords',
  bit: 5,
  order: 5,
  chapter: 'bootcamp',
  title: 'Password Power',
  blurb: 'Build a secret word team. Learn who to trust.',
  minutes: 10,
  requires: ['b4-files'],
  badge: { id: 'b5-passwords', name: 'Password Power', art: 'badge-b5-passwords' },
  intro: [
    { text: 'Our last Boot Camp quest is about secrets.' },
    { text: 'Use pretend words here. Do not type a real password.' },
  ],
  steps: [
    {
      id: 'secret-handshake',
      title: 'A secret for the door',
      lines: [
        { text: 'A password is like a secret handshake for a door.' },
        { text: 'It lets the right person in. Keep it safe.' },
      ],
      hints: [
        { text: 'Think of a secret way to say hello.' },
        { text: 'Your password should be secret, like a special handshake.' },
        { text: 'Choose A secret handshake.' },
      ],
      success: [{ text: 'That is it! A secret helps guard the door.' }],
      config: {
        kind: 'choice',
        question: { text: 'What is a password like?' },
        options: [
          { id: 'handshake', label: 'A secret handshake', feedback: { text: 'Yes! It is a secret way in.' } },
          { id: 'sign', label: 'A sign for everyone', feedback: { text: 'A sign is for all to see. Try the secret.' } },
        ],
        correct: ['handshake'],
      },
    },
    {
      id: 'strong-password',
      title: 'Pick a strong secret',
      lines: [
        { text: 'A long password is harder to guess.' },
        { text: 'Skip your name and easy lists like 1234.' },
        { text: 'A few words can make a strong secret team.' },
      ],
      hints: [
        { text: 'Look for the longest secret.' },
        { text: 'Three words are harder to guess than a short list.' },
        { text: 'Choose moss river plum.' },
      ],
      success: [{ text: 'Good pick! Those words make a longer secret.' }],
      config: {
        kind: 'choice',
        question: { text: 'Which of these three passwords is strongest?' },
        options: [
          { id: 'numbers', label: '1234', feedback: { text: 'That short list is easy to guess. Try more words.' } },
          { id: 'password', label: 'password', feedback: { text: 'Lots of people try that word. Pick a longer secret.' } },
          { id: 'word-team', label: 'moss river plum', feedback: { text: 'Yes! Three words make a longer secret.' } },
        ],
        correct: ['word-team'],
      },
    },
    {
      id: 'word-team',
      title: 'Build a passphrase',
      lines: [
        { text: 'A passphrase is a password made from a few words.' },
        { text: 'Pick three word tiles for a pretend secret.' },
        { text: 'This is just for play. Keep real passwords private.' },
      ],
      hints: [
        { text: 'Look at the word tiles. Which ones do you like?' },
        { text: 'Pick any three tiles. Each word helps your secret grow.' },
        { text: 'Click kite, then frog, then moon.' },
      ],
      success: [{ text: 'A fine word team! You made a passphrase.' }],
      config: {
        kind: 'passphrase',
        words: ['kite', 'frog', 'moon', 'duck', 'leaf', 'sock', 'boat', 'star', 'pond', 'cake'],
        count: 3,
      },
    },
    {
      id: 'sharing',
      title: 'Keep your secret safe',
      lines: [
        { text: 'Never share a password, except with a grown-up you trust.' },
        { text: 'Ask that grown-up for help if you are unsure.' },
      ],
      hints: [
        { text: 'A password keeps your things safe.' },
        { text: 'Friends can play without knowing your secret.' },
        { text: 'Choose Only a grown-up I trust.' },
      ],
      success: [{ text: 'Yes! A grown-up you trust can help keep you safe.' }],
      config: {
        kind: 'choice',
        question: { text: 'Who may you share a password with?' },
        options: [
          { id: 'friend', label: 'Any friend', feedback: { text: 'Keep it secret from friends. Ask a grown-up you trust.' } },
          { id: 'grown-up', label: 'Only a grown-up I trust', feedback: { text: 'Yes! Share only with a grown-up you trust.' } },
          { id: 'everyone', label: 'Everyone', feedback: { text: 'That would let anyone in. Keep your secret safe.' } },
        ],
        correct: ['grown-up'],
      },
    },
  ],
  outro: [
    { text: 'You earned Password Power! Boot Camp is done.' },
    { text: 'You can stop here. Stretch, rest, and feel proud.' },
    { text: 'Next time, we can try the terminal together.' },
  ],
};
