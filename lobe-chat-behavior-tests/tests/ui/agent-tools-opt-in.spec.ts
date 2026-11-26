import { expect, type Page, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import { readInboxPlugins, writeInboxPlugins } from '../../support/db.js';
import { gotoInbox, sendMessage, waitForAssistantText } from '../../support/ui.js';

// MSM: Agent mode is opt-in like Chat and Custom. No builtin is always on (no activator,
// no Skills), an untouched tool never loads, and a tool the agent turned on is sent
// directly every turn.

const ASSISTANT_TEXT = 'MSM tools opt-in reply';

const toolNames = (body: Record<string, unknown>) =>
  ((body.tools ?? []) as { function?: { name?: string }; name?: string }[]).map(
    (tool) => tool.function?.name ?? tool.name ?? '',
  );

const offersTool = (names: string[], identifier: string) =>
  names.some((name) => name === identifier || name.startsWith(`${identifier}____`));

/** Open the inbox with the agent config freshly read from the server. */
const openInbox = async (page: Page) => {
  await gotoInbox(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await gotoInbox(page);
};

const sendAndCapture = async (page: Page, text: string) => {
  const chat = new BrowserChatMock(ASSISTANT_TEXT);
  await chat.install(page);
  await openInbox(page);
  await sendMessage(page, text);
  await waitForAssistantText(page, ASSISTANT_TEXT);
  expect(chat.requests.length).toBeGreaterThan(0);
  return toolNames(chat.requests.at(-1)!.body);
};

let originalPlugins: unknown[] | null = null;

test.beforeEach(async ({ page }) => {
  // The inbox agent row exists once the inbox has been opened.
  await gotoInbox(page);
  originalPlugins = await readInboxPlugins();
});

test.afterEach(async () => {
  await writeInboxPlugins(originalPlugins);
});

test('Agent mode offers no tool the agent did not turn on', async ({ page }) => {
  await writeInboxPlugins([]);

  const names = await sendAndCapture(page, 'MSM tools opt-in untouched');

  expect(offersTool(names, 'lobe-activator')).toBe(false);
  expect(offersTool(names, 'lobe-skills')).toBe(false);
  expect(offersTool(names, 'lobe-calculator')).toBe(false);
});

test('a builtin the agent turned on is offered directly, without an activator', async ({
  page,
}) => {
  // What the Tools picker writes when a builtin is switched on.
  await writeInboxPlugins([{ builtinOverride: true, identifier: 'lobe-calculator', mode: 'auto' }]);

  const names = await sendAndCapture(page, 'MSM tools opt-in calculator');

  expect(offersTool(names, 'lobe-calculator')).toBe(true);
  expect(offersTool(names, 'lobe-activator')).toBe(false);
  expect(offersTool(names, 'lobe-skills')).toBe(false);
});
