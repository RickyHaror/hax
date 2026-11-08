import { test, expect } from '@playwright/test';

test('onboarding fits with Next visible and no sideways scroll', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Start', exact: true });
  const help = page.getByRole('button', { name: 'Help me', exact: true });
  await expect(start.or(help)).toBeVisible();
  if (await start.isVisible()) {
    await start.click();
  } else {
    for (let rung = 0; rung < 3; rung++) await help.click();
    await expect(page.getByLabel('Password', { exact: true })).not.toBeEmpty();
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Pick your agent name' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(next).toBeVisible();
  const bounds = await next.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    return {
      pageWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight,
    };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.panelWidth).toBeLessThanOrEqual(layout.visibleWidth);
  expect(layout.panelHeight).toBeLessThanOrEqual(layout.visibleHeight);
  const nameLine = page.locator('.name-preview .speech-line');
  const words = await nameLine.getByText(/^Your name:/).boundingBox();
  const read = await nameLine.getByRole('button', { name: 'Read aloud', exact: true }).boundingBox();
  expect(words).not.toBeNull();
  expect(read).not.toBeNull();
  expect(read!.x - (words!.x + words!.width)).toBeGreaterThanOrEqual(0);
  expect(read!.x - (words!.x + words!.width)).toBeLessThanOrEqual(16);
  expect(read!.height).toBeGreaterThanOrEqual(48);
});
