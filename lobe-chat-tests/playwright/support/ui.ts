import { expect, type Locator, type Page } from '@playwright/test';

export const gotoInbox = async (page: Page) => {
  await page.goto('/agent/inbox', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();

  if (!(await findChatInput(page, 5000).catch(() => null))) {
    const newTopicLinks = page.getByText('Start New Topic', { exact: true });
    let clicked = false;
    for (let index = 0; index < (await newTopicLinks.count()); index += 1) {
      const link = newTopicLinks.nth(index);
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        clicked = true;
        break;
      }
    }
    if (!clicked) {
      throw new Error(`Could not navigate from Agent Profile to chat at ${page.url()}`);
    }
  }

  await findChatInput(page);
};

export const findChatInput = async (page: Page, timeout = 30_000): Promise<Locator> => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const candidates = [
      page.locator('[data-testid="chat-input"] textarea'),
      page.locator('[data-testid="chat-input"] [contenteditable="true"]'),
      page.locator('textarea[placeholder*="Ask"], textarea[placeholder*="Press"]'),
    ];

    for (const candidate of candidates) {
      const count = await candidate.count();
      for (let index = 0; index < count; index += 1) {
        const item = candidate.nth(index);
        if (await item.isVisible().catch(() => false)) {
          return item;
        }
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
    const buttons = scope.locator(
      `button:has(svg.${iconName}), [role="button"]:has(svg.${iconName})`,
    );
    for (let index = 0; index < (await buttons.count()); index += 1) {
      const button = buttons.nth(index);
      if (await button.isVisible().catch(() => false)) {
        return button;
      }
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

  if (!button) {
    throw new Error('Could not find the message action menu');
  }
  await button.click();
  await expect(page.locator('[role="menuitem"]').first()).toBeVisible();
};

export type ChatMode = 'Agent' | 'Chat';

/** Resolves on the next successful tRPC POST (settings and agent-config saves). */
export const waitForTrpcSave = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.ok() && response.url().includes('/trpc/'),
  );

/**
 * The MSM mobile Agent/Chat pill in the composer control bar: its own text is the current
 * mode, next to the mode icon and a chevron. Upstream only offers the switch in the desktop
 * Advanced Parameters sidebar, whose options carry no icons, so this never matches there.
 */
export const mobileModePill = (page: Page) =>
  page
    .locator('div')
    .filter({ has: page.locator('svg.lucide-chevron-down') })
    .filter({ has: page.locator('svg.lucide-infinity, svg.lucide-message-circle') })
    .filter({ hasText: /^(Agent|Chat)$/ })
    .filter({ visible: true })
    .last();

/** Mobile: open the mode pill and pick a mode; waits for the agent config to save. */
export const selectMobileMode = async (page: Page, mode: ChatMode) => {
  const pill = mobileModePill(page);
  await expect(pill).toBeVisible({ timeout: 30_000 });
  if ((await pill.textContent())?.trim() === mode) {
    return;
  }

  await pill.click();
  const saved = waitForTrpcSave(page);
  // The popover renders after the bar, so its option title is the last exact match.
  await page.getByText(mode, { exact: true }).filter({ visible: true }).last().click();
  await saved;
  await expect(mobileModePill(page)).toHaveText(mode);
};
