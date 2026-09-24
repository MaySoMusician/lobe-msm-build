import { expect, test } from '@playwright/test';

import { gotoInbox } from '../../support/ui.js';

test('uses the patched Lobe UI font stack without Harmony webfonts', async ({ page }) => {
  const requestedURLs: string[] = [];
  page.on('request', (request) => requestedURLs.push(request.url()));

  await gotoInbox(page);

  const fontFamily = await page.locator('body').evaluate((element) => {
    return window.getComputedStyle(element).fontFamily;
  });

  expect(fontFamily).toContain('IBM Plex Sans JP');
  expect(requestedURLs.join('\n')).not.toMatch(/webfont-(?:harmony|harmony-sans-sc)/i);
});
