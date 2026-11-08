import { test, expect, type Locator, type Page } from '@playwright/test';
import { STORAGE_KEY, toSaveCode, type Progress } from '../src/engine/progress';
import { missions } from '../src/missions';
import { begin } from './support/play';

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function fits(page: Page, controls: Locator[]) {
  const size = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth, viewportHeight: innerHeight,
    panelWidth: document.querySelector('main')!.scrollWidth,
    panelHeight: document.querySelector('main')!.scrollHeight,
    panelClientWidth: document.querySelector('main')!.clientWidth,
    panelClientHeight: document.querySelector('main')!.clientHeight,
  }));
  expect(size.width).toBeLessThanOrEqual(size.viewportWidth);
  expect(size.height).toBeLessThanOrEqual(size.viewportHeight);
  expect(size.panelWidth).toBeLessThanOrEqual(size.panelClientWidth);
  expect(size.panelHeight).toBeLessThanOrEqual(size.panelClientHeight);
  for (const control of controls) {
    await expect(control).toBeInViewport({ ratio: 1 });
    const bounds = await control.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
}

async function focusFits(control: Locator) {
  await control.page().keyboard.press('Tab');
  await control.focus();
  const ring = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    const gap = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
    const rect = element.getBoundingClientRect();
    const clipped: string[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const css = getComputedStyle(parent), box = parent.getBoundingClientRect();
      if (css.overflowX !== 'visible' && (rect.left - gap < box.left || rect.right + gap > box.right)) clipped.push('x');
      if (css.overflowY !== 'visible' && (rect.top - gap < box.top || rect.bottom + gap > box.bottom)) clipped.push('y');
    }
    return { width: parseFloat(style.outlineWidth), style: style.outlineStyle, clipped };
  });
  expect(ring.style).not.toBe('none'); expect(ring.width).toBeGreaterThanOrEqual(3);
  expect(ring.clipped).toEqual([]);
}

async function signIn(page: Page) {
  await expect(page.getByRole('heading', { name: 'AGENT HQ', level: 1, exact: true })).toBeVisible();
  const password = page.getByRole('textbox', { name: 'Password', exact: true });
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await fits(page, [password, button(page, 'Check'), button(page, 'Show letters'), button(page, 'Help me'),
    button(page, 'I have a secret key')]);
  const terminal = page.locator('.login-screen .terminal-body');
  expect(await terminal.evaluate((element) => element.scrollHeight)).toBeLessThanOrEqual(
    await terminal.evaluate((element) => element.clientHeight));
  for (const name of ['Help me', '2 Bigger hint', '3 Show me']) {
    await button(page, name).click();
    await fits(page, [button(page, 'Close hints')]);
  }
  await expect(password).not.toBeEmpty();
  await button(page, 'Close hints').click();
  await focusFits(password);
  await button(page, 'Check').click();
  await fits(page, [button(page, 'Next')]); await button(page, 'Next').click();
}

async function pickIdentity(page: Page) {
  await expect(page.getByRole('heading', { name: 'Pick your agent name', level: 1, exact: true })).toBeVisible();
  await expect(page.locator('.onboarding input')).toHaveCount(0);
  const first = page.getByRole('group', { name: 'First word', exact: true });
  const second = page.getByRole('group', { name: 'Second word', exact: true });
  await fits(page, [first.getByRole('button').nth(1), second.getByRole('button').nth(1),
    button(page, 'Shuffle'), button(page, 'Bit'), button(page, 'Pixel'), button(page, 'Hoot'), button(page, 'Next')]);
  await first.getByRole('button').nth(1).click(); await second.getByRole('button').nth(1).click();
  await expect(first.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(second.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  const oldWords = await first.textContent();
  await button(page, 'Shuffle').click(); await expect(first).not.toHaveText(oldWords!);
  await first.getByRole('button').first().click(); await second.getByRole('button').first().click();
  await button(page, 'Pixel').click(); await expect(button(page, 'Pixel')).toHaveAttribute('aria-pressed', 'true');
  await fits(page, [button(page, 'Next'), page.locator('.name-preview').getByRole('button', { name: 'Read aloud', exact: true })]);
  await focusFits(button(page, 'Next')); await button(page, 'Next').click();
}

test('begin, sign in, word picks and secret key fit the startup shell', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('startup-fresh')) return;
    localStorage.clear(); sessionStorage.setItem('startup-fresh', 'yes');
  });
  await page.goto('/'); await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { name: '>_HAX', exact: true })).toBeVisible();
  await fits(page, [button(page, 'Tap to begin, Agent!')]); await focusFits(button(page, 'Tap to begin, Agent!'));
  await begin(page);
  await button(page, 'I have a secret key').click();
  const key = page.getByRole('textbox', { name: 'Secret key', exact: true });
  await expect(key).toHaveAccessibleName('Secret key');
  await fits(page, [key, button(page, 'Check'), button(page, 'Back')]); await focusFits(key);
  await key.fill('tiny'); await button(page, 'Check').click();
  await expect(page.getByText('Your key needs twelve letters and numbers. Check your notebook.')).toBeVisible();
  await fits(page, [key, button(page, 'Back')]); await button(page, 'Back').click();
  await signIn(page); await pickIdentity(page);
  const progress = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!) as Progress;
  const code = toSaveCode(progress, missions);
  await page.reload(); await begin(page);
  await expect(page.locator('.mission-map')).toBeVisible();
  await page.evaluate(() => localStorage.clear()); await page.reload(); await begin(page);
  await button(page, 'I have a secret key').click(); await key.fill(code); await button(page, 'Check').click();
  await expect(page.getByText('Your key worked. Welcome back!', { exact: true })).toBeVisible();
});
