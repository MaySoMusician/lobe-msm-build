import { expect, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import {
  gotoInbox,
  messageWrapperWithText,
  openMessageActions,
  sendMessage,
  waitForAssistantText,
} from '../../support/ui.js';

test('saves a user-message edit without regenerating', async ({ page }) => {
  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  await sendMessage(page, 'MSM original message');
  await waitForAssistantText(page, 'MSM deterministic assistant response');

  const userMessage = messageWrapperWithText(page, 'MSM original message');
  await openMessageActions(page, userMessage);

  const edit = page.getByRole('menuitem', { name: /^Edit$/i });
  await expect(edit).toBeVisible();
  await edit.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const editor = dialog.locator('textarea, [contenteditable="true"]').last();
  await expect(editor).toBeVisible();

  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('MSM edited message');
  const requestCountBeforeSave = chat.requests.length;
  await dialog.getByRole('button', { name: /^Save$/i }).click();

  await expect(page.getByText('MSM edited message', { exact: true }).last()).toBeVisible();
  await expect
    .poll(() => chat.requests.length, { timeout: 3000 })
    .toBe(requestCountBeforeSave);
  await expect(
    page.getByText('MSM deterministic assistant response', { exact: false }).last(),
  ).toBeVisible();
});
