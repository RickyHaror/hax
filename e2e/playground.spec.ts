import { expect, test, type Page } from '@playwright/test';
import { playground } from '../src/missions/playground';
import { missions } from '../src/missions';
import { begin } from './support/play';
import { prerequisites, seedProgress } from './support/seed';

async function run(page: Page, command: string) {
  const input = page.getByRole('textbox', { name: 'Command', exact: true });
  await input.fill(command); await input.press('Enter');
}
async function expectFit(page: Page) {
  const sizes = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    return { pageWidth: document.documentElement.scrollWidth, width: innerWidth,
      pageHeight: document.documentElement.scrollHeight, height: innerHeight,
      panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight };
  });
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.pageHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.panelWidth).toBeLessThanOrEqual(sizes.visibleWidth);
  expect(sizes.panelHeight).toBeLessThanOrEqual(sizes.visibleHeight);
  await expect(page.getByRole('button', { name: 'Back to the map', exact: true })).toBeInViewport();
  await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toBeInViewport();
}

test('finds every playground egg through the terminal and keeps discoveries on reload', async ({ page }) => {
  if (!playground) throw new Error('Playground content is required for this test.');
  const unlockId = playground.unlockedBy;
  const unlock = missions.find((mission) => mission.id === unlockId);
  if (!unlock) throw new Error('The playground unlock mission must exist.');
  await seedProgress(page, { completed: [...prerequisites(unlock, missions), unlock.id] });
  await page.goto('/'); await begin(page);
  await page.getByRole('button', { name: 'Agent Playground', exact: true }).click();
  await expectFit(page);
  await expect(page.getByText('Type a command. Press Enter to run it.', { exact: true })).toBeInViewport();
  for (const egg of playground.eggs) {
    const trigger = egg.trigger;
    if (trigger.type === 'command') await run(page, trigger.command);
    else if (trigger.type === 'cwd') await run(page, `cd "${trigger.path}"`);
    else {
      const slash = trigger.path.lastIndexOf('/');
      const file = trigger.path.slice(slash + 1);
      await run(page, `cd "${trigger.path.slice(0, slash) || '/'}"`);
      await run(page, file.startsWith('.') ? 'ls -a' : 'ls');
      await expect(page.getByRole('log', { name: 'Terminal output', exact: true })).toContainText(file);
      await run(page, `cat "${file}"`);
    }
    await expect(page.getByRole('list', { name: 'Egg badges', exact: true })).toContainText(egg.name);
  }
  const count = `Eggs found: ${playground.eggs.length} of ${playground.eggs.length}`;
  await expect(page.getByText(count, { exact: true })).toBeVisible();
  await expectFit(page);
  await page.reload(); await begin(page);
  await page.getByRole('button', { name: 'Agent Playground', exact: true }).click();
  await expect(page.getByText(count, { exact: true })).toBeVisible();
  await expectFit(page);
  await page.getByRole('button', { name: 'Back to the map', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Agent Playground', exact: true })).toBeVisible();
});
