import { expect, type Page, test } from '@playwright/test';

import { findChatInput, gotoInbox } from '../../support/ui.js';

const CHINESE_FAMILY =
  /HarmonyOS|PingFang|Microsoft (YaHei|JhengHei)|Hiragino Sans (GB|CNS)|Source Han Sans (SC|TC|HC)|Noto Sans CJK (SC|TC|HK)/;

const readFontStacks = (page: Page) =>
  page.locator('body').evaluate((element) => {
    const code = document.createElement('code');
    element.append(code);
    const result = {
      body: window.getComputedStyle(element).fontFamily,
      code: window.getComputedStyle(code).fontFamily,
    };
    code.remove();
    return result;
  });

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

test('applies the patched Japanese stack in the main app', async ({ baseURL, page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'the theme stylesheet only needs one browser pass',
  );
  await page.context().addCookies([{ name: 'LOBE_LOCALE', url: baseURL!, value: 'ja-JP' }]);
  await page.goto('/agent/inbox?hl=ja-JP', { waitUntil: 'domcontentloaded' });
  await findChatInput(page);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja-JP');

  const fonts = await readFontStacks(page);
  expect(fonts.body).toMatch(/^"?IBM Plex Sans JP"?,/);
  expect(fonts.body).toContain('Hiragino Sans');
  expect(fonts.body).not.toMatch(/Geist/);
  expect(fonts.body).not.toMatch(CHINESE_FAMILY);
  expect(fonts.code).toMatch(/^"?Mgen\+ 1mn"?,/);
  expect(fonts.code).toContain('Hiragino Sans');
});

test('serves the not-compatible page with IBM Plex instead of Harmony webfonts', async ({
  request,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'static documents only need one browser pass');
  const response = await request.get('/not-compatible.html');
  expect(response.ok(), `not-compatible.html returned ${response.status()}`).toBeTruthy();
  const html = await response.text();
  expect(html).toContain('IBM+Plex+Sans+JP');
  expect(html).not.toMatch(/webfont-harmony|HarmonyOS/i);
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

    const fonts = await readFontStacks(page);

    expect(fonts.body).toMatch(/^"?IBM Plex Sans JP"?,/);
    expect(fonts.body).toContain('Hiragino Sans');
    expect(fonts.body).not.toMatch(/Geist/);
    expect(fonts.body).not.toMatch(CHINESE_FAMILY);
    expect(fonts.code).toMatch(/^"?Mgen\+ 1mn"?,/);
    expect(requestedURLs.join('\n')).not.toMatch(/webfont-(?:harmony|mono|geist)/i);
  });

  test('keeps traditional Chinese on the IBM Plex + Japanese stack', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the theme stylesheet only needs one browser pass',
    );
    await page.goto('/signin?hl=zh-TW', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    const fonts = await readFontStacks(page);
    expect(fonts.body).toMatch(/^"?IBM Plex Sans JP"?,/);
    expect(fonts.body).toContain('Hiragino Sans');
    expect(fonts.body).not.toMatch(CHINESE_FAMILY);
    expect(fonts.code).toMatch(/^"?Mgen\+ 1mn"?,/);
    expect(fonts.code).not.toMatch(CHINESE_FAMILY);
  });
});
