import { expect, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import {
  gotoInbox,
  sendMessage,
  visibleButtonByIcon,
  waitForAssistantText,
} from '../../support/ui.js';

test('opens Share on JSON with OpenAI-compatible export selected', async ({ page }) => {
  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  await sendMessage(page, 'MSM share defaults');
  await waitForAssistantText(page, 'MSM deterministic assistant response');

  const shareButton = await visibleButtonByIcon(page.locator('body'), [
    'lucide-share-2',
    'lucide-share',
  ]);
  if (!shareButton) {
    throw new Error('Could not find the visible Share action');
  }
  await shareButton.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab', { name: 'JSON' })).toHaveAttribute('aria-selected', 'true');
  await expect(dialog.getByRole('tab', { name: /^OpenAI Compatible$/i })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
