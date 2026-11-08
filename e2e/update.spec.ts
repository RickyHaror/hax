import { test, expect } from '@playwright/test';
import { LOGIN_PASSWORD } from '../src/missions/login';

test('the first load gains service worker control without reloading', async ({ page }) => {
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 60_000 }).toBe(true);
  expect(loads).toBe(1);
});

test('an update waits for login success and reloads exactly once', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find the password', exact: true })).toBeVisible();
  const password = page.getByRole('textbox', { name: 'Password', exact: true });
  await password.fill('pickle');
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 60_000 }).toBe(true);
  let loads = 0;
  page.on('load', () => { loads += 1; });
  await page.evaluate(() => window.dispatchEvent(new Event('hax:update-ready')));
  // This observation window exceeds the 1.5 second reload delay.
  await page.waitForTimeout(5000);
  expect(loads).toBe(0);
  await expect(password).toHaveValue('pickle');
  await expect(page.getByRole('status')).toBeEmpty();

  const loaded = page.waitForEvent('load');
  await password.fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('New missions arrived!');
  await loaded;
  expect(loads).toBe(1);
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 60_000 }).toBe(true);
  // Stay at a safe moment long enough to catch a duplicate reload.
  await page.waitForTimeout(5000);
  expect(loads).toBe(1);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toBeEmpty();
});
