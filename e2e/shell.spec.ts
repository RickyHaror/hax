import { readFileSync, readdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { parseAudioManifest } from '../src/engine/audio-manifest';
import { trackForeignRequests } from './support/guards';

function offlineAudioUrls(): string[] {
  const root = new URL('../public/audio/', import.meta.url);
  const manifest = parseAudioManifest(JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')));
  expect(manifest).not.toBeNull();
  const voice = Object.values(manifest!.lines)[0];
  expect(voice).toBeDefined();
  return [`/audio/lines/${voice}`, ...['sfx', 'music'].map((folder) => {
    const file = readdirSync(new URL(`${folder}/`, root)).find((name) => name.endsWith('.mp3'));
    expect(file).toBeDefined();
    return `/audio/${folder}/${file}`;
  })];
}

async function expectOfflineAudio(page: Page): Promise<void> {
  const results = await page.evaluate(async (urls) => Promise.all(urls.map(async (url) => {
    const response = await fetch(url);
    return { url, ok: response.ok, bytes: (await response.arrayBuffer()).byteLength };
  })), offlineAudioUrls());
  for (const result of results) {
    expect(result.ok, result.url).toBe(true);
    expect(result.bytes, result.url).toBeGreaterThan(0);
  }

  await page.getByRole('button', { name: 'Sound controls', exact: true }).click();
  const autoRead = page.getByRole('button', { name: 'Read to me', exact: true });
  if (await autoRead.getAttribute('aria-pressed') === 'true') await autoRead.click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.waitForLoadState('networkidle');
  const failed: string[] = [];
  page.on('requestfailed', (request) => {
    if (new URL(request.url()).pathname.startsWith('/audio/')) failed.push(request.url());
  });
  const finished = page.waitForEvent('requestfinished', {
    predicate: (request) => new URL(request.url()).pathname.startsWith('/audio/lines/'),
  });
  const read = page.getByRole('button', { name: 'Read aloud', exact: true }).first();
  await read.click();
  await finished;
  await expect(read).toHaveAttribute('aria-pressed', 'false', { timeout: 15_000 });
  expect(failed).toEqual([]);
}

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
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 60_000 }).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
  await expectOfflineAudio(page);
  await context.setOffline(false);
});

test('page does not scroll sideways', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
