import { expect, type Locator, type Page, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import { updateGeneralSettings } from '../../support/db.js';
import {
  findChatInput,
  gotoInbox,
  messageWrapperWithText,
  openMessageActions,
  visibleButtonByIcon,
  waitForAssistantText,
  waitForTrpcSave,
} from '../../support/ui.js';

const ASSISTANT_TEXT = 'MSM deterministic assistant response';
// A tool chip: a skill chip for a skill that isn't installed would first try to
// install it from the Market, which the offline test image can't reach.
const TOOL_TAG = '<tool name="msm-tool" label="MSM Tool" />';

/** The text as it appears inside a JSON-encoded request body. */
const asJson = (value: string) => JSON.stringify(value).slice(1, -1);

const lastRequestBody = (chat: BrowserChatMock) => JSON.stringify(chat.requests.at(-1)?.body ?? {});

const send = async (page: Page, chat: BrowserChatMock) => {
  const before = chat.requests.length;
  await page.keyboard.press('Enter');
  await expect.poll(() => chat.requests.length, { timeout: 20_000 }).toBeGreaterThan(before);
  await waitForAssistantText(page, ASSISTANT_TEXT);
};

test('the chat input offers no formatting toolbar', async ({ page }) => {
  await gotoInbox(page);
  const chatInput = page.locator('[data-testid="chat-input"]');

  await expect(chatInput.locator('svg.lucide-type')).toHaveCount(0);

  const plus = await visibleButtonByIcon(chatInput, ['lucide-plus']);
  if (plus) {
    await plus.click();
    await expect(page.getByRole('menu').first()).toBeVisible();
    await expect(page.getByText('Formatting Tool', { exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});

test('typed Markdown and formatting hotkeys stay plain text and send verbatim', async ({
  page,
}) => {
  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  const input = await findChatInput(page);
  await input.click();
  await page.keyboard.type('**MSM bold** stays');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('- MSM item');

  // Ctrl+B on a selection must not format it.
  await page.keyboard.press('Shift+Home');
  await page.keyboard.press('Control+b');
  await page.keyboard.press('End');

  await expect(input.locator('strong, b, ul, ol, li, h1, h2, h3, code')).toHaveCount(0);
  await expect(input).toContainText('**MSM bold** stays');
  await expect(input).toContainText('- MSM item');

  await send(page, chat);
  expect(lastRequestBody(chat)).toContain(asJson('**MSM bold** stays\n- MSM item'));
});

test('chips still work in the plain input and come back in the edit dialog', async ({ page }) => {
  const chat = new BrowserChatMock();
  await chat.install(page);
  await gotoInbox(page);

  const input = await findChatInput(page);
  await input.click();
  await page.keyboard.type('MSM chip check ');
  await page.keyboard.insertText(TOOL_TAG);

  // The raw tag becomes a tool chip as it lands in the editor.
  const chip = input.locator('[contenteditable="false"]').filter({ hasText: 'MSM Tool' });
  await expect(chip).toBeVisible();
  await expect(input).not.toContainText('<tool');

  await send(page, chat);
  expect(lastRequestBody(chat)).toContain(asJson(TOOL_TAG));

  const userMessage = messageWrapperWithText(page, 'MSM chip check');
  await openMessageActions(page, userMessage);
  const edit = page.getByRole('menuitem', { name: /^Edit$/i });
  await expect(edit).toBeVisible();
  await edit.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const editor = dialog.locator('[contenteditable="true"]').last();
  await expect(editor).toContainText('MSM chip check');
  await expect(
    editor.locator('[contenteditable="false"]').filter({ hasText: 'MSM Tool' }),
  ).toBeVisible();
  await expect(dialog.locator('svg.lucide-bold')).toHaveCount(0);
  await page.keyboard.press('Escape');
});

// Markdown a rich editor would turn into a heading, bold text, a list and inline code.
const PASTED_LINES = [
  '# MSM pasted heading',
  '**MSM pasted bold**',
  '- MSM pasted item',
  '`msm pasted code`',
];
const RICH_NODES = 'strong, b, em, ul, ol, li, h1, h2, h3, code, pre, blockquote';

/** Paste plain text the way a clipboard paste reaches the editor. */
const pasteText = (target: Locator, text: string) =>
  target.evaluate((element, value) => {
    const data = new DataTransfer();
    data.setData('text/plain', value);
    element.dispatchEvent(
      new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data }),
    );
  }, text);

const expectVerbatim = async (editor: Locator) => {
  for (const line of PASTED_LINES) {
    await expect(editor).toContainText(line);
  }
  await expect(editor.locator(RICH_NODES)).toHaveCount(0);
};

test.describe('paste conversion stays off whatever the stored setting says', () => {
  // The removed "Format Markdown on Paste" switch saved this; a stored `true`
  // must not turn conversion back on.
  test.beforeEach(async () => {
    await updateGeneralSettings({ enablePasteAutoConvert: true });
  });

  test.afterEach(async () => {
    await updateGeneralSettings({}, ['enablePasteAutoConvert']);
  });

  test('pasted Markdown stays verbatim in the chat input and sends verbatim', async ({ page }) => {
    const chat = new BrowserChatMock();
    await chat.install(page);
    await gotoInbox(page);

    const input = await findChatInput(page);
    await input.click();
    await pasteText(input, PASTED_LINES.join('\n'));
    await expectVerbatim(input);

    await send(page, chat);
    for (const line of PASTED_LINES) {
      expect(lastRequestBody(chat)).toContain(asJson(line));
    }
  });

  test('pasted Markdown stays verbatim in the agent prompt editor', async ({ page }) => {
    test.skip(test.info().project.name === 'mobile', 'The agent profile editor is a desktop page.');
    await page.goto('/agent/inbox/profile', { waitUntil: 'domcontentloaded' });
    await page.getByText('Instruction', { exact: true }).first().click();
    // The prompt editor, not the Agent Builder sidebar's own composer.
    const editor = page
      .locator('[contenteditable="true"]')
      .filter({ visible: true })
      .and(page.locator(':not(aside *):not([data-testid="chat-input"] *)'))
      .first();
    await expect(editor).toBeVisible({ timeout: 30_000 });

    await editor.click();
    await pasteText(editor, PASTED_LINES.join('\n'));
    await expectVerbatim(editor);

    // Leave the shared inbox prompt empty again.
    const saved = waitForTrpcSave(page);
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await saved;
    await expect(editor).not.toContainText('MSM pasted');
  });
});

test('Settings and settings search offer no paste conversion switch', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'Settings search lives in the desktop sidebar.');
  await page.goto('/settings/conversation', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Voice Message', { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Format Markdown on Paste', { exact: true })).toHaveCount(0);

  const search = page.getByPlaceholder('Search settings...').filter({ visible: true }).first();
  await search.fill('paste');
  await expect(page.getByText('Format Markdown on Paste')).toHaveCount(0);

  // The search itself still works.
  await search.fill('voice message');
  await expect(page.getByText('Voice Message').first()).toBeVisible();
});
