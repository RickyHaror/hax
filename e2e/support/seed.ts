import type { Page } from '@playwright/test';
import {
  completeMission, createProgress, saveProgress, setIdentity, STORAGE_KEY,
  type StorageLike,
} from '../../src/engine/progress';
import type { Mission, MissionId } from '../../src/engine/types';

export async function seedProgress(
  page: Page, opts: { completed: MissionId[]; sidekick?: number },
): Promise<void> {
  let progress = setIdentity(createProgress(), {
    firstWord: 0, secondWord: 0, sidekick: opts.sidekick ?? 0,
  });
  for (const id of opts.completed) progress = completeMission(progress, id, new Date(0));
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
  if (!saveProgress(storage, progress)) throw new Error('Could not serialize seeded progress.');
  const value = values.get(STORAGE_KEY)!;
  await page.addInitScript(({ key, value }) => {
    // Init scripts also run on reload. Never overwrite the playthrough's save.
    const marker = `${key}.e2e-seeded`;
    if (sessionStorage.getItem(marker)) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem(marker, 'yes');
  }, { key: STORAGE_KEY, value });
}

export function prerequisites(mission: Mission, missions: readonly Mission[]): MissionId[] {
  const byId = new Map(missions.map((entry) => [entry.id, entry]));
  const completed = new Set<MissionId>();
  const visiting = new Set<MissionId>();
  function visit(entry: Mission) {
    if (visiting.has(entry.id)) throw new Error(`Cyclic prerequisites for mission "${entry.id}".`);
    if (completed.has(entry.id)) return;
    visiting.add(entry.id);
    for (const id of entry.requires) {
      const required = byId.get(id);
      if (!required) throw new Error(`Mission "${entry.id}" requires unknown mission "${id}".`);
      visit(required);
    }
    visiting.delete(entry.id);
    if (entry.id !== mission.id) completed.add(entry.id);
  }
  visit(mission);
  return [...completed];
}
