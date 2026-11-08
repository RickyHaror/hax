import { join } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

function safe(value: string): string {
  return value.replace(/[^a-z0-9-]/gi, '-');
}

export async function shot(page: Page, info: TestInfo, group: string, label: string): Promise<void> {
  if (!['chromium-1366', 'chromium-phone'].includes(info.project.name)) return;
  const prefix = `screen:${safe(group)}:`;
  const number = String(info.attachments.filter((entry) => entry.name.startsWith(prefix)).length + 1).padStart(2, '0');
  const path = join('build-logs', 'screens', info.project.name, safe(group), `${number}-${safe(label)}.png`);
  await page.screenshot({ path });
  await info.attach(`${prefix}${number}-${safe(label)}`, { path, contentType: 'image/png' });
}
