import { defineConfig, devices } from '@playwright/test';

/**
 * Full browser suite. Runs against the production build served by `vite preview`
 * so the service worker and offline mode are exercised for real.
 * Projects cover Chromium and Microsoft Edge at 1366x768 and 1920x1080.
 */
const sizes = {
  laptop: { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
};

const edgeInstalled = !process.env.HAX_SKIP_EDGE;

export default defineConfig({
  testDir: 'e2e',
  testIgnore: ['smoke/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : Number(process.env.PLAYWRIGHT_WORKERS ?? 2),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium-1366', use: { ...devices['Desktop Chrome'], viewport: sizes.laptop } },
    { name: 'chromium-1920', use: { ...devices['Desktop Chrome'], viewport: sizes.desktop } },
    { name: 'chromium-1366x650', testMatch: ['**/fit.spec.ts', '**/layout.spec.ts', '**/startup.spec.ts', '**/hack.spec.ts', '**/season.spec.ts', '**/idcard.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 650 } } },
    { name: 'chromium-phone', testMatch: ['**/fit.spec.ts', '**/layout.spec.ts', '**/startup.spec.ts', '**/hack.spec.ts', '**/season.spec.ts', '**/idcard.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 },
        isMobile: true, hasTouch: true, deviceScaleFactor: 3 } },
    ...(edgeInstalled
      ? [
          { name: 'edge-1366', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: sizes.laptop } },
          { name: 'edge-1920', use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: sizes.desktop } },
        ]
      : []),
  ],
});
