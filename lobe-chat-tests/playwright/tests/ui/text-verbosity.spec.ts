import { expect, type Page, test } from '@playwright/test';

import { gotoInbox } from '../../support/ui.js';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const modelChip = (page: Page) =>
  page
    .locator('[data-testid="chat-input"] [aria-label]')
    .filter({ has: page.locator('svg.lucide-chevron-down') });

const verbosityItem = (page: Page) => page.getByRole('menuitem', { name: /^Text Verbosity\b/ });

const waitForConfigSave = (page: Page) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.ok() &&
      /updateAgentConfig|updateTopicModel/.test(response.url()),
  );

const openModelMenu = async (page: Page) => {
  const chip = modelChip(page).first();
  await expect(chip).toBeVisible({ timeout: 30_000 });
  await chip.click();
  await expect(page.getByRole('menuitem', { name: /^Model\b/ })).toBeVisible();
};

const closeModelMenu = async (page: Page) => {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /^Model\b/ })).toHaveCount(0);
};

const chipModelName = (page: Page) => modelChip(page).first().locator('span').first();

const selectModel = async (page: Page, name: string) => {
  if ((await chipModelName(page).textContent())?.trim() === name) {
    return;
  }

  await openModelMenu(page);
  await page.getByRole('menuitem', { name: /^Model\b/ }).click();
  const search = page.getByPlaceholder('Search models...');
  await expect(search).toBeVisible();
  await search.fill(name);

  // List rows are named "<provider> <display name>". Match the display name at
  // the end, inside the model submenu, so the parent "Model … Flash" row and
  // "… Flash Vision Exp" are not selected.
  const option = page
    .getByRole('menu', { name: /^Model\b/ })
    .getByRole('menuitem', { name: new RegExp(`(?:^|\\s)${escapeRegExp(name)}$`) });
  await expect(option).toBeVisible();
  const saved = waitForConfigSave(page);
  await option.click();
  await saved;
  await expect(chipModelName(page)).toHaveText(name);
};

const chooseVerbosity = async (page: Page, level: 'Low' | 'Medium' | 'High') => {
  // Reasoning Effort uses the same Low / Medium / High labels.
  const levelItem = page
    .getByRole('menu', { name: /^Text Verbosity\b/ })
    .getByRole('menuitem', { name: level, exact: true });
  if (!(await levelItem.isVisible().catch(() => false))) {
    await verbosityItem(page).click();
  }
  await expect(levelItem).toBeVisible();
  const saved = waitForConfigSave(page);
  await levelItem.click();
  await saved;
  await expect(verbosityItem(page)).toContainText(level);
};

test('sets text verbosity from the composer model menu', async ({ page }) => {
  await gotoInbox(page);

  // DeepSeek V4 Flash has reasoning effort and not text verbosity. Select it
  // first so a previous run that left a GPT model selected still hits this case.
  await selectModel(page, 'DeepSeek V4 Flash');
  await openModelMenu(page);
  await expect(page.getByRole('menuitem', { name: /^Model\b/ })).toBeVisible();
  await expect(verbosityItem(page)).toHaveCount(0);
  await closeModelMenu(page);

  await selectModel(page, 'GPT-5.6 Sol');
  await openModelMenu(page);
  await expect(verbosityItem(page)).toBeVisible();

  await chooseVerbosity(page, 'Medium');
  await chooseVerbosity(page, 'High');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await openModelMenu(page);
  await expect(verbosityItem(page)).toContainText('High');

  await chooseVerbosity(page, 'Low');
});
