import type { FsDir, Mission } from '../engine/types';

const email = {
  from: 'Super Sock Shop <help@supersokshop.pretend>',
  subject: 'Act now or lose your socks!',
  body: [
    'Send us your password today.',
    'Use this link for free socks.',
    'We have a free pair for you.',
  ],
  link: 'free-socks-click-here.pretend',
};

const fs: FsDir = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        agent: {
          type: 'dir',
          children: {
            inbox: {
              type: 'dir',
              children: {
                'odd_email.txt': {
                  type: 'file',
                  content: [
                    `From: ${email.from}`, `Subject: ${email.subject}`,
                    ...email.body, `Link: ${email.link}`,
                  ].join('\n'),
                },
              },
            },
          },
        },
      },
    },
  },
};

export const m6Socks: Mission = {
  id: 'm6-socks',
  bit: 14,
  order: 14,
  chapter: 'missions',
  retired: true,
  requires: ['m5-moon'],
  minutes: 12,
  title: 'The Super Sock Shop Trick',
  blurb: 'Spot a trick email. Keep the sock shop safe.',
  client: {
    company: 'Super Sock Shop',
    contact: 'Polly Polkadot',
    art: 'client-m6-socks',
    allowed: [
      { text: 'Look at the odd email our shop got.' },
      { text: 'Help our team spot trick emails.' },
    ],
    notAllowed: [
      { text: 'Do not click the link or reply.' },
      { text: 'Leave the sock orders alone.' },
    ],
  },
  badge: { id: 'm6-socks', name: 'Phish Finder', art: 'badge-m6-socks' },
  intro: [
    { text: 'Our shop got a strange email. Can you help?', speaker: 'client' },
    { text: 'This permission slip lets you read it for clues.', speaker: 'client' },
    { text: 'Only hack what you own or have permission to hack.', speaker: 'sidekick' },
    { text: 'Real security testers get permission first, like this slip.', speaker: 'sidekick' },
    { text: 'These socks and emails are all pretend.' },
  ],
  steps: [
    {
      id: 'read-odd-email',
      title: 'Peek in the inbox',
      lines: [
        { text: 'An inbox is like a drawer for new mail.' },
        { text: 'Use ls to look around your agent folder.', say: 'Use L S to look around your agent folder.' },
        { text: 'Use cd inbox to walk into the inbox.', say: 'Use C D inbox to walk into the inbox.' },
        { text: 'Use cat odd_email.txt to read the email.', say: 'Use cat odd email dot T X T to read the email.' },
        { text: 'We can read it without using its link.' },
      ],
      hints: [
        { text: 'Look for the inbox folder.' },
        { text: 'Walk into inbox. Read odd_email.txt with cat.', say: 'Walk into inbox. Read odd email dot T X T with cat.' },
        { text: 'Type cd and press Enter. Then cd inbox. Then cat odd_email.txt.', say: 'Type C D and press Enter. Then C D inbox. Then cat odd email dot T X T.' },
      ],
      success: [
        { text: 'Free socks? That email wants a secret in return!' },
        { text: 'Let us take a closer look for clues.' },
      ],
      config: {
        kind: 'terminal', fs, cwd: '/home/agent',
        commands: ['ls', 'cd', 'pwd', 'cat', 'help', 'clear'],
        goal: { type: 'all', goals: [
          { type: 'cwd', path: '/home/agent/inbox' },
          { type: 'read', path: '/home/agent/inbox/odd_email.txt' },
        ] },
        chips: ['cd', 'ls', 'cd inbox', 'cat odd_email.txt'],
      },
    },
    {
      id: 'spot-trick-clues',
      title: 'Find the fake hook',
      lines: [
        { text: 'Phishing is like a fake fishing hook with a worm.' },
        { text: 'It looks yummy, but it is a trick.' },
        { text: 'This email tries to trick us into sharing a password.' },
        { text: 'The real shop spells sock with C K.' },
        { text: 'Tap three clues in this pretend email to mark the tricks.' },
      ],
      hints: [
        { text: 'Read slowly. Does each part look right?' },
        { text: 'Look for rushing words and a request for a password.' },
        { text: 'Click Act now, your password, and free-socks.' },
      ],
      success: [
        { text: 'You spotted the tricks! Keep that password secret.' },
        { text: 'Marking a clue here does not open a link.' },
      ],
      config: {
        kind: 'phish-spot', email,
        clues: [
          {
            id: 'misspelled-sender', match: 'supersokshop',
            explain: { text: 'The sender left the C out of sock.' },
          },
          {
            id: 'rushing-words', match: 'Act now',
            explain: { text: 'Rushing words try to stop us from thinking.' },
          },
          {
            id: 'password-request', match: 'your password',
            explain: { text: 'A password is a secret. Do not send it.' },
          },
          {
            id: 'odd-link', match: 'free-socks',
            explain: { text: 'This odd link offers a treat to lure us in.' },
          },
        ],
        needed: 3,
      },
    },
    {
      id: 'report-trick-email',
      title: 'Tell the shop helper',
      lockdown: true,
      lines: [
        { text: 'We found a trick. Let us help the shop team.' },
        { text: 'Report the email to the shop helper.' },
        { text: 'Tell them in person. Do not reply to the email.' },
      ],
      hints: [
        { text: 'Think of who can help the shop.' },
        { text: 'The shop helper can check the odd email.' },
        { text: 'Choose Report it to the shop helper.' },
      ],
      success: [{ text: 'The shop helper knows. The team can watch for tricks!' }],
      config: {
        kind: 'choice',
        question: { text: 'What should we do with the trick email?' },
        options: [
          {
            id: 'reply', label: 'Reply to ask for socks',
            feedback: { text: 'A reply goes to the trick sender. Tell the helper instead.' },
          },
          {
            id: 'report', label: 'Report it to the shop helper',
            feedback: { text: 'Yes! Tell the helper so the team can stay safe.' },
          },
          {
            id: 'send-secret', label: 'Send the password',
            feedback: { text: 'Keep that secret safe. Ask the helper for help.' },
          },
        ],
        correct: ['report'],
      },
    },
    {
      id: 'leave-odd-links',
      title: 'Leave the hook alone',
      lockdown: true,
      lines: [
        { text: 'A free sock offer can hide a trick.' },
        { text: 'Never click odd links in emails.' },
      ],
      hints: [
        { text: 'Think of that fake hook with a worm.' },
        { text: 'We can stay safe by leaving the link alone.' },
        { text: 'Choose Never click odd links.' },
      ],
      success: [{ text: 'The hook caught no one. The socks can wait!' }],
      config: {
        kind: 'choice',
        question: { text: 'What is our rule for odd email links?' },
        options: [
          {
            id: 'click', label: 'Click to see what happens',
            feedback: { text: 'That may be a trick. Leave the link alone.' },
          },
          {
            id: 'free-gift', label: 'Click if the gift is free',
            feedback: { text: 'Free gifts can be bait too. Keep the link closed.' },
          },
          {
            id: 'no-click', label: 'Never click odd links',
            feedback: { text: 'Yes! Leave odd links alone and get help.' },
          },
        ],
        correct: ['no-click'],
      },
    },
    {
      id: 'ask-grown-up',
      title: 'Get help when unsure',
      lockdown: true,
      lines: [
        { text: 'Some tricks can be hard to spot.' },
        { text: 'You can ask a grown-up when you are unsure.' },
        { text: 'You do not need to solve it on your own.' },
      ],
      hints: [
        { text: 'You have a team to help you.' },
        { text: 'A grown-up can check the email with you.' },
        { text: 'Choose Ask a grown-up.' },
      ],
      success: [{ text: 'Good call! Asking for help is a smart move.' }],
      config: {
        kind: 'choice',
        question: { text: 'What if you are unsure about an email?' },
        options: [
          {
            id: 'grown-up', label: 'Ask a grown-up',
            feedback: { text: 'Yes! A grown-up can help you check it safely.' },
          },
          {
            id: 'guess', label: 'Guess and click',
            feedback: { text: 'There is no rush. Ask a grown-up before you act.' },
          },
          {
            id: 'hide', label: 'Keep it a secret',
            feedback: { text: 'You can tell a grown-up. They are here to help.' },
          },
        ],
        correct: ['grown-up'],
      },
    },
  ],
  outro: [
    { text: 'Thank you! Our team knows how to spot tricks.', speaker: 'client' },
    { text: 'Our socks give you a warm, woolly cheer!', speaker: 'client' },
    { text: 'You earned the Phish Finder badge!' },
    { text: 'Job done. Time to rest your sharp eyes.' },
  ],
};
