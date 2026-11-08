import { test, expect, type Page } from '@playwright/test';
import { missions } from '../src/missions';
import type { Mission } from '../src/engine/types';
import { begin, missionCard } from './support/play';
import { prerequisites, seedProgress } from './support/seed';

async function fits(page: Page) {
  const size = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth,
    viewportHeight: innerHeight, viewportWidth: innerWidth,
  }));
  expect(size.height).toBeLessThanOrEqual(size.viewportHeight);
  expect(size.width).toBeLessThanOrEqual(size.viewportWidth);
}

async function openStep(page: Page, mission: Mission) {
  await seedProgress(page, { completed: prerequisites(mission, missions) });
  await page.goto('/'); await begin(page);
  await missionCard(page, mission).click();
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  if (mission.client) await page.getByRole('button', { name: 'I accept', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
}

test('start screen fits with its input, Check and Help me visible', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/'); await begin(page);
  await page.evaluate(() => document.fonts.ready);
  await fits(page);
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Help me', exact: true })).toBeVisible();
});

test('map fits with its actions and an internally scrolling mission list', async ({ page }) => {
  await seedProgress(page, { completed: missions.filter((mission) => mission.chapter === 'login').map((mission) => mission.id) });
  await page.goto('/'); await begin(page);
  await page.evaluate(() => document.fonts.ready);
  await fits(page);
  await expect(page.getByRole('button', { name: 'Stop for today', exact: true })).toBeInViewport({ ratio: 1 });
  expect(await page.locator('.map-chapters').evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
});

for (const chapter of ['bootcamp', 'terminal'] as const) test(`${chapter} step fits with Help me and usable work`, async ({ page }) => {
  const mission = missions.find((entry) => entry.chapter === chapter)!;
  await openStep(page, mission);
  await fits(page);
  const help = page.getByRole('button', { name: 'Help me', exact: true });
  await expect(help).toBeInViewport({ ratio: 1 });
  if (chapter === 'terminal') {
    await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeInViewport({ ratio: 1 });
    for (let i = 0; i < 3; i++) await help.click();
    await fits(page);
    await expect(page.getByRole('button', { name: 'Close hints', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Close hints', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeInViewport({ ratio: 1 });
    const box = page.locator('.terminal-body .reading-box');
    expect(await box.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
  } else {
    await expect(page.locator('.step-work .bootcamp')).toBeInViewport({ ratio: 1 });
  }
});
