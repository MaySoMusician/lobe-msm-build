import { expect, type Page, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import {
  type ChatMode as Mode,
  findChatInput,
  gotoInbox,
  mobileModePill,
  selectMobileMode,
  sendMessage,
  visibleButtonByIcon,
  waitForAssistantText,
  waitForTrpcSave as waitForSave,
} from '../../support/ui.js';

// Every precondition is set through the UI, the way a user would.

type Capability = 'Memory' | 'Web Browsing';
type Activation = 'Auto' | 'Disable';

const advancedToolsSwitch = (page: Page) =>
  page.getByRole('switch', { name: /^Advanced tools\b/ }).filter({ visible: true });

/** Settings → Advanced → "Advanced tools" (Developer Mode); returns the previous state. */
const setAdvancedTools = async (page: Page, enabled: boolean) => {
  await page.goto('/settings/advanced', { waitUntil: 'domcontentloaded' });
  const toggle = advancedToolsSwitch(page);
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  const previous = (await toggle.getAttribute('aria-checked')) === 'true';
  if (previous !== enabled) {
    const saved = waitForSave(page);
    await toggle.click();
    await saved;
  }
  await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
  return previous;
};

// Desktop: the Agent/Chat switch is the "Mode" row of the Advanced Parameters sidebar.
// Mobile has no sidebar; the MSM patch keeps the mode pill in the composer control bar
// (tested on its own in mobile-mode-switch.spec.ts).
const isMobileProject = () => test.info().project.name === 'mobile';

/** Desktop: one option of the Agent/Chat switch in Advanced Parameters. */
const modeSegment = (page: Page, mode: Mode) =>
  page
    .locator('[data-segmented-item]')
    .and(page.getByRole('button', { exact: true, name: mode }))
    .filter({ visible: true });

const clickParamsMenuItem = async (page: Page) => {
  const plus = await visibleButtonByIcon(page.locator('body'), ['lucide-plus']);
  if (!plus) {
    throw new Error('Could not find the composer "+" menu');
  }
  await plus.click();
  const params = page.getByRole('menuitem', { name: /^Advanced Parameters\b/ }).first();
  await expect(params).toBeVisible();
  await params.click();
};

/** Desktop: composer "+" → Advanced Parameters opens the panel with the Agent/Chat switch. */
const openModeSwitch = async (page: Page) => {
  await findChatInput(page);
  const anySegment = modeSegment(page, 'Agent').or(modeSegment(page, 'Chat')).first();
  // The sidebar state persists across reloads; let a restored panel render before
  // using the menu item, which toggles the panel closed when it is already open.
  if (
    await anySegment.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    )
  ) {
    return;
  }

  await clickParamsMenuItem(page);
  if (
    !(await anySegment.waitFor({ timeout: 5000 }).then(
      () => true,
      () => false,
    ))
  ) {
    // The click closed a panel that was open but not yet rendered; open it again.
    await clickParamsMenuItem(page);
  }
  await expect(anySegment).toBeVisible({ timeout: 30_000 });
};

const expectMode = async (page: Page, mode: Mode) => {
  if (isMobileProject()) {
    await findChatInput(page);
    await expect(mobileModePill(page)).toHaveText(mode, { timeout: 30_000 });
    return;
  }

  await openModeSwitch(page);
  await expect(modeSegment(page, mode)).toHaveAttribute('aria-pressed', 'true');
};

const setMode = async (page: Page, mode: Mode) => {
  if (isMobileProject()) {
    await findChatInput(page);
    await selectMobileMode(page, mode);
    return;
  }

  await openModeSwitch(page);
  const segment = modeSegment(page, mode);
  if ((await segment.getAttribute('aria-pressed')) !== 'true') {
    const saved = waitForSave(page);
    await segment.click();
    await saved;
  }
  await expect(segment).toHaveAttribute('aria-pressed', 'true');
};

const openSkillsMenu = async (page: Page) => {
  const plus = await visibleButtonByIcon(page.locator('body'), ['lucide-plus']);
  if (!plus) {
    throw new Error('Could not find the composer "+" menu');
  }
  await plus.click();
  const skills = page.getByRole('menuitem', { name: /^Skills\b/ }).first();
  await expect(skills).toBeVisible();
  await skills.hover();
  await skills.click();
  await expect(page.getByRole('menu', { name: /^Skills\b/ })).toBeVisible();
};

const closeMenus = async (page: Page) => {
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('menu')).toHaveCount(0);
};

/** Skills menu → capability row → Activate Mode → Auto / Disable (Agent mode only). */
const setCapability = async (page: Page, capability: Capability, activation: Activation) => {
  await openSkillsMenu(page);
  const row = page.getByRole('menuitem', { name: new RegExp(`${capability} Activate Mode$`) });
  await expect(row).toHaveCount(1);
  await row.hover();
  await row.getByRole('button', { name: 'Activate Mode' }).click();
  const option = page.getByRole('dialog').getByRole('button', { name: activation, exact: true });
  await expect(option).toBeVisible();
  const saved = waitForSave(page);
  await option.click();
  await saved;
  await closeMenus(page);
};

const openContextDetails = async (page: Page) => {
  // The token tag sits in the control bar below the composer.
  const tag = page.locator('[class*="chat-token-tag"]').filter({ visible: true }).first();
  await expect(tag).toBeVisible({ timeout: 30_000 });

  const title = page.getByText('Context Details', { exact: true });
  await tag.hover();
  if (!(await title.isVisible().catch(() => false))) {
    await tag.click();
  }
  await expect(title).toBeVisible();
};

/** The value cell beside a Context Details row title. */
const contextDetailsValue = (page: Page, rowTitle: string) =>
  page.evaluate((title) => {
    const label = [...document.querySelectorAll('div')].find(
      (element) => element.childElementCount === 0 && element.textContent?.trim() === title,
    );
    const row = label?.parentElement?.parentElement;
    return row?.lastElementChild?.textContent?.trim() ?? null;
  }, rowTitle);

test.describe('Chat mode without skills', () => {
  let advancedToolsBefore: boolean | undefined;

  test.afterEach(async ({ page }) => {
    // Put the shared inbox back the same way: skills on, Agent mode, Developer Mode as found.
    await gotoInbox(page);
    await setMode(page, 'Agent');
    await setCapability(page, 'Memory', 'Auto');
    await setCapability(page, 'Web Browsing', 'Auto');
    if (advancedToolsBefore !== undefined) {
      await setAdvancedTools(page, advancedToolsBefore);
    }
    advancedToolsBefore = undefined;
  });

  test('loads no tool prompt into the context or the request', async ({ page }) => {
    test.setTimeout(120_000);

    // Context Details only breaks the total down per source in Developer Mode.
    advancedToolsBefore = await setAdvancedTools(page, true);

    // Search and memory are skills; their switches live in the Agent-mode Skills menu.
    await gotoInbox(page);
    await setMode(page, 'Agent');
    await setCapability(page, 'Memory', 'Disable');
    await setCapability(page, 'Web Browsing', 'Disable');
    await setMode(page, 'Chat');

    // The settings must survive a reload, as they would when the app is reopened.
    const chat = new BrowserChatMock('MSM chat mode reply');
    await chat.install(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await findChatInput(page);
    await expectMode(page, 'Chat');

    await openContextDetails(page);
    await expect(page.getByText('Skill Settings', { exact: true })).toBeVisible();
    // Token counting is asynchronous; wait for the breakdown to settle.
    await expect.poll(() => contextDetailsValue(page, 'Skill Settings')).toBe('0');
    await page.keyboard.press('Escape');

    await sendMessage(page, 'MSM chat mode token check');
    await waitForAssistantText(page, 'MSM chat mode reply');

    expect(chat.requests.length).toBeGreaterThan(0);
    const { body } = chat.requests.at(-1)!;
    const tools = body.tools as unknown[] | undefined;
    expect(tools ?? []).toHaveLength(0);

    const messages = (body.messages ?? []) as { content?: unknown }[];
    const text = messages
      .map(({ content }) => (typeof content === 'string' ? content : JSON.stringify(content ?? '')))
      .join('\n');
    expect(text).toContain('MSM chat mode token check');
    expect(text).not.toContain('<tools description=');
    expect(text).not.toContain('<available_tools');
  });
});
