import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { trackForeignRequests } from './support/guards';

test('the game loads and talks to no other website', async ({ page, baseURL }) => {
  const foreign = trackForeignRequests(page, baseURL!);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

test('has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('works offline after the first load', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // A second load lets the service worker take control of the page.
  await page.reload();
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await context.setOffline(false);
});

test('page does not scroll sideways', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
