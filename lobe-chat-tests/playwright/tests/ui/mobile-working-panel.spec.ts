import { expect, test } from '@playwright/test';

import { gotoInbox, visibleButtonByIcon } from '../../support/ui.js';

test('opens and dismisses the working panel from mobile chat chrome', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile-only regression');

  await gotoInbox(page);

  const body = page.locator('body');
  const initialClose = await visibleButtonByIcon(body, ['lucide-panel-right-close']);
  if (initialClose) {
    await initialClose.click({ force: true });
  }
  const toggle = await visibleButtonByIcon(body, ['lucide-panel-right-open']);
  if (!toggle) throw new Error('Could not find mobile working-panel toggle');
  await toggle.click();
  await expect(toggle).toBeHidden();
  const closePanel = await visibleButtonByIcon(body, ['lucide-panel-right-close']);
  if (!closePanel) throw new Error('Could not find mobile working-panel close action');
  await expect(closePanel).toBeVisible();

  // The patch adds a full-height overlay to the mobile content area. Click well
  // away from the right-hand sidebar and assert that its public toggle returns.
  await page.mouse.click(8, 160);
  await expect
    .poll(async () =>
      Boolean(await visibleButtonByIcon(body, ['lucide-panel-right-open'])),
    )
    .toBe(true);
});
