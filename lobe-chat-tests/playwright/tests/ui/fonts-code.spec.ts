import { expect, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import { gotoInbox, sendMessage, waitForAssistantText } from '../../support/ui.js';

test('renders code in the patched Lobe UI code font', async ({ page }) => {
  const chat = new BrowserChatMock('MSM code sample `msm_code_token` end');
  await chat.install(page);
  await gotoInbox(page);

  await sendMessage(page, 'MSM show code');
  await waitForAssistantText(page, 'MSM code sample');

  const code = page.locator('code').filter({ hasText: 'msm_code_token' }).last();
  await expect(code).toBeVisible();
  const fontFamily = await code.evaluate((element) => {
    return window.getComputedStyle(element).fontFamily;
  });

  expect(fontFamily).toContain('Mgen+ 1mn');
});

test('drops the default Harmony and Simplified Chinese body fonts', async ({ page }) => {
  await gotoInbox(page);

  const fontFamily = await page.locator('body').evaluate((element) => {
    return window.getComputedStyle(element).fontFamily;
  });

  expect(fontFamily).not.toMatch(/HarmonyOS Sans|PingFang SC|Microsoft YaHei/);
});
