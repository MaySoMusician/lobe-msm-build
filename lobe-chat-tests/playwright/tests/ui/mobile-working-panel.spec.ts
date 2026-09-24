import { expect, test } from '@playwright/test';

import { gotoInbox, visibleButtonByIcon } from '../../support/ui.js';

test('opens and dismisses the working panel from mobile chat chrome', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only regression');

  await gotoInbox(page);

  const closePanel = page.getByRole('button', { name: /^Close panel$/i });
  if (await closePanel.isVisible().catch(() => false)) {
    await closePanel.click({ force: true });
  }
  const toggle = await visibleButtonByIcon(page.locator('body'), ['lucide-panel-right-open']);
  if (!toggle) throw new Error('Could not find mobile working-panel toggle');
  await toggle.click();
  await expect(toggle).toBeHidden();
  await expect(closePanel).toBeVisible();

  // The patch adds a full-height overlay to the mobile content area. Click well
  // away from the right-hand sidebar and assert that its public toggle returns.
  await page.mouse.click(8, 160);
  await expect
    .poll(async () =>
      Boolean(await visibleButtonByIcon(page.locator('body'), ['lucide-panel-right-open'])),
    )
    .toBe(true);
});
