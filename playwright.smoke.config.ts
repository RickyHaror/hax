import { defineConfig, devices } from '@playwright/test';

/** Post-deploy smoke test against the live site. SMOKE_URL is required. */
const url = process.env.SMOKE_URL;
if (!url) throw new Error('SMOKE_URL is required for the smoke suite');

export default defineConfig({
  testDir: 'e2e/smoke',
  retries: 2,
  reporter: [['list']],
  use: { baseURL: url, serviceWorkers: 'allow' },
  projects: [{ name: 'chromium-1366', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } }],
});
