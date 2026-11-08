import type { FsDir, Playground } from '../engine/types';

const snacks: FsDir = {
  type: 'dir',
  children: {
    menu: { type: 'file', content: 'Toast hats. Pea pops. Cheese moons.\nAll snacks come with a grin.' },
    '.crumb': { type: 'file', content: 'This crumb is the snack king.\nPlease bow to the tiny toast.' },
  },
};

const jokes: FsDir = {
  type: 'dir',
  children: {
    book: { type: 'file', content: 'What do frogs eat with soup?\nHop sticks!' },
    tip: { type: 'file', content: 'Type joke for one more giggle.' },
  },
};

const robot: FsDir = {
  type: 'dir',
  children: {
    diary: {
      type: 'file',
      content: 'Dear diary, I am Pip the pet robot.\nI tried to sit. I made a beep.\nMy best friend gave me a sock.\nI love my warm wheel hat.',
    },
    '.dream': { type: 'file', content: 'I dream of sheep with tiny wheels.\nThey beep when they jump.' },
    tag: { type: 'file', content: 'Who is my best pal?\nType whoami to see!' },
  },
};

const maps: FsDir = {
  type: 'dir',
  children: {
    treasure: {
      type: 'file',
      content: 'A chest waits on a pond island.\nRead this hidden file:\n/home/agent/garden/pond/island/.chest',
    },
    sky: { type: 'file', content: 'Find clouds, then fluff, then den.\nA soft seat waits up there.' },
  },
};

const museum: FsDir = {
  type: 'dir',
  children: {
    screen: { type: 'file', content: 'This old screen glows green.\nIt once wore a wool hat.' },
    mouse: { type: 'file', content: 'An old mouse had a ball inside.\nNo cheese was inside. We checked.' },
    card: { type: 'file', content: 'Want green rain? Type matrix.\nIt is all pretend.' },
  },
};

const music: FsDir = {
  type: 'dir',
  children: {
    song: { type: 'file', content: 'Plink, plonk, ding!\nThe music box has a spring.\nType dance and do your thing!' },
    '.hum': { type: 'file', content: 'Hmm hmm hmm.\nA shy bee sings in here.' },
  },
};

const boring: FsDir = {
  type: 'dir',
  children: {
    list: { type: 'file', content: 'One beige sock.\nTwo beige socks.\nStill beige.' },
    '.party': { type: 'file', content: 'SURPRISE! The socks can juggle!\nThey toss peas with their toes.' },
  },
};

const garden: FsDir = {
  type: 'dir',
  children: {
    sign: { type: 'file', content: 'The peas wave when you pass.\nThe pond has a small island.' },
    pond: {
      type: 'dir',
      children: {
        frog: { type: 'file', content: 'This frog wears swim socks.\nThey keep his toes quite damp.' },
        island: {
          type: 'dir',
          children: {
            flag: { type: 'file', content: 'A duck flag flaps in the breeze.\nQuack! You found our tiny shore.' },
            '.chest': { type: 'file', content: 'The chest holds a gold pea!\nIt wears a tiny crown.' },
          },
        },
      },
    },
  },
};

const clouds: FsDir = {
  type: 'dir',
  children: {
    sign: { type: 'file', content: 'These clouds are made of soft socks.\nType fortune for a kind thought.' },
    fluff: {
      type: 'dir',
      children: {
        den: {
          type: 'dir',
          children: {
            seat: { type: 'file', content: 'A cloud cat saved you a seat.\nIt purrs like a small kazoo.' },
          },
        },
      },
    },
  },
};

const socks: FsDir = {
  type: 'dir',
  children: {
    wash: { type: 'file', content: 'The socks went for a spin.\nOne came back dressed as a cow.\nType moo to meet its new pal.' },
    '.pair': { type: 'file', content: 'Two odd socks can still be pals.\nStripes and spots look great!' },
  },
};

const fs: FsDir = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        agent: {
          type: 'dir',
          children: { snacks, jokes, robot, maps, museum, music, boring, garden, clouds, socks },
        },
      },
    },
  },
};

/** A pretend computer for free play, with no goals or failing. */
export const playground: Playground | null = {
  unlockedBy: 't3-tools',
  cwd: '/home/agent',
  intro: [
    { text: 'Welcome to your playground! You can explore anything here.', speaker: 'sidekick' },
    { text: 'Nothing can break. Take your time and have fun.', speaker: 'sidekick' },
    { text: 'Try ls to start.', say: 'Try L S to start.', speaker: 'sidekick' },
    { text: 'Secrets are hiding. What silly things will you find?', speaker: 'sidekick' },
  ],
  fs,
  commands: [
    {
      name: 'whoami',
      help: 'See your agent name.',
      // The engine replaces {name} with the hacker name.
      output: ['You are agent {name}. Glad you are here!'],
    },
    {
      name: 'joke',
      help: 'Get a small giggle.',
      output: ['What do clouds wear? Rain coats!'],
    },
    {
      name: 'fortune',
      help: 'Read a kind thought.',
      output: ['A kind pal will make you smile.'],
    },
    {
      name: 'matrix',
      help: 'Watch some green rain.',
      effect: 'matrix',
      output: ['Green rain! Even the screen has fun.'],
    },
    {
      name: 'moo',
      help: 'Meet a kind cow.',
      output: [
        ' ______________________________',
        '< You make this place bright! >',
        ' ------------------------------',
        ' \\   ^__^',
        '  \\  (oo)\\_______',
        '     (__)\\       )\\/\\',
        '         ||----w |',
        '         ||     ||',
      ],
    },
    {
      name: 'dance',
      help: 'Do a tiny dance.',
      output: [' \\o/   o/   \\o', '  |    /|    |\\', ' / \\  / \\  / \\', 'Wiggle, wiggle, bow!'],
    },
  ],
  eggs: [
    {
      id: 'crumb-king',
      name: 'Crumb King',
      trigger: { type: 'read', path: '/home/agent/snacks/.crumb' },
      found: [{ text: 'All hail the toast! What a small king.', speaker: 'sidekick' }],
    },
    {
      id: 'robot-dream',
      name: 'Beep Sheep',
      trigger: { type: 'read', path: '/home/agent/robot/.dream' },
      found: [{ text: 'Beep sheep! Pip has such sweet dreams.', speaker: 'sidekick' }],
    },
    {
      id: 'sock-party',
      name: 'Sock Party',
      trigger: { type: 'read', path: '/home/agent/boring/.party' },
      found: [{ text: 'That dull folder hid a sock party!', speaker: 'sidekick' }],
    },
    {
      id: 'gold-pea',
      name: 'Gold Pea',
      trigger: { type: 'read', path: '/home/agent/garden/pond/island/.chest' },
      found: [{ text: 'The map led to a pea with a crown!', speaker: 'sidekick' }],
    },
    {
      id: 'shy-song',
      name: 'Shy Song',
      trigger: { type: 'read', path: '/home/agent/music/.hum' },
      found: [{ text: 'You found the shy bee band. Hum along!', speaker: 'sidekick' }],
    },
    {
      id: 'odd-pals',
      name: 'Odd Pals',
      trigger: { type: 'read', path: '/home/agent/socks/.pair' },
      found: [{ text: 'Those socks match in their own fun way.', speaker: 'sidekick' }],
    },
    {
      id: 'tiny-shore',
      name: 'Tiny Shore',
      trigger: { type: 'cwd', path: '/home/agent/garden/pond/island' },
      found: [{ text: 'You found the island! The ducks wave hello.', speaker: 'sidekick' }],
    },
    {
      id: 'cloud-den',
      name: 'Cloud Den',
      trigger: { type: 'cwd', path: '/home/agent/clouds/fluff/den' },
      found: [{ text: 'A snug cloud den! Rest your toes here.', speaker: 'sidekick' }],
    },
    {
      id: 'hello-agent',
      name: 'Hello Agent',
      trigger: { type: 'command', command: 'whoami' },
      found: [{ text: 'That is you! My best agent pal.', speaker: 'sidekick' }],
    },
    {
      id: 'kind-cow',
      name: 'Kind Cow',
      trigger: { type: 'command', command: 'moo' },
      found: [{ text: 'Moo to you too! This cow likes you.', speaker: 'sidekick' }],
    },
    {
      id: 'green-rain',
      name: 'Green Rain',
      trigger: { type: 'command', command: 'matrix' },
      found: [{ text: 'Green rain with no wet socks. Nice!', speaker: 'sidekick' }],
    },
    {
      id: 'tiny-dance',
      name: 'Tiny Dance',
      trigger: { type: 'command', command: 'dance' },
      found: [{ text: 'Great moves! Even my toes want to dance.', speaker: 'sidekick' }],
    },
  ],
};
