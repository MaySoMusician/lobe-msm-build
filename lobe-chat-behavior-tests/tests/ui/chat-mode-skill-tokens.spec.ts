import { expect, test } from '@playwright/test';

import { BrowserChatMock } from '../../support/chatMock.js';
import { readInboxChatConfig, writeInboxChatConfig } from '../../support/db.js';
import { findChatInput, gotoInbox, sendMessage, waitForAssistantText } from '../../support/ui.js';

// Chat mode with web search and memory off must send no tool at all, and no tool
// prompt in the context. Upstream removed the Skills "Activate Mode" menu and the
// Advanced tools switch this test used to drive, so the agent's chat config is set
// directly: Chat mode, search off, memory off.

test.describe('Chat mode without skills', () => {
  let originalChatConfig: Record<string, unknown> | null = null;

  test.beforeEach(async ({ page }) => {
    // The inbox agent row exists once the inbox has been opened.
    await gotoInbox(page);
    originalChatConfig = await readInboxChatConfig();
  });

  test.afterEach(async () => {
    await writeInboxChatConfig(originalChatConfig);
  });

  test('loads no tool prompt into the context or the request', async ({ page }) => {
    const memory = (originalChatConfig?.memory ?? {}) as Record<string, unknown>;
    await writeInboxChatConfig({
      ...originalChatConfig,
      enableAgentMode: false,
      memory: { ...memory, enabled: false },
      searchMode: 'off',
    });

    const chat = new BrowserChatMock('MSM chat mode reply');
    await chat.install(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await findChatInput(page);

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
