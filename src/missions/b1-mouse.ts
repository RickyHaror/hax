import type { Mission } from '../engine/types';

export const b1Mouse: Mission = {
  id: 'b1-mouse',
  bit: 1,
  order: 1,
  chapter: 'bootcamp',
  title: 'Mouse Moves',
  blurb: 'Point, click, and dress up your agent card.',
  minutes: 10,
  requires: ['login'],
  badge: { id: 'b1-mouse', name: 'Mouse Moves', art: 'badge-b1-mouse' },
  intro: [
    { text: 'Welcome to Boot Camp! I will help you learn.' },
    { text: 'Move your mouse. See the small arrow move too?' },
    { text: 'That arrow is your pointer. Let us play!' },
  ],
  steps: [
    {
      id: 'one-click',
      title: 'Point and click',
      lines: [
        { text: 'Point at each shape with your mouse.' },
        { text: 'Press and let go of the left mouse button once.' },
        { text: 'That is a click! Click all three shapes.' },
      ],
      hints: [
        { text: 'Move the arrow onto a shape.' },
        { text: 'Give each shape one click with the left mouse button.' },
        { text: 'Click Star, Moon, and Heart once each.' },
      ],
      success: [{ text: 'Three happy shapes! Your pointer found them all.' }],
      config: {
        kind: 'click-targets',
        action: 'click',
        targets: [
          { id: 'star', label: 'Star', art: 'bootcamp-star' },
          { id: 'moon', label: 'Moon', art: 'bootcamp-moon' },
          { id: 'heart', label: 'Heart', art: 'bootcamp-heart' },
        ],
      },
    },
    {
      id: 'two-clicks',
      title: 'Knock knock',
      lines: [
        { text: 'A double-click means two fast clicks, like knock knock!' },
        { text: 'Keep your pointer still on the shape.' },
        { text: 'Tap the left mouse button twice, fast.' },
      ],
      hints: [
        { text: 'Think of a quick knock knock.' },
        { text: 'Point at each shape. Click twice without a long pause.' },
        { text: 'Double-click Star, Moon, and Heart.' },
      ],
      success: [{ text: 'Knock knock! You have the double-click trick.' }],
      config: {
        kind: 'click-targets',
        action: 'double-click',
        targets: [
          { id: 'star', label: 'Star', art: 'bootcamp-star' },
          { id: 'moon', label: 'Moon', art: 'bootcamp-moon' },
          { id: 'heart', label: 'Heart', art: 'bootcamp-heart' },
        ],
      },
    },
    {
      id: 'stickers',
      title: 'Dress up your card',
      lines: [
        { text: 'Let us put three stickers on your agent card.' },
        { text: 'Point at a sticker. Hold the left mouse button down.' },
        { text: 'Move it onto Agent card. Then let go.' },
        { text: 'That is a drag and drop!' },
      ],
      hints: [
        { text: 'Your card has room for all three stickers.' },
        { text: 'Hold a sticker, move it to the card, then release.' },
        { text: 'Drag Star, Moon, and Heart onto Agent card.' },
      ],
      success: [{ text: 'What a bright card! Nice mouse moves.' }],
      config: {
        kind: 'drag-drop',
        items: [
          { id: 'star', label: 'Star', art: 'sticker-star', goesTo: 'card' },
          { id: 'moon', label: 'Moon', art: 'sticker-moon', goesTo: 'card' },
          { id: 'heart', label: 'Heart', art: 'sticker-heart', goesTo: 'card' },
        ],
        zones: [{ id: 'card', label: 'Agent card' }],
      },
    },
  ],
  outro: [
    { text: 'Your mouse badge is yours. Great work!' },
    { text: 'Rest your hand. Next time, we will meet the keys.' },
  ],
};
