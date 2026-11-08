import { expect, test, type Page } from '@playwright/test';
import { missions } from '../src/missions';
import { begin } from './support/play';
import { seedProgress } from './support/seed';

async function holdLogo(page: Page) {
  const logo = page.getByRole('button', { name: 'HAX', exact: true });
  await logo.hover(); await page.mouse.down();
  await page.clock.fastForward(3000); await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Grown-up settings', exact: true })).toBeVisible();
}
async function digits(page: Page, pin: string) {
  for (const digit of pin) await page.getByRole('button', { name: digit, exact: true }).click();
}
async function expectFit(page: Page) {
  const sizes = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    const screen = document.querySelector('.parent-screen')!;
    return { pageWidth: document.documentElement.scrollWidth, width: innerWidth,
      pageHeight: document.documentElement.scrollHeight, height: innerHeight,
      panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight,
      screenWidth: screen.scrollWidth, screenHeight: screen.scrollHeight,
      screenVisibleWidth: screen.clientWidth, screenVisibleHeight: screen.clientHeight };
  });
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.pageHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.panelWidth).toBeLessThanOrEqual(sizes.visibleWidth);
  expect(sizes.panelHeight).toBeLessThanOrEqual(sizes.visibleHeight);
  expect(sizes.screenWidth).toBeLessThanOrEqual(sizes.screenVisibleWidth);
  expect(sizes.screenHeight).toBeLessThanOrEqual(sizes.screenVisibleHeight);
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('heading', { name: 'Grown-up settings', exact: true })).toBeInViewport({ ratio: 1 });
  for (const control of await page.locator('.parent-pin button').all()) {
    await expect(control).toBeInViewport({ ratio: 1 });
  }
}

test('sets a parent PIN, reviews progress, saves settings and checks the PIN on reopening', async ({ page }) => {
  const mission = missions[0];
  if (!mission) throw new Error('A registered mission is required.');
  await seedProgress(page, { completed: [mission.id] });
  await page.clock.install(); await page.goto('/'); await begin(page);
  await holdLogo(page); await expectFit(page);
  await expect(page.getByText('Set a grown-up PIN', { exact: true })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await digits(page, '2468'); await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expectFit(page);
  await digits(page, '2468'); await page.getByRole('button', { name: 'Save PIN', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Completed missions', exact: true })).toContainText(mission.title);
  await expectFit(page);
  await page.getByRole('button', { name: '30 minutes', exact: true }).click();
  const lock = page.getByRole('switch', { name: 'Keep music off', exact: true });
  await lock.click(); await expect(lock).toBeChecked();
  await expect(page.getByRole('button', { name: 'Music off', exact: true })).toBeDisabled();
  await expectFit(page);
  const sections = page.getByRole('region', { name: 'Grown-up settings sections', exact: true });
  await sections.focus(); await sections.press('End');
  await expect.poll(() => sections.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Change PIN', exact: true }).scrollIntoViewIfNeeded();
  await expectFit(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await holdLogo(page);
  await expect(page.getByText('Enter your grown-up PIN', { exact: true })).toBeVisible();
  await expectFit(page);
  await digits(page, '2468'); await page.getByRole('button', { name: 'Check PIN', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Completed missions', exact: true })).toContainText(mission.title);
  await expect(page.getByRole('button', { name: '30 minutes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(lock).toBeChecked(); await expectFit(page);
  await page.reload(); await begin(page); await holdLogo(page); await digits(page, '2468');
  await page.getByRole('button', { name: 'Check PIN', exact: true }).click();
  await expect(page.getByRole('button', { name: '30 minutes', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(lock).toBeChecked();
  await page.getByRole('button', { name: 'Change PIN', exact: true }).click();
  await expectFit(page);
  await digits(page, '1357'); await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expectFit(page);
  await digits(page, '1357'); await page.getByRole('button', { name: 'Save PIN', exact: true }).click();
  await expect(sections).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await holdLogo(page);
  for (let attempt = 0; attempt < 5; attempt++) {
    await digits(page, '0000'); await page.getByRole('button', { name: 'Check PIN', exact: true }).click();
    await expect(page.getByText(attempt === 4 ? 'Please wait 30 seconds. Then try again.'
      : 'That PIN did not match. Try again.', { exact: true })).toBeVisible();
    await expectFit(page);
  }
  await expect(page.getByRole('button', { name: '1', exact: true })).toBeDisabled();
});
