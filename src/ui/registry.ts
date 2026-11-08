import type { ArtComponent, Mission, Playground, Sidekick } from '../engine/types';
import { missions } from '../missions';
import { sidekicks } from '../missions/sidekicks';
import { firstWords, secondWords } from '../missions/names';
import { art } from '../art';
import { playground } from '../missions/playground';

export interface Registry {
  playground: Playground | null;
  missions: readonly Mission[];
  sidekicks: readonly Sidekick[];
  firstWords: readonly string[];
  secondWords: readonly string[];
  art: Readonly<Record<string, ArtComponent>>;
}
const defaults: readonly Sidekick[] = ['Bit', 'Pixel', 'Hoot'].map((name, index) => ({
  id: name.toLowerCase(), name, art: name.toLowerCase(),
  personality: { text: ['A kind robot buddy.', 'A bright fox buddy.', 'A wise owl buddy.'][index]! },
  greeting: [{ text: `Hi! I am ${name}. Let us play!` }],
  goodbye: [{ text: 'Great work today. See you soon!' }],
}));
const fallbackFirst = ['Turbo', 'Cosmic', 'Happy', 'Brave', 'Swift', 'Sunny', 'Super', 'Clever'];
const fallbackSecond = ['Falcon', 'Pickle', 'Comet', 'Otter', 'Panda', 'Star', 'Tiger', 'Spark'];
export function buildRegistry(src: Partial<Registry> = {}): Registry {
  const source = { missions, sidekicks, firstWords, secondWords, art, playground, ...src };
  return {
    playground: source.playground ?? null,
    missions: (source.missions ?? []).filter((m) => Number.isInteger(m.bit) && m.bit >= 0 && m.bit <= 23)
      .slice().sort((a, b) => a.order - b.order),
    sidekicks: source.sidekicks?.length ? source.sidekicks : defaults,
    firstWords: source.firstWords?.length ? source.firstWords : fallbackFirst,
    secondWords: source.secondWords?.length ? source.secondWords : fallbackSecond,
    art: source.art ?? {},
  };
}
