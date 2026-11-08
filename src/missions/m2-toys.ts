import type { Mission } from '../engine/types';

export const m2Toys: Mission = {
  id: 'm2-toys',
  bit: 10,
  order: 10,
  chapter: 'missions',
  retired: true,
  requires: ['m1-pizza'],
  minutes: 10,
  title: 'The Wobbly Web Secret',
  blurb: 'Find a password left in the toy shop code.',
  client: {
    company: 'Wobbly Toy Factory',
    contact: 'Wanda Wobble Socks',
    art: 'client-m2-toys',
    allowed: [
      { text: 'Read the code on our pretend toy website.' },
      { text: 'Test our pretend admin login. Pick a safe fix.' },
    ],
    notAllowed: [
      { text: 'Leave the toy robots and orders alone.' },
      { text: 'Do not try this password on other sites.' },
    ],
  },
  badge: { id: 'm2-toys', name: 'Web Secret Scout', art: 'badge-m2-toys' },
  intro: [
    { text: 'Our toy website has a secret loose screw!', speaker: 'client' },
    { text: 'Please find it. This slip says where to look.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'All these toys and tools are pretend.' },
  ],
  steps: [
    {
      id: 'read-web-code',
      title: 'Peek behind the page',
      lines: [
        { text: 'Page code is like a toy build plan.' },
        { text: 'A comment is a note left in that plan.' },
        { text: 'It may not show on the page. Readers can find it.' },
        { text: 'Open View Code. Find the admin password in the comment.' },
      ],
      hints: [
        { text: 'The secret is in a note behind the page.' },
        { text: 'Choose View Code. Look for the word password.' },
        { text: 'Open View Code. Type wobblebeans as the answer.' },
      ],
      success: [
        { text: 'You found the password in the code comment!' },
        { text: 'A comment is no safe home for a secret.' },
      ],
      config: {
        kind: 'web-source',
        page: {
          title: 'Wobbly Toy Factory',
          address: 'wobbly-toys.pretend',
          blocks: [
            { type: 'heading', text: 'Welcome to Wobbly Toys!' },
            { type: 'text', text: 'Our robots wiggle. Our ducks do flips.' },
            { type: 'button', text: 'Meet the toys' },
          ],
        },
        source: '<h1>Welcome to Wobbly Toys!</h1>\n<!-- admin password: wobblebeans -->\n<p>Our robots wiggle.</p>',
        answer: 'wobblebeans',
      },
    },
    {
      id: 'test-login',
      title: 'Test the pretend login',
      lines: [
        { text: 'The slip lets us test this pretend admin login.' },
        { text: 'Admin means the person who can change the website.' },
        { text: 'Try the password from the comment here.' },
      ],
      hints: [
        { text: 'Use the secret you just found.' },
        { text: 'The comment said admin password: wobblebeans.' },
        { text: 'Type wobblebeans as the password.' },
      ],
      success: [
        { text: 'It worked. A code reader could get in!' },
        { text: 'We found the hole. Now let us fix it.' },
      ],
      config: {
        kind: 'answer',
        question: { text: 'What password opens this pretend admin login?' },
        answer: 'wobblebeans',
      },
    },
    {
      id: 'fix-web-secret',
      title: 'Fix the loose secret',
      lockdown: true,
      lines: [
        { text: 'Someone may have read the old password, just like us.' },
        { text: 'We need to remove the note and change the password.' },
        { text: 'A new password must stay out of page code.' },
      ],
      hints: [
        { text: 'The old password is no longer secret.' },
        { text: 'Fix both the code comment and the old password.' },
        { text: 'Choose Delete the comment and change the password.' },
      ],
      success: [{ text: 'The comment is gone. The old password no longer works!' }],
      config: {
        kind: 'choice',
        question: { text: 'How should we lock down the toy website?' },
        options: [
          {
            id: 'small-comment', label: 'Make the comment smaller',
            feedback: { text: 'Small notes can still be read. Try a new password too.' },
          },
          {
            id: 'remove-and-change', label: 'Delete the comment and change the password',
            feedback: { text: 'Yes! Remove the secret and make the old password stop working.' },
          },
          {
            id: 'big-comment', label: 'Hide it in a bigger comment',
            feedback: { text: 'A bigger note still holds the secret. Try removing it.' },
          },
        ],
        correct: ['remove-and-change'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! Our web secret is fixed.', speaker: 'client' },
    { text: 'The robots do a wobbly dance for you!', speaker: 'client' },
    { text: 'Your Web Secret Scout badge is here. Time for a rest.' },
  ],
};
