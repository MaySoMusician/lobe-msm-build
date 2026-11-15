import { expect, type Page, test } from '@playwright/test';

import {
  type ChatMode,
  findChatInput,
  gotoInbox,
  mobileModePill,
  selectMobileMode,
} from '../../support/ui.js';

// MSM patch: upstream moved the Agent/Chat switch into the desktop-only Advanced Parameters
// sidebar, so the patch keeps the mode pill in the composer control bar on mobile.
//
// NOTE: This is not a true MSM requirement. The pill exists only so the mode stays
// switchable on mobile (chat-mode-skill-tokens.spec.ts needs that). If upstream restores a
// mobile switch or offers any other way to change the mode on mobile, go back to the
// upstream implementation: drop the "keep the agent mode switch on mobile" patch commit and
// this spec, and point the mobile helpers in support/ui.ts at the upstream control.

const modelChip = (page: Page) =>
  page
    .locator('[data-testid="chat-input"] [aria-label]')
    .filter({ has: page.locator('svg.lucide-chevron-down') })
    .first();

test('adds the Agent/Chat pill to the mobile composer only', async ({ page }) => {
  await gotoInbox(page);
  await findChatInput(page);

  if (test.info().project.name === 'mobile') {
    await expect(mobileModePill(page)).toBeVisible({ timeout: 30_000 });
    await expect(mobileModePill(page)).toHaveText(/^(Agent|Chat)$/);
    return;
  }

  // Desktop keeps upstream's sidebar switch; wait for the agent config to load (the model
  // chip and the control bar resolve together) before checking that no pill was added.
  await expect(modelChip(page)).toBeVisible({ timeout: 30_000 });
  await expect(mobileModePill(page)).toHaveCount(0);
});

test.describe('mobile Agent/Chat pill', () => {
  let original: ChatMode | undefined;

  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'mobile',
      'The pill is mobile-only; desktop switches mode in Advanced Parameters.',
    );
  });

  test.afterEach(async ({ page }) => {
    // The inbox is shared with other specs; put its mode back.
    if (original) {
      await gotoInbox(page);
      await selectMobileMode(page, original);
    }
    original = undefined;
  });

  test('switches the mode both ways and keeps it across a reload', async ({ page }) => {
    await gotoInbox(page);
    await findChatInput(page);
    const pill = mobileModePill(page);
    await expect(pill).toBeVisible({ timeout: 30_000 });
    original = (await pill.textContent())?.trim() as ChatMode;
    const other: ChatMode = original === 'Agent' ? 'Chat' : 'Agent';

    for (const mode of [other, original]) {
      await selectMobileMode(page, mode);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await findChatInput(page);
      await expect(mobileModePill(page)).toHaveText(mode, { timeout: 30_000 });
    }
  });
});
