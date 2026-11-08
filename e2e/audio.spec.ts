import { test, expect } from '@playwright/test';

test('sound panel saves independent channel switches and levels across reload', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    HTMLMediaElement.prototype.pause = () => {};
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Sound controls', exact: true });
  await opener.click(); await expect(opener).toHaveAttribute('aria-expanded', 'true');
  const panel = page.getByRole('dialog', { name: 'Sound controls', exact: true });
  const choices = [['Voices', 'quiet'], ['Sounds', 'loud'], ['Music', 'medium']];
  for (const [name, level] of choices) {
    await panel.getByRole('button', { name: `${name} on`, exact: true }).click();
    await expect(panel.getByRole('button', { name: `${name} off`, exact: true }))
      .toHaveAttribute('aria-pressed', 'false');
    await panel.getByRole('button', { name: `${name} ${level}`, exact: true }).click();
    await expect(panel.getByRole('button', { name: `${name} ${level}`, exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
  }
  const fits = await panel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
  });
  expect(fits).toBe(true);
  await page.keyboard.press('Escape'); await expect(opener).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await opener.click();
  for (const [name, level] of choices) {
    await expect(panel.getByRole('button', { name: `${name} off`, exact: true }))
      .toHaveAttribute('aria-pressed', 'false');
    await expect(panel.getByRole('button', { name: `${name} ${level}`, exact: true }))
      .toHaveAttribute('aria-pressed', 'true');
  }
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(opener).toBeFocused(); await expect(opener).toHaveAttribute('aria-expanded', 'false');
});
