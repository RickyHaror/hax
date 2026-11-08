import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';
import { STORAGE_KEY } from '../src/engine/progress';
import type { Mission } from '../src/engine/types';
import { missions } from '../src/missions';
import { trackForeignRequests } from './support/guards';
import { begin, missionCard, playMission } from './support/play';
import { prerequisites, seedProgress } from './support/seed';

test.describe.configure({ retries: 0, timeout: 240_000 });

async function checkAxe(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
}

type ScreenCheck = (page: Page, label: string) => Promise<void>;

function screenChecks(info: TestInfo, mission: Mission, hints: 'none' | 'all'): ScreenCheck {
  let index = 0;
  return async (page: Page, label: string): Promise<void> => {
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const size = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
    }));
    expect(size.width, `${label}: page width`).toBeLessThanOrEqual(size.viewportWidth);
    expect(size.height, `${label}: page height`).toBeLessThanOrEqual(size.viewportHeight);
    if (hints === 'all') {
      if (label.endsWith('-show-me')) await checkAxe(page);
      return;
    }
    await checkAxe(page);
    const number = String(++index).padStart(2, '0');
    const safeLabel = label.replace(/[^a-z0-9-]/gi, '-');
    await page.screenshot({ path: join('screenshots', info.project.name, mission.id, `${number}-${safeLabel}.png`) });
  };
}

async function saveCode(
  page: Page, mission: Mission, onScreen: (label: string) => Promise<void>,
): Promise<string> {
  if (mission.chapter === 'login') {
    // The front door ends at onboarding, without the player or Done screen.
    await expect(page.getByRole('heading', { name: 'Pick your agent name', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(missionCard(page, mission, true)).toBeVisible();
    await onScreen('map');
    await page.getByRole('button', { name: 'Stop for today', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'See you soon, Agent!', exact: true })).toBeVisible();
    await onScreen('save');
  } else {
    await expect(page.getByRole('heading', { name: 'Great work, Agent! Mission saved.', exact: true })).toBeVisible();
  }
  const code = page.getByRole('region', { name: 'Secret decryption key', exact: true }).locator('output');
  await expect(code).toHaveText(/^HAX-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  return (await code.textContent())!.trim();
}

async function restoreCode(
  browser: Browser, source: Page, baseURL: string, mission: Mission,
  code: string, checkScreen: ScreenCheck,
): Promise<void> {
  const context = await browser.newContext({ baseURL, viewport: source.viewportSize() });
  const page = await context.newPage();
  const foreign = trackForeignRequests(page, baseURL);
  const onScreen = (label: string) => checkScreen(page, label);
  try {
    await page.goto('/');
    await begin(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
    const restore = page.getByRole('button', { name: 'I have a secret key', exact: true });
    await expect(restore).toBeVisible();
    await onScreen('restore-start');
    await restore.click();
    await expect(page.getByRole('heading', { name: 'Enter your secret key', exact: true })).toBeVisible();
    await onScreen('restore-key');
    await page.getByRole('textbox', { name: 'Secret key', exact: true }).fill(code);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    for (const id of [...prerequisites(mission, missions), mission.id]) {
      await expect(missionCard(page, missions.find((entry) => entry.id === id)!, true)).toBeVisible();
    }
    await onScreen('restore-map');
    expect(foreign).toEqual([]);
  } finally {
    await context.close();
  }
}

for (const mission of [...missions].sort((left, right) => left.order - right.order)) {
  for (const hints of ['none', 'all'] as const) {
    const name = `${mission.id} plays through${hints === 'all' ? ' with Show me' : ''}`;
    test(name, async ({ page, browser, baseURL }, info) => {
      // Each test's page fixture has fresh storage. Login must keep its identity unset.
      if (mission.chapter !== 'login') {
        await seedProgress(page, { completed: prerequisites(mission, missions) });
      }
      const foreign = trackForeignRequests(page, baseURL!);
      const checkScreen = screenChecks(info, mission, hints);
      const onScreen = (label: string) => checkScreen(page, label);
      await page.goto('/');
      await begin(page);
      if (mission.chapter !== 'login') {
        await expect(missionCard(page, mission)).toBeVisible();
        await onScreen('map');
      }
      await playMission(page, mission, { hints, onScreen });
      const code = await saveCode(page, mission, onScreen);
      if (hints === 'none') {
        const next = mission.chapter === 'login' ? 'Back' : 'Next';
        await page.getByRole('button', { name: next, exact: true }).click();
        await expect(missionCard(page, mission, true)).toBeVisible();
        await onScreen('completed-map');
        await page.reload();
        await begin(page);
        await expect(missionCard(page, mission, true)).toBeVisible();
        await onScreen('reloaded-map');
        await restoreCode(browser, page, baseURL!, mission, code, checkScreen);
      }
      expect(foreign).toEqual([]);
    });
  }
}
