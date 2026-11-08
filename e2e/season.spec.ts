import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { build } from 'vite';
import preact from '@preact/preset-vite';

const assets = new Map<string, { contentType: string; body: string | Buffer }>();
test.beforeAll(async () => {
  const result = await build({ configFile: false, plugins: [preact()], base: '/__season_fixture__/',
    logLevel: 'error', build: { write: false, emptyOutDir: false,
      rollupOptions: { input: resolve('e2e/support/season-app.tsx'), output: { entryFileNames: 'season.js' } } } });
  for (const bundle of Array.isArray(result) ? result : [result]) {
    if (!('output' in bundle)) throw new Error('The fixture must produce a bundle.');
    for (const file of bundle.output) {
      assets.set(file.fileName, { contentType: file.type === 'chunk' ? 'text/javascript'
        : file.fileName.endsWith('.css') ? 'text/css' : 'application/octet-stream',
      body: file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : Buffer.from(file.source) });
    }
  }
});

async function openFixture(page: Page) {
  await page.route('**/__season_fixture__/**', async (route) => {
    const name = new URL(route.request().url()).pathname.replace('/__season_fixture__/', '');
    if (name) {
      const asset = assets.get(name);
      if (!asset) throw new Error(`Missing fixture asset: ${name}`);
      await route.fulfill(asset);
    } else {
      const styles = [...assets.keys()].filter((name) => name.endsWith('.css'))
        .map((name) => `<link rel="stylesheet" href="/__season_fixture__/${name}">`).join('');
      await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><head>
        <meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body>
        <div id="app"></div><script type="module" src="/__season_fixture__/season.js"></script></body></html>` });
    }
  });
  await page.goto('/__season_fixture__/');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
}

async function expectFit(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const sizes = await page.evaluate(() => {
    const panel = document.querySelector('main')!;
    return { width: innerWidth, height: innerHeight,
      pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
      panelWidth: panel.scrollWidth, panelHeight: panel.scrollHeight,
      visibleWidth: panel.clientWidth, visibleHeight: panel.clientHeight };
  });
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.pageHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.panelWidth).toBeLessThanOrEqual(sizes.visibleWidth);
  expect(sizes.panelHeight).toBeLessThanOrEqual(sizes.visibleHeight);
  for (const area of await page.locator('.map-chapters, .contract-content, .done-scroll, .idcard-body, .idcard-details, .idcard-photos').all()) {
    const width = await area.evaluate((element) => ({ content: element.scrollWidth, visible: element.clientWidth }));
    expect(width.content).toBeLessThanOrEqual(width.visible);
  }
  for (const line of await page.locator('.speech-line > span').all()) {
    expect(await line.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  }
  for (const button of await page.getByRole('button').all()) {
    if (!await button.isVisible()) continue;
    const size = await button.boundingBox();
    expect(size!.width).toBeGreaterThanOrEqual(44);
    expect(size!.height).toBeGreaterThanOrEqual(44);
  }
}

test('walks the season map, contract, clue finish, and learned commands', async ({ page }) => {
  await openFixture(page);
  const town = page.getByRole('region', { name: 'Season 1 · Town', exact: true });
  await expect(town.locator('.map-title')).toHaveText(['✓ First clue', '✓ Next clue', 'Shop clue']);
  const harbor = page.getByRole('region', { name: 'Season 2 · Harbor', exact: true });
  await expect(harbor.locator('.map-mission')).toBeDisabled();
  await expectFit(page);
  await town.getByRole('button', { name: /^Shop clue/ }).click();
  const contract = page.getByRole('region', { name: 'Mission briefing', exact: true });
  for (const text of ['Sam', 'Shop owner', 'Find our clue.', 'Send our clue to HQ.',
    'Only hack what you own or have permission to hack.', 'shop-pc']) await expect(contract).toContainText(text);
  await expectFit(page);
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  const command = page.getByRole('textbox', { name: 'Command', exact: true });
  await command.fill('submit clue.txt'); await command.press('Enter');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ACCESS GRANTED', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Captured clue', exact: true })).toContainText('CLUE{shop-safe}');
  await expect(page.getByText('Rank up! Rookie to Agent', { exact: true })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Clue found', exact: true })).toContainText('+20 XP');
  await expectFit(page);
  const key = page.getByRole('region', { name: 'Secret decryption key', exact: true }).locator('output');
  await key.scrollIntoViewIfNeeded(); await expect(key).toBeInViewport();
  await expect(key).toHaveText(/^HAX-([0-9A-Z]{4}-){3}[0-9A-Z]{4}$/);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(harbor.locator('.map-mission')).toBeEnabled();
  await page.getByRole('button', { name: 'My agent card', exact: true }).click();
  const learned = page.getByRole('region', { name: 'Commands learned', exact: true });
  await expect(learned.locator('li .speech-line > span')).toHaveText(['cat', 'submit', 'ls']);
  await expect(page.getByRole('progressbar', { name: 'XP to next rank', exact: true })).toHaveAttribute('value', '60');
  await expectFit(page);
  await learned.scrollIntoViewIfNeeded(); await expect(learned).toBeInViewport();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(town).toBeVisible();
});
