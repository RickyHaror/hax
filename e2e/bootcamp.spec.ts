import { expect, test, type Page } from '@playwright/test';
import { missions } from '../src/missions';
import { trackForeignRequests } from './support/guards';
import { begin, missionCard, playMission } from './support/play';
import { prerequisites, seedProgress } from './support/seed';

test.describe.configure({ retries: 0, timeout: 240_000 });

async function expectTrainingFit(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  const sizes = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth, viewportHeight: innerHeight,
  }));
  expect(sizes.width, `${label}: page width`).toBeLessThanOrEqual(sizes.viewportWidth);
  expect(sizes.height, `${label}: page height`).toBeLessThanOrEqual(sizes.viewportHeight);
  if (!label.endsWith('-before')) return;
  for (const work of await page.locator('.step-work').all()) {
    const size = await work.evaluate((element) => ({
      width: element.clientWidth, scrollWidth: element.scrollWidth,
      height: element.clientHeight, scrollHeight: element.scrollHeight,
    }));
    expect(size.scrollWidth, `${label}: work width`).toBeLessThanOrEqual(size.width + 2);
    expect(size.scrollHeight, `${label}: work height`).toBeLessThanOrEqual(size.height + 2);
  }
  for (const control of await page.locator('.bootcamp button:visible, .explorer-widget button:visible').all()) {
    const size = await control.evaluate((element) => ({
      width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
      font: parseFloat(getComputedStyle(element).fontSize), minimumFont: innerWidth < 600 ? 14 : 16,
    }));
    expect(size.width, `${label}: target width`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${label}: target height`).toBeGreaterThanOrEqual(44);
    expect(size.font, `${label}: control text`).toBeGreaterThanOrEqual(size.minimumFont);
  }
}

test('finishes b1 through b5 with mouse and keyboard and saves every badge', async ({ page, baseURL }) => {
  const training = missions.filter((mission) => mission.chapter === 'bootcamp')
    .sort((left, right) => left.order - right.order);
  expect(training.map((mission) => mission.id)).toEqual([
    'b1-mouse', 'b2-keys', 'b3-typing', 'b4-files', 'b5-passwords',
  ]);
  await seedProgress(page, { completed: prerequisites(training[0]!, missions) });
  const foreign = trackForeignRequests(page, baseURL!);
  await page.goto('/'); await begin(page);
  for (const mission of training) {
    await playMission(page, mission, {
      hints: 'none', onScreen: (label) => expectTrainingFit(page, `${mission.id}-${label}`),
    });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(missionCard(page, mission, true)).toBeVisible();
  }
  await page.reload(); await begin(page);
  for (const mission of training) await expect(missionCard(page, mission, true)).toBeVisible();
  expect(foreign).toEqual([]);
});
