import { expect, type Page, test } from '@playwright/test';
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

const modelChip = (page: Page) =>
  page
    .locator('[data-testid="chat-input"] [aria-label]')
    .filter({ has: page.locator('svg.lucide-chevron-down') });

const waitForConfigSave = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.ok() &&
      /updateAgentConfig|updateTopicModel/.test(response.url()),
  );

const selectModel = async (page: Page, name: string) => {
  const chip = modelChip(page).first();
  await expect(chip).toBeVisible({ timeout: 30_000 });
  if ((await chip.locator('span').first().textContent())?.trim() === name) {
    return;
  }

  await chip.click();
  await page.getByRole('menuitem', { name: /^Model\b/ }).click();
  const search = page.getByPlaceholder('Search models...');
  await expect(search).toBeVisible();
  await search.fill(name);

  const option = page
    .getByRole('menu', { name: /^Model\b/ })
    .getByRole('menuitem')
    .filter({ has: page.getByText(name, { exact: true }) });
  await expect(option).toBeVisible();
  const saved = waitForConfigSave(page);
  await option.click();
  await saved;
  await expect(chip.locator('span').first()).toHaveText(name);
};

test('shows the USD cost instead of credits', async ({ page }) => {
  await enableUsageFooter();

  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);
  // The assembled catalog does not list GPT-4o mini. GPT-5.6 Sol is enabled,
  // and this turn is under its 272k tier: $4 / 1M input and $20 / 1M output.
  await selectModel(page, 'GPT-5.6 Sol');

  await sendMessage(page, 'MSM usage cost');
  await waitForAssistantText(page, 'MSM deterministic assistant response');

  const message = messageWrapperWithText(page, 'MSM deterministic assistant response');
  const usageTrigger = message.locator('svg.lucide-coins').locator('xpath=ancestor::div[1]');
  await usageTrigger.click();

  await expect(page.getByRole('tab', { name: 'Credits' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'USD' }).click();

  const costTrigger = message.locator('svg.lucide-badge-cent').locator('xpath=ancestor::div[1]');
  await expect(costTrigger).toContainText('$2.025');
  const row = (label: string) => page.getByText(label, { exact: true }).locator('xpath=../..');
  await expect(row('Uncached Input')).toContainText('$0.04938');
  await expect(row('Output')).toContainText('$1.975');
});
