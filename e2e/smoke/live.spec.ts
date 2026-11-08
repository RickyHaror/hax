import { test, expect } from '@playwright/test';

test('live site serves the game with security headers', async ({ page, request, baseURL }) => {
  const res = await request.get(baseURL!);
  expect(res.status()).toBe(200);
  const csp = res.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'AGENT HQ' })).toBeVisible();
});

test('live site ships a manifest and service worker', async ({ request, baseURL }) => {
  const manifest = await request.get(new URL('/manifest.webmanifest', baseURL).toString());
  expect(manifest.status()).toBe(200);
  expect((await manifest.json()).name).toBe('Hax');
  const sw = await request.get(new URL('/sw.js', baseURL).toString());
  expect(sw.status()).toBe(200);
  expect(sw.headers()['cache-control']).toContain('no-cache');
});
