import { expect, test } from '@playwright/test';

import { gotoInbox } from '../../support/ui.js';

test('uses the patched Lobe UI font stack without default webfonts', async ({ page }) => {
  const requestedURLs: string[] = [];
  page.on('request', (request) => requestedURLs.push(request.url()));

  await gotoInbox(page);

  const fontFamily = await page.locator('body').evaluate((element) => {
    return window.getComputedStyle(element).fontFamily;
  });

  expect(fontFamily).toContain('IBM Plex Sans JP');
  expect(requestedURLs.join('\n')).not.toMatch(/webfont-(?:harmony|mono|geist)/i);
});

test('ships IBM Plex Sans JP links in every selected web entry document', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'entry documents only need one browser pass');
  const entries = ['/agent/inbox', '/spa-auth/en-US', '/spa-workbench/en-US', '/spa-share/en-US'];

  for (const entry of entries) {
    const response = await request.get(entry);
    expect(response.ok(), `${entry} returned ${response.status()}`).toBeTruthy();
    expect(await response.text()).toContain('IBM+Plex+Sans+JP');
  }
});

test.describe('Lobe UI-only shells', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('applies the patched Japanese stack from the Lobe UI theme', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the theme stylesheet only needs one browser pass',
    );
    const requestedURLs: string[] = [];
    page.on('request', (request) => requestedURLs.push(request.url()));

    await page.goto('/signin?hl=ja-JP', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja-JP');

    const fonts = await page.locator('body').evaluate((element) => {
      const code = document.createElement('code');
      element.append(code);
      const result = {
        body: window.getComputedStyle(element).fontFamily,
        code: window.getComputedStyle(code).fontFamily,
      };
      code.remove();
      return result;
    });

    expect(fonts.body).toMatch(/^"?IBM Plex Sans JP"?,/);
    expect(fonts.body).toContain('Hiragino Sans');
    expect(fonts.body).not.toMatch(/Geist|HarmonyOS|PingFang SC/);
    expect(fonts.code).toMatch(/^"?Mgen\+ 1mn"?,/);
    expect(requestedURLs.join('\n')).not.toMatch(/webfont-(?:harmony|mono|geist)/i);
  });
});
