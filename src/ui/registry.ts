import type { ArtComponent, Mission, Playground, Season, Sidekick } from '../engine/types';
import * as missionModule from '../missions';
import { sidekicks } from '../missions/sidekicks';
import { firstWords, secondWords } from '../missions/names';
import { art } from '../art';
import { playground } from '../missions/playground';

export interface Registry {
  playground: Playground | null;
  missions: readonly Mission[];
  seasons: readonly Season[];
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
export function readSeasons(value: unknown): Season[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Season => {
    if (!entry || typeof entry !== 'object') return false;
    const season = entry as Record<string, unknown>;
    return typeof season.id === 'string' && season.id.length > 0
      && Number.isInteger(season.number) && Number(season.number) > 0
      && typeof season.title === 'string' && typeof season.blurb === 'string'
      && Array.isArray(season.missions) && season.missions.every((id) => typeof id === 'string')
      && (season.requires === null || typeof season.requires === 'string');
  });
}
export function buildRegistry(src: Partial<Registry> = {}): Registry {
  const seasons = readSeasons((missionModule as unknown as { seasons?: unknown }).seasons);
  const source = { missions: missionModule.missions, seasons, sidekicks, firstWords, secondWords, art, playground, ...src };
  return {
    seasons: readSeasons(source.seasons).slice().sort((a, b) => a.number - b.number),
    playground: source.playground ?? null,
    missions: (source.missions ?? []).filter((m) => Number.isInteger(m.bit) && m.bit >= 0 && m.bit <= 47)
      .slice().sort((a, b) => a.order - b.order),
    sidekicks: source.sidekicks?.length ? source.sidekicks : defaults,
    firstWords: source.firstWords?.length ? source.firstWords : fallbackFirst,
    secondWords: source.secondWords?.length ? source.secondWords : fallbackSecond,
    art: source.art ?? {},
  };
}
