import { test, expect, type Page } from '@playwright/test';
import { createProgress, STORAGE_KEY } from '../src/engine/progress';
import type { Mission } from '../src/engine/types';
import { missions } from '../src/missions';
import { begin } from './support/play';

async function resumeLayout(page: Page, mission: Mission, phase: 'step' | 'outro' = 'step', index = 0) {
  const progress = { ...createProgress(), firstWord: 0, secondWord: 0, sidekick: 0,
    completed: Object.fromEntries(missions.filter((entry) => entry.id !== mission.id)
      .map((entry) => [entry.id, '2026-11-08T12:00:00.000Z'])),
    current: { missionId: mission.id, stepId: JSON.stringify([phase, index]) },
  };
  await page.addInitScript(({ key, progress }) => {
    localStorage.clear(); localStorage.setItem(key, JSON.stringify(progress));
  }, { key: STORAGE_KEY, progress });
  await page.goto('/'); await begin(page);
  await page.evaluate(() => document.fonts.ready);
}

async function expectScreenFit(page: Page) {
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    return { pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
      width: innerWidth, height: innerHeight, panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(layout.width);
  expect(layout.pageHeight).toBeLessThanOrEqual(layout.height);
  expect(layout.panelWidth).toBeLessThanOrEqual(layout.visibleWidth);
  expect(layout.panelHeight).toBeLessThanOrEqual(layout.visibleHeight);
}

test('terminal output fills the desktop work column', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await resumeLayout(page, missions.find((mission) => mission.steps[0]?.config.kind === 'terminal')!);
  const work = await page.locator('.step-work').boundingBox();
  const output = await page.getByRole('log', { name: 'Terminal output' }).boundingBox();
  expect(work).not.toBeNull(); expect(output).not.toBeNull();
  expect(output!.height).toBeGreaterThanOrEqual(work!.height * .6);
  await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expectScreenFit(page);
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeInViewport({ ratio: 1 });
});

test('decoder letters are readable and its controls fit the laptop', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await resumeLayout(page, missions.find((mission) => mission.steps[0]?.config.kind === 'decoder')!);
  const fonts = await page.locator('.wheel-letter').evaluateAll((letters) =>
    letters.map((letter) => parseFloat(getComputedStyle(letter).fontSize)));
  expect(fonts).toHaveLength(52);
  for (const size of fonts) expect(size).toBeGreaterThanOrEqual(24);
  const wheel = page.getByRole('slider', { name: 'Decoder wheel', exact: true });
  const laptop = await wheel.boundingBox(); expect(laptop).not.toBeNull();
  await page.getByRole('button', { name: 'Turn right', exact: true }).click();
  await expect(wheel).toHaveAttribute('aria-valuenow', '1');
  const box = laptop!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(wheel).not.toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
  const tool = await page.locator('.decoder-tool').evaluate((element) => ({
    height: element.clientHeight, content: element.scrollHeight,
  }));
  expect(tool.content).toBeLessThanOrEqual(tool.height);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const desktop = await wheel.boundingBox();
  expect(desktop!.width).toBeGreaterThan(laptop!.width);
  expect(await page.locator('.wheel-letter').first().evaluate((letter) =>
    parseFloat(getComputedStyle(letter).fontSize))).toBeGreaterThan(fonts[0]!);
});

async function expectDecoderHintsFit(page: Page) {
  const form = await page.locator('.decoder-tool .answer-form').boundingBox();
  const label = await page.locator('.decoder-tool .answer-form > label').boundingBox();
  const hints = page.getByRole('region', { name: 'Hints', exact: true });
  const box = await hints.boundingBox();
  const help = await page.getByRole('button', { name: 'Help me', exact: true }).boundingBox();
  expect(form).not.toBeNull(); expect(label).not.toBeNull(); expect(box).not.toBeNull(); expect(help).not.toBeNull();
  expect(Math.abs(help!.x - label!.x)).toBeLessThanOrEqual(4);
  expect(help!.y).toBeGreaterThanOrEqual(form!.y + form!.height);
  expect(Math.abs(box!.width - form!.width)).toBeLessThanOrEqual(4);
  for (const control of [page.getByRole('textbox', { name: 'Answer', exact: true }),
    page.getByRole('button', { name: 'Check', exact: true })]) {
    const bounds = await control.boundingBox(); expect(bounds).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  const words = hints.locator('.speaker-lines');
  if (await words.count()) {
    const bounds = await words.boundingBox(); expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(help!.y + help!.height);
    expect(Math.abs(bounds!.width - form!.width)).toBeLessThanOrEqual(4);
    await expect(words).toBeInViewport({ ratio: 1 });
  }
  const tool = await page.locator('.decoder-tool').evaluate((element) => ({
    height: element.clientHeight, content: element.scrollHeight,
    bottom: element.getBoundingClientRect().bottom,
    controlsBottom: element.querySelector('.wheel-actions')!.getBoundingClientRect().bottom,
  }));
  expect(tool.height).toBeGreaterThan(0);
  expect(tool.content).toBeLessThanOrEqual(tool.height);
  expect(tool.controlsBottom).toBeLessThanOrEqual(tool.bottom - 6);
  await expect(hints).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
}

for (const id of ['m3-zoo', 'm7-graduation']) test(`${id} decoder hints fit below the answer at both desktop sizes`, async ({ page }) => {
  const mission = missions.find((mission) => mission.id === id)!;
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await resumeLayout(page, mission, 'step', mission.steps.findIndex((step) => step.config.kind === 'decoder'));
    const help = page.getByRole('button', { name: 'Help me', exact: true });
    for (let rung = 0; rung <= 3; rung++) {
      const wheel = await page.getByRole('slider', { name: 'Decoder wheel', exact: true }).boundingBox();
      expect(wheel!.width).toBeGreaterThanOrEqual(330);
      await expectDecoderHintsFit(page);
      if (rung < 3) await help.click();
    }
  }
});

test('start login keeps the note and Check in view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/'); await begin(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.login-art svg')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.answer-form .speech-line').first()).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('textbox', { name: 'Password', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  for (let rung = 0; rung < 3; rung++) await page.getByRole('button', { name: 'Help me', exact: true }).click();
  await expectScreenFit(page);
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport({ ratio: 1 });
});

test('mission login keeps the note and Check in view', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await resumeLayout(page, missions.find((mission) => mission.chapter === 'login')!);
  await expect(page.locator('.step-story > svg')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.answer-form .speech-line').first()).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('textbox', { name: 'Answer', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
});

test('celebration fits the laptop with still sparkles under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await resumeLayout(page, missions.find((mission) => mission.steps[0]?.config.kind === 'terminal')!, 'outro');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Great work, Agent! Mission saved.', exact: true })).toBeVisible();
  await expect(page.getByText('You did it! I am so proud of you.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
  const sparkle = page.locator('.done-sparkles i').first();
  await expect(sparkle).toBeVisible();
  expect(await sparkle.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('onboarding fits with Next visible and no sideways scroll', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
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

test('HQ mission wall fits the laptop while chapters scroll inside it', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const training = missions.filter((mission) => mission.chapter !== 'missions');
  const progress = { ...createProgress(), firstWord: 0, secondWord: 0, sidekick: 0,
    completed: Object.fromEntries(training.map((mission) => [mission.id, '2026-11-08T12:00:00.000Z'])),
  };
  await page.addInitScript(({ key, progress }) => {
    localStorage.clear(); localStorage.setItem(key, JSON.stringify(progress));
  }, { key: STORAGE_KEY, progress });
  await page.goto('/'); await begin(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('button', { name: 'Agent Playground', exact: true })).toBeVisible();
  await expect(page.getByText('Next mission', { exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'My agent card', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Settings', exact: true }).last()).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Stop for today', exact: true })).toBeInViewport({ ratio: 1 });
  await expectScreenFit(page);
  const chapters = page.locator('.map-chapters');
  expect(await chapters.evaluate((element) => getComputedStyle(element).overflowY)).toBe('auto');
  const targets = await page.locator('.mission-map button').evaluateAll((buttons) => buttons
    .filter((button) => button.getBoundingClientRect().height > 0)
    .map((button) => ({ width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
  for (const target of targets) {
    expect(target.width).toBeGreaterThanOrEqual(48);
    expect(target.height).toBeGreaterThanOrEqual(48);
  }
  expect(await page.locator('.map-card-next').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
