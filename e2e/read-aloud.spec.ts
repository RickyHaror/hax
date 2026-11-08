import { test, expect } from '@playwright/test';

declare global {
  interface Window { audioCalls: string[] }
}

test('begin unlocks audio and both reading controls play a clip or speech', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    window.audioCalls = [];
    HTMLMediaElement.prototype.play = function () {
      window.audioCalls.push(this.src);
      return Promise.resolve();
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Local English', lang: 'en-CA', localService: true, voiceURI: 'local' }],
      speak: (utterance: SpeechSynthesisUtterance) => window.audioCalls.push(utterance.text),
      cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true,
      value: class { constructor(public text: string) {} } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AGENT HQ', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.audioCalls)).toEqual([]);
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.audioCalls.length)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Sound controls', exact: true }).click();
  const toggle = page.getByRole('button', { name: 'Read to me', exact: true });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Read to me: OFF', { exact: true })).toBeVisible();
  await page.evaluate(() => { window.audioCalls = []; });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Read to me: ON', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.audioCalls.length)).toBeGreaterThan(0);
  await toggle.click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(() => { window.audioCalls = []; });
  const line = page.getByRole('button', { name: 'Read aloud', exact: true }).first();
  await line.click();
  await expect.poll(() => page.evaluate(() => window.audioCalls.length)).toBeGreaterThan(0);
  await expect(line).toHaveAttribute('aria-pressed', 'true');
  await expect(line).toHaveAttribute('title', 'Read aloud');
  await expect(line).toHaveClass(/line-reading/);
  await line.click();
  await expect(line).toHaveAttribute('aria-pressed', 'false');
});
