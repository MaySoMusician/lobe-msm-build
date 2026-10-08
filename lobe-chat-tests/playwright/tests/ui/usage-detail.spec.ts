import { expect, test } from '@playwright/test';
import pg from 'pg';

import { BrowserChatMock } from '../../support/chatMock.js';
import { TEST_USER } from '../../support/globalSetup.js';
import {
  gotoInbox,
  messageWrapperWithText,
  sendMessage,
  waitForAssistantText,
} from '../../support/ui.js';

const FULL_TOKEN_COUNT = '111,110';

const enableUsageFooter = async () => {
  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL) {
    throw new Error('DATABASE_URL is required to enable the message usage footer');
  }

  const client = new pg.Client({ connectionString: databaseURL });
  await client.connect();
  try {
    await client.query(
      `INSERT INTO user_settings (id, general)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE
       SET general = COALESCE(user_settings.general, '{}'::jsonb) || EXCLUDED.general`,
      [TEST_USER.id, JSON.stringify({ isDevMode: true })],
    );
  } finally {
    await client.end();
  }
};

test('shows the full token count and opens usage details on hover and click', async ({ page }) => {
  await enableUsageFooter();

  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  await sendMessage(page, 'MSM usage detail');
  await waitForAssistantText(page, 'MSM deterministic assistant response');

  const message = messageWrapperWithText(page, 'MSM deterministic assistant response');
  const usageTrigger = message.locator('svg.lucide-coins').locator('xpath=ancestor::div[1]');
  await expect(usageTrigger).toContainText(FULL_TOKEN_COUNT);
  await expect(usageTrigger).not.toContainText(/k$/i);

  const totalConsumption = page.getByText('Total Consumption', { exact: true });

  await usageTrigger.hover();
  await expect(totalConsumption).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(totalConsumption).toBeHidden();

  await usageTrigger.click();
  await expect(totalConsumption).toBeVisible();
  await expect(usageTrigger).toContainText(FULL_TOKEN_COUNT);
  await expect(usageTrigger).not.toContainText(/k$/i);
});
