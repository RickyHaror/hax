import type { Mission } from '../engine/types';

export const b3Typing: Mission = {
  id: 'b3-typing',
  bit: 3,
  order: 3,
  chapter: 'bootcamp',
  title: 'Packet Catcher',
  blurb: 'Catch little bundles of letters with your keys.',
  minutes: 10,
  requires: ['b2-keys'],
  badge: { id: 'b3-typing', name: 'Packet Catcher', art: 'badge-b3-typing' },
  intro: [
    { text: 'A packet is a small bundle. Ours hold letters!' },
    { text: 'Type what you see to catch each one.' },
    { text: 'You can never lose this game. I will help.' },
  ],
  steps: [
    {
      id: 'home-row',
      title: 'Catch ten letters',
      lines: [
        { text: 'These letters live on the middle row of your keyboard.' },
        { text: 'Find a, s, d, f, j, k, and l.' },
        { text: 'Type each letter you see. Catch ten to finish.' },
        { text: 'Miss one? That is fine. The game will slow down.' },
      ],
      hints: [
        { text: 'Look at the letter in the falling packet.' },
        { text: 'Find that same letter on the middle row.' },
        { text: 'Press the shown key: a, s, d, f, j, k, or l.' },
      ],
      success: [{ text: 'Ten catches! Your fingers found their way.' }],
      config: { kind: 'typing-game', words: ['a', 's', 'd', 'f', 'j', 'k', 'l'], goal: 10 },
    },
    {
      id: 'short-words',
      title: 'Catch six words',
      lines: [
        { text: 'Now each packet holds a short word.' },
        { text: 'Type its letters in order. Catch six words to finish.' },
        { text: 'Take your time. You can never lose.' },
      ],
      hints: [
        { text: 'Read the word in the packet.' },
        { text: 'Type the first letter, then the next, then the last.' },
        { text: 'Type the word shown: cat, sun, dog, hat, cup, or bed.' },
      ],
      success: [{ text: 'Six word bundles caught! That was kind, steady work.' }],
      config: { kind: 'typing-game', words: ['cat', 'sun', 'dog', 'hat', 'cup', 'bed'], goal: 6 },
    },
  ],
  outro: [
    { text: 'You earned your typing badge. Give your fingers a rest!' },
    { text: 'Next time, we will sort files into folders.' },
  ],
};
