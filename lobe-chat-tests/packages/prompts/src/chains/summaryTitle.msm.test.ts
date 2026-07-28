import type { OpenAIChatMessage } from '@lobechat/types';
import { describe, expect, it } from 'vitest';

import { chainSummaryTitle } from './summaryTitle';

describe('msm chainSummaryTitle', () => {
  it('instructs the model to use conversation language with locale fallback', () => {
    const messages: OpenAIChatMessage[] = [
      { content: 'Hello', role: 'user' },
      { content: 'Hi there', role: 'assistant' },
    ];
    const locale = 'ja-JP';

    const result = chainSummaryTitle(messages, locale);
    const system = result.messages?.find((m) => m.role === 'system')?.content;

    expect(system).toContain(
      `Use the language mainly used in the conversation. If ambiguous, use "${locale}".`,
    );
    expect(system).not.toContain('Use the language specified by the locale code');
  });
});
