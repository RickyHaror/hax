import type { Mission } from '../engine/types';

export const b4Files: Mission = {
  id: 'b4-files',
  bit: 4,
  order: 4,
  chapter: 'bootcamp',
  title: 'Files and Folders',
  blurb: 'Open a drawer. Give each file a home.',
  minutes: 10,
  requires: ['b3-typing'],
  badge: { id: 'b4-files', name: 'Files and Folders', art: 'badge-b4-files' },
  intro: [
    { text: 'Our pretend desk needs a tidy up.' },
    { text: 'Let us find homes for some files.' },
  ],
  steps: [
    {
      id: 'paper-and-drawer',
      title: 'A home for files',
      lines: [
        { text: 'A file is like a sheet of paper.' },
        { text: 'It can hold a picture, a song, or some words.' },
        { text: 'A folder is like a drawer. It holds files.' },
      ],
      hints: [
        { text: 'Think of a desk with drawers.' },
        { text: 'Paper goes in a drawer. Files go in a folder.' },
        { text: 'Choose Folder.' },
      ],
      success: [{ text: 'Yes! A folder gives files a home.' }],
      config: {
        kind: 'choice',
        question: { text: 'Which one is like a drawer for files?' },
        options: [
          { id: 'file', label: 'File', feedback: { text: 'Close! A file is like the paper inside.' } },
          { id: 'folder', label: 'Folder', feedback: { text: 'Yes! A folder holds files, like a drawer holds paper.' } },
          { id: 'mouse', label: 'Mouse', feedback: { text: 'A mouse helps you point. Try the drawer home.' } },
        ],
        correct: ['folder'],
      },
    },
    {
      id: 'open-folder',
      title: 'Look in the drawer',
      lines: [
        { text: 'Find the Pictures folder. Open it to peek inside.' },
        { text: 'We are just looking. These files stay safe.' },
      ],
      hints: [
        { text: 'Look for the folder named Pictures.' },
        { text: 'Open Pictures, like pulling out a drawer.' },
        { text: 'Click the Pictures folder to open it.' },
      ],
      success: [{ text: 'You opened Pictures! There is a cat picture inside.' }],
      config: {
        kind: 'file-explorer',
        fs: {
          type: 'dir',
          children: {
            Pictures: { type: 'dir', children: { Cat: { type: 'file', content: 'A cat in a hat.' } } },
          },
        },
        task: { type: 'open', path: '/Pictures' },
      },
    },
    {
      id: 'sort-files',
      title: 'Tidy the desk',
      lines: [
        { text: 'Cat picture and Sun picture belong in Pictures.' },
        { text: 'Happy song belongs in Music.' },
        { text: 'Move each file to its folder.' },
      ],
      hints: [
        { text: 'Read each file name. Is it a picture or song?' },
        { text: 'Put pictures in Pictures. Put the song in Music.' },
        { text: 'Move Cat picture and Sun picture to Pictures. Move Happy song to Music.' },
      ],
      success: [{ text: 'All tidy! Each file has a snug home.' }],
      config: {
        kind: 'file-explorer',
        fs: {
          type: 'dir',
          children: {
            'Cat picture': { type: 'file', content: 'A cat in a hat.' },
            'Sun picture': { type: 'file', content: 'A bright sun.' },
            'Happy song': { type: 'file', content: 'La la la!' },
            Pictures: { type: 'dir', children: {} },
            Music: { type: 'dir', children: {} },
          },
        },
        task: {
          type: 'move',
          moves: [
            { file: '/Cat picture', toDir: '/Pictures' },
            { file: '/Sun picture', toDir: '/Pictures' },
            { file: '/Happy song', toDir: '/Music' },
          ],
        },
      },
    },
  ],
  outro: [
    { text: 'Your files badge is here. What a neat desk!' },
    { text: 'Take a rest. Password Power is next.' },
  ],
};
