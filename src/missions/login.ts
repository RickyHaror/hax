import type { Mission } from '../engine/types';

export const LOGIN_PASSWORD = 'pickle42';

export const login: Mission = {
  id: 'login',
  bit: 0,
  order: 0,
  chapter: 'login',
  requires: [],
  minutes: 1,
  title: 'The Front Door',
  blurb: 'Find the note. Open the door!',
  badge: { id: 'front-door', name: 'The Front Door', art: 'badge-login' },
  intro: [
    { text: 'Welcome to AGENT HQ! I am your sidekick.' },
    { text: 'Let us open the front door.' },
  ],
  steps: [
    {
      id: 'door',
      art: 'login-screen',
      title: 'Find the password',
      lines: [{ text: 'A password is like a secret handshake.' }],
      hints: [
        { text: 'Look at the monitor.' },
        { text: 'Look for the yellow sticky note.' },
        { text: `Type ${LOGIN_PASSWORD} and press Enter` },
      ],
      success: [
        { text: 'Woohoo! You found the way in!' },
        { text: 'A password on a sticky note is a security hole.' },
        { text: 'Anyone could read it and get in.' },
        { text: 'This is a practice computer made just for you.' },
      ],
      config: {
        kind: 'answer',
        question: { text: 'What password is on the sticky note?' },
        answer: LOGIN_PASSWORD,
        accept: [LOGIN_PASSWORD.toUpperCase()],
      },
    },
  ],
  outro: [
    { text: 'Next stop: Boot Camp!' },
    { text: 'We will learn to use your mouse and keys.' },
  ],
};
