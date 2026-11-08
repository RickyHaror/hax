import type { Mission } from '../engine/types';

export const b2Keys: Mission = {
  id: 'b2-keys',
  bit: 2,
  order: 2,
  chapter: 'bootcamp',
  title: 'Key Quest',
  blurb: 'Meet the keys. Each one has a job!',
  minutes: 10,
  requires: ['b1-mouse'],
  badge: { id: 'b2-keys', name: 'Key Quest', art: 'badge-b2-keys' },
  intro: [
    { text: 'Your keyboard is a team of small helpers.' },
    { text: 'Each key has a job. Let us meet a few.' },
  ],
  steps: [
    {
      id: 'letters',
      title: 'Meet three letters',
      lines: [
        { text: 'Letter keys are like stamps. Each makes its own mark.' },
        { text: 'Find c, then a, then t. That spells cat!' },
        { text: 'Tap one key at a time. Take your time.' },
      ],
      hints: [
        { text: 'Look for the letters on your keyboard.' },
        { text: 'The first letter of cat is c.' },
        { text: 'Press c, then a, then t.' },
      ],
      success: [{ text: 'Meow! You found all three letter keys.' }],
      config: { kind: 'key-find', keys: ['c', 'a', 't'] },
    },
    {
      id: 'space',
      title: 'Make some room',
      lines: [
        { text: 'Space is like a small gap between train cars.' },
        { text: 'It leaves room between words.' },
        { text: 'Find the long key near the bottom. Press Space.' },
      ],
      hints: [
        { text: 'Look near the bottom of your keyboard.' },
        { text: 'Space is the very long key.' },
        { text: 'Press the long Space key once.' },
      ],
      success: [{ text: 'Room to breathe! Words like a little space.' }],
      config: { kind: 'key-find', keys: [' '] },
    },
    {
      id: 'enter',
      title: 'Ready, set, go',
      lines: [
        { text: 'Enter is like saying go!' },
        { text: 'It can start a new line or send your answer.' },
        { text: 'Find the key named Enter. Give it a tap.' },
      ],
      hints: [
        { text: 'Look on the right side of the letter keys.' },
        { text: 'The key may say Enter or show a bent arrow.' },
        { text: 'Press Enter once.' },
      ],
      success: [{ text: 'Go, team! You found Enter.' }],
      config: { kind: 'key-find', keys: ['Enter'] },
    },
    {
      id: 'backspace',
      title: 'Meet the eraser',
      lines: [
        { text: 'Backspace is like an eraser for the last thing typed.' },
        { text: 'A wrong letter is fine. You can rub it out.' },
        { text: 'Find Backspace near the top right.' },
      ],
      hints: [
        { text: 'Find the key that helps fix a slip.' },
        { text: 'Look above Enter for Backspace or a left arrow.' },
        { text: 'Press Backspace once.' },
      ],
      success: [{ text: 'Nice! Every agent can fix a small slip.' }],
      config: { kind: 'key-find', keys: ['Backspace'] },
    },
    {
      id: 'shift',
      title: 'Make it big',
      lines: [
        { text: 'Shift is like a boost. It makes a letter big.' },
        { text: 'Hold Shift while you press a letter to try it.' },
        { text: 'For now, just tap Shift. Either Shift key works.' },
      ],
      hints: [
        { text: 'Look for Shift near the bottom of the letter keys.' },
        { text: 'There is a Shift key on each side.' },
        { text: 'Press either Shift key once.' },
      ],
      success: [{ text: 'Big smiles! You know five kinds of keys now.' }],
      config: { kind: 'key-find', keys: ['Shift'] },
    },
  ],
  outro: [
    { text: 'Your key badge is ready. You did well!' },
    { text: 'Take a break. Word games will be here next time.' },
  ],
};
