import { expect, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import { gotoInbox, sendMessage, waitForAssistantText } from '../../support/ui.js';

test('leaves native Ctrl+click topic navigation unblocked', async ({ context, page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop topic sidebar behavior');

  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  await sendMessage(page, 'MSM modifier-click topic');
  await waitForAssistantText(page, 'MSM deterministic assistant response');

  const topic = page.locator('a[href*="/agent/"][href*="/tpc_"]').first();
  await expect(topic).toBeVisible();
  const originalURL = page.url();

  await topic.evaluate((element) => {
    (window as any).__msmModifierDefaultPrevented = undefined;
    element.addEventListener(
      'click',
      (event) => {
        queueMicrotask(() => {
          (window as any).__msmModifierDefaultPrevented = event.defaultPrevented;
        });
      },
      { once: true },
    );
  });
  await topic.dispatchEvent('click', {
    bubbles: true,
    cancelable: true,
    ctrlKey: true,
  });

  await expect
    .poll(() => page.evaluate(() => (window as any).__msmModifierDefaultPrevented))
    .toBe(false);
  expect(page.url()).toBe(originalURL);

  for (const opened of context.pages().filter((candidate) => candidate !== page)) {
    await opened.close();
  }
});
