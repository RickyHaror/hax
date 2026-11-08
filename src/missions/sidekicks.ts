import type { Sidekick } from '../engine/types';

/**
 * The three sidekicks the player can pick from. Index order is permanent:
 * save codes store the index (2 bits). The content lane fills these in.
 */
export const sidekicks: Sidekick[] = [
  {
    id: 'bit',
    name: 'Bit',
    art: 'sidekick-bit',
    personality: { text: 'Beep! I love facts and a good giggle.' },
    greeting: [
      { text: 'Beep boop! I am Bit, your robot pal.' },
      { text: 'Fun fact: we make a great team!' },
      { text: 'My gears are set for fun.' },
    ],
    goodbye: [
      { text: 'Beep! New fact saved: you did great.' },
      { text: 'Time to rest my gears. See you soon!' },
    ],
  },
  {
    id: 'pixel',
    name: 'Pixel',
    art: 'sidekick-pixel',
    personality: { text: 'I am a quick fox with a playful hop.' },
    greeting: [
      { text: 'Hi! I am Pixel. Watch my tail swish!' },
      { text: 'Ready to sniff out clues with me?' },
      { text: 'Hop to it! We can learn as we play.' },
    ],
    goodbye: [
      { text: 'High paw! That was a fun run.' },
      { text: 'My tail and I will see you soon!' },
    ],
  },
  {
    id: 'hoot',
    name: 'Hoot',
    art: 'sidekick-hoot',
    personality: { text: 'I am a calm owl who thinks things through.' },
    greeting: [
      { text: 'Hoo, hello! I am Hoot, your owl pal.' },
      { text: 'Take your time. Small steps help us learn.' },
      { text: 'Let us put our heads and wings together.' },
    ],
    goodbye: [
      { text: 'Hoo knew you could learn so much? I did!' },
      { text: 'Rest your wings. We can learn more next time.' },
    ],
  },
];
