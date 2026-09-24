import { expect, type Locator, type Page } from '@playwright/test';

export const gotoInbox = async (page: Page) => {
  await page.goto('/agent/inbox', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  await findChatInput(page);
};

export const findChatInput = async (page: Page): Promise<Locator> => {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const candidates = [
      page.locator('[data-testid="chat-input"] textarea'),
      page.locator('[data-testid="chat-input"] [contenteditable="true"]'),
      page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Press"]'),
      page.getByRole('textbox'),
    ];

    for (const candidate of candidates) {
      const count = await candidate.count();
      for (let index = 0; index < count; index += 1) {
        const item = candidate.nth(index);
        if (await item.isVisible().catch(() => false)) return item;
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Could not find a visible chat input at ${page.url()}`);
};

export const sendMessage = async (page: Page, content: string) => {
  const input = await findChatInput(page);
  await input.click();
  await page.keyboard.type(content);
  await page.keyboard.press('Enter');
  await expect(page.getByText(content, { exact: true }).last()).toBeVisible();
};

export const waitForAssistantText = async (page: Page, content: string) => {
  await expect(page.getByText(content, { exact: false }).last()).toBeVisible({ timeout: 20_000 });
};

export const messageWrapperWithText = (page: Page, content: string) =>
  page.locator('.message-wrapper').filter({ hasText: content }).last();

export const visibleButtonByIcon = async (scope: Locator, iconNames: string[]) => {
  for (const iconName of iconNames) {
    const buttons = scope.locator(`button:has(svg.${iconName}), [role="button"]:has(svg.${iconName})`);
    for (let index = 0; index < (await buttons.count()); index += 1) {
      const button = buttons.nth(index);
      if (await button.isVisible().catch(() => false)) return button;
    }
  }

  return null;
};

export const openMessageActions = async (page: Page, message: Locator) => {
  await message.hover();
  const button = await visibleButtonByIcon(message, [
    'lucide-ellipsis',
    'lucide-more-horizontal',
    'lucide-menu',
  ]);

  if (!button) throw new Error('Could not find the message action menu');
  await button.click();
  await expect(page.locator('[role="menuitem"]').first()).toBeVisible();
};
