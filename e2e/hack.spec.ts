import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { build } from 'vite';
import preact from '@preact/preset-vite';
import { checkLayout } from './support/layout-check';

const assets = new Map<string, { contentType: string; body: string | Buffer }>();
test.beforeAll(async () => {
  // Bundle only the test entry in memory. Production has no fixture route.
  const result = await build({ configFile: false, plugins: [preact()], base: '/__hack_fixture__/',
    logLevel: 'error', build: { write: false, emptyOutDir: false,
      rollupOptions: { input: resolve('e2e/support/hack-app.tsx'), output: { entryFileNames: 'hack.js' } } } });
  for (const bundle of Array.isArray(result) ? result : [result]) {
    if (!('output' in bundle)) throw new Error('The fixture must produce a bundle.');
    for (const file of bundle.output) {
      const contentType = file.type === 'chunk' ? 'text/javascript'
        : file.fileName.endsWith('.css') ? 'text/css' : 'application/octet-stream';
      assets.set(file.fileName, { contentType,
        body: file.type === 'chunk' ? file.code : typeof file.source === 'string' ? file.source : Buffer.from(file.source) });
    }
  }
});

async function openFixture(page: Page) {
  await page.route('**/__hack_fixture__/**', async (route) => {
    const name = new URL(route.request().url()).pathname.replace('/__hack_fixture__/', '');
    if (name) {
      const asset = assets.get(name);
      if (!asset) throw new Error(`Missing fixture asset: ${name}`);
      await route.fulfill(asset);
    } else {
      const styles = [...assets.keys()].filter((name) => name.endsWith('.css'))
        .map((name) => `<link rel="stylesheet" href="/__hack_fixture__/${name}">`).join('');
      await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><head>
        <meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body>
        <div id="app"></div><script type="module" src="/__hack_fixture__/hack.js"></script></body></html>` });
    }
  });
  await page.goto('/__hack_fixture__/');
  await expect(page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true })).toBeVisible();
  await checkLayout(page, 'hack-begin');
  await page.getByRole('button', { name: 'Tap to begin, Agent!', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start mission', exact: true })).toBeVisible();
  await checkLayout(page, 'hack-intro');
  await page.getByRole('button', { name: 'Start mission', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I accept', exact: true })).toBeVisible();
  await checkLayout(page, 'hack-permission');
  await page.getByRole('button', { name: 'I accept', exact: true }).click();
}

async function run(page: Page, text: string, label = 'Command') {
  const input = page.getByRole('textbox', { name: label, exact: true });
  await input.fill(text); await input.press('Enter');
  await checkLayout(page, `hack-after-${label}`);
}

async function expectFit(page: Page) {
  await checkLayout(page, 'hack-step');
  const sizes = await page.evaluate(() => {
    const main = document.querySelector('main')!;
    const work = document.querySelector('.step-work')!;
    return { width: innerWidth, height: innerHeight,
      pageWidth: document.documentElement.scrollWidth, pageHeight: document.documentElement.scrollHeight,
      panelWidth: main.scrollWidth, panelHeight: main.scrollHeight,
      visibleWidth: main.clientWidth, visibleHeight: main.clientHeight,
      workHeight: work.scrollHeight, visibleWorkHeight: work.clientHeight };
  });
  expect(sizes.pageWidth).toBeLessThanOrEqual(sizes.width);
  expect(sizes.pageHeight).toBeLessThanOrEqual(sizes.height);
  expect(sizes.panelWidth).toBeLessThanOrEqual(sizes.visibleWidth);
  expect(sizes.panelHeight).toBeLessThanOrEqual(sizes.visibleHeight);
  expect(sizes.workHeight).toBeLessThanOrEqual(sizes.visibleWorkHeight);
  await expect(page.getByRole('textbox')).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Enter', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Stop for today', exact: true })).toBeInViewport();
}

test('plays connected hack steps with secret input, hints, alarms and a fitted terminal', async ({ page }) => {
  await openFixture(page); await expectFit(page);
  await page.getByRole('button', { name: 'connect shop-pc', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Command', exact: true })).toHaveValue('connect shop-pc ');
  await checkLayout(page, 'hack-connect-chip');
  await page.getByRole('textbox').press('Enter');
  await checkLayout(page, 'hack-user-prompt');
  await run(page, 'admin', 'User name:');
  await run(page, 'wrong-code', 'Password:');
  await expect(page.getByRole('meter', { name: 'Alarm', exact: true })).toHaveAttribute('aria-valuenow', '1');
  await run(page, 'connect shop-pc'); await run(page, 'admin', 'User name:');
  await run(page, 'wrong-again', 'Password:');
  await expect(page.getByRole('meter', { name: 'Alarm', exact: true })).toHaveAttribute('aria-valuenow', '0');
  const output = page.getByRole('log', { name: 'Terminal output', exact: true });
  await expect(output).toContainText('HQ pulled you out. Your work is safe.');
  const command = page.getByRole('textbox', { name: 'Command', exact: true });
  await command.fill('connect sh'); await command.press('Tab'); await expect(command).toHaveValue('connect shop-pc ');
  await checkLayout(page, 'hack-completed-command');
  await command.press('Enter');
  await checkLayout(page, 'hack-reconnected-user-prompt');
  await run(page, 'admin', 'User name:');
  const secret = page.getByRole('textbox', { name: 'Password:', exact: true });
  await secret.pressSequentially('apple-code'); await expect(secret).toHaveValue('**********');
  await expect(page.locator('body')).not.toContainText('apple-code');
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await checkLayout(page, 'hack-masked-password');
  await secret.press('Enter');
  await checkLayout(page, 'hack-visit-success');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.command-row .prompt-full')).toHaveText('admin@shop-pc:~$');
  await expect(output).toContainText('Password: **********');
  await run(page, 'help'); await run(page, 'help'); await expectFit(page);
  await page.getByRole('button', { name: 'Help me', exact: true }).click();
  await checkLayout(page, 'hack-send-hint-1');
  await page.getByRole('button', { name: '2 Bigger hint', exact: true }).click();
  await checkLayout(page, 'hack-send-hint-2');
  await page.getByRole('button', { name: '3 Show me', exact: true }).click();
  await checkLayout(page, 'hack-send-show-me');
  await page.getByRole('button', { name: 'Close hints', exact: true }).click();
  await checkLayout(page, 'hack-send-hints-closed');
  await expect(command).toHaveValue('submit clue.txt');
  await page.getByRole('button', { name: 'Show me', exact: true }).click();
  await expect(command).toHaveValue('submit clue.txt');
  await expect(page.getByRole('heading', { name: 'Send the clue', exact: true })).toBeVisible();
  await expectFit(page); await command.press('Enter');
  await checkLayout(page, 'hack-send-success');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await checkLayout(page, 'hack-outro');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Great work, Agent!', exact: true })).toBeVisible();
  await checkLayout(page, 'hack-done');
});
