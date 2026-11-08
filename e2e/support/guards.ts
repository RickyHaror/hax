import type { Page } from '@playwright/test';

/**
 * Records every request that leaves the game's own origin.
 * Hax must never contact any other host: no CDNs, analytics or links out.
 */
export function trackForeignRequests(page: Page, origin: string): string[] {
  const foreign: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (!url.startsWith(origin)) foreign.push(url);
  });
  return foreign;
}
