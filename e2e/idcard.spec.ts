import { expect, test, type Page } from '@playwright/test';
import { missions } from '../src/missions';
import { begin } from './support/play';
import { seedProgress } from './support/seed';
import { checkLayout } from './support/layout-check';

async function expectFit(page: Page) {
  await checkLayout(page, 'agent-card');
  const sizes = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    return { width: innerWidth, height: innerHeight,
      pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
      panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight };
  });
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.pageHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.panelWidth).toBeLessThanOrEqual(sizes.visibleWidth);
  expect(sizes.panelHeight).toBeLessThanOrEqual(sizes.visibleHeight);
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport();
  for (const tile of await page.getByRole('group', { name: 'Choose a photo', exact: true })
    .getByRole('button').all()) {
    await tile.scrollIntoViewIfNeeded();
    await checkLayout(page, `agent-card-photo-${await tile.getAttribute('aria-label')}`);
    await expect(tile).toBeInViewport();
    const size = await tile.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(48);
    expect(size!.height).toBeGreaterThanOrEqual(48);
    if (await tile.getAttribute('aria-label') !== 'Read aloud') {
      expect(size!.width).toBeGreaterThanOrEqual(64);
      expect(size!.height).toBeGreaterThanOrEqual(64);
    }
  }
}

test('opens the agent card, saves a silly photo, reloads, and returns', async ({ page }) => {
  await seedProgress(page, { completed: [] });
  await page.goto('/'); await begin(page);
  await checkLayout(page, 'agent-card-map');
  await page.getByRole('button', { name: 'My agent card', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agent ID card', exact: true })).toBeVisible();
  await expect(page.getByText('Finish a mission to earn your first badge.', { exact: true })).toBeVisible();
  await expectFit(page);
  await page.getByRole('button', { name: 'Octopus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Octopus', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await checkLayout(page, 'agent-card-octopus-selected');
  await page.reload(); await begin(page);
  await checkLayout(page, 'agent-card-reloaded-map');
  await page.getByRole('button', { name: 'My agent card', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Octopus', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Your photo', exact: true })
    .getByRole('img', { name: 'Octopus', exact: true })).toBeVisible();
  await expectFit(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'My agent card', exact: true })).toBeVisible();
  await checkLayout(page, 'agent-card-returned-map');
});

test('keeps a full badge collection inside its reading box', async ({ page }) => {
  await seedProgress(page, { completed: missions.map((mission) => mission.id) });
  await page.goto('/'); await begin(page);
  await checkLayout(page, 'agent-card-full-collection-map');
  await page.getByRole('button', { name: 'My agent card', exact: true }).click();
  const badges = page.getByRole('region', { name: 'Badge collection', exact: true });
  await expect(badges.getByRole('listitem')).toHaveCount(missions.length);
  await expectFit(page);
});
