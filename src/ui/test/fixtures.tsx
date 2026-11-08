import type { Mission, Sidekick, Step, StepConfig } from '../../engine/types';
import { buildRegistry } from '../registry';
const line = (text: string) => ({ text });
function step(id: string, config: StepConfig, lockdown = false): Step {
  return {
    id, title: `Try ${id}`, config, lockdown, lines: [line(`Let us try ${id}.`)],
    hints: [line('Look at the clue.'), line('Try the blue box.'), line('Here is the answer.')],
    success: [line('You did it!')],
  };
}
export const login: Mission = {
  id: 'login', bit: 0, chapter: 'login', order: 0, title: 'The Front Door', blurb: 'Open our practice door.',
  minutes: 1, requires: [], badge: { id: 'door', name: 'Door Star', art: 'missing' },
  intro: [line('This is our practice computer.')], outro: [line('Welcome, Agent!')],
  steps: [step('password', { kind: 'answer', question: line('Read the note.'), answer: 'Blue Star', accept: ['Green Moon'] })],
};
export const client: Mission = {
  id: 'client', bit: 1, chapter: 'missions', order: 1, title: 'Pizza Patrol', blurb: 'Help our pizza pal.',
  minutes: 3, requires: [], badge: { id: 'pizza', name: 'Pizza Shield', art: 'pizza' },
  client: { company: 'Pizza Pals', contact: 'Pete Pie', art: 'missing', allowed: [line('Test our practice box.')], notAllowed: [line('Leave our oven alone.')] },
  intro: [line('Our pizza box needs help.')], outro: [line('The pizza box is safe!')],
  steps: [step('story', { kind: 'story' }), step('answer', { kind: 'answer', question: line('What is the key?'), answer: 'Blue Box' }),
    step('future', { kind: 'future' } as unknown as StepConfig), step('lock', { kind: 'story' }, true)],
};
export const dependent: Mission = { ...client, id: 'next', bit: 2, order: 2, title: 'Toy Patrol', requires: ['client'] };
export const buddies: Sidekick[] = ['Bit', 'Pixel', 'Hoot'].map((name) => ({
  id: name, name, art: 'missing', personality: line('A kind buddy.'),
  greeting: [line(`Hi! I am ${name}.`)], goodbye: [line('See you soon!')],
}));
export function fixtureRegistry(missions: readonly Mission[] = [login, client, dependent]) {
  return buildRegistry({ missions, sidekicks: buddies,
    firstWords: ['Brave', 'Swift', 'Sunny', 'Happy', 'Turbo', 'Super', 'Cosmic', 'Clever'],
    secondWords: ['Otter', 'Star', 'Pickle', 'Comet', 'Panda', 'Fox', 'Owl', 'Spark'],
    art: { pizza: ({ size, title }) => <svg width={size} height={size} role="img" aria-label={title}><circle cx="20" cy="20" r="18" /></svg> },
  });
}
