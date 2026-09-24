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
  expect(requestedURLs.join('\n')).not.toMatch(/webfont-(?:harmony|harmony-sans-sc|mono)/i);
});

test('ships IBM Plex Sans JP links in every selected web entry document', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'entry documents only need one browser pass');
  const entries = [
    '/agent/inbox',
    '/spa-auth/en-US',
    '/spa-workbench/en-US',
    '/spa-share/en-US',
  ];

  for (const entry of entries) {
    const response = await request.get(entry);
    expect(response.ok(), `${entry} returned ${response.status()}`).toBeTruthy();
    expect(await response.text()).toContain('IBM+Plex+Sans+JP');
  }
});
