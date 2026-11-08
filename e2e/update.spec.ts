import { test, expect } from '@playwright/test';

test('the first load gains service worker control without reloading', async ({ page }) => {
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  expect(loads).toBe(1);
});

test('an update announces itself and reloads once on the start screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const loaded = page.waitForEvent('load');
  await page.evaluate(() => window.dispatchEvent(new Event('hax:update-ready')));
  await expect(page.getByRole('status')).toContainText('New missions arrived!');
  await loaded;
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
});
