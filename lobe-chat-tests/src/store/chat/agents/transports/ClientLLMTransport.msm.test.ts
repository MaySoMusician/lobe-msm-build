import { describe, expect, it, vi } from 'vitest';

import type { ChatStore } from '../../store';
import { ClientLLMTransport } from './ClientLLMTransport';

vi.mock('@/services/chat', () => ({
  chatService: { getChatCompletion: vi.fn() },
}));

vi.mock('@/store/file/store', () => ({ getFileStoreState: () => ({}) }));

vi.mock('../StreamingHandler', () => ({
  StreamingHandler: class {
    getContentParts() {
      return [];
    }
    getOutput() {
      return '';
    }
    getReasoningParts() {
      return [];
    }
    getThinkingContent() {
      return '';
    }
    handleChunk() {}
    handleFinish() {
      return {};
    }
    hasContentImages() {
      return false;
    }
    hasReasoningImages() {
      return false;
    }
  },
}));

describe('msm ClientLLMTransport retries', () => {
  it('disables retries (maxAttempts=1, retry budget=0)', () => {
    const store = {
      operations: {
        'op-1': {
          abortController: new AbortController(),
          context: { agentId: 'agent-1', topicId: 'topic-1' },
          status: 'running',
        },
      },
    } as unknown as ChatStore;

    const transport = new ClientLLMTransport({
      get: () => store,
      operationId: 'op-1',
      session: { assistantMessageId: 'msg-1' } as any,
    });

    expect(transport.retryPolicy.maxAttempts('openai')).toBe(1);
    expect(transport.retryPolicy.resolveRetryBudget('openai', new Error('x'))).toBe(0);
  });
});
