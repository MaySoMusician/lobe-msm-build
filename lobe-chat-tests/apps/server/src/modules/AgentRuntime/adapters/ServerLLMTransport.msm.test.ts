import { ModelEmptyError } from '@lobechat/model-runtime';
import { describe, expect, it } from 'vitest';

import { ServerLLMTransport } from './ServerLLMTransport';

describe('msm ServerLLMTransport retries', () => {
  it('disables retries (maxAttempts=1, retry budget=0)', () => {
    const transport = new ServerLLMTransport({
      operationId: 'op-1',
      stepIndex: 0,
      stream: true,
      userId: 'user-1',
    } as any);

    expect(transport.retryPolicy.maxAttempts('openai')).toBe(1);
    expect(transport.retryPolicy.resolveRetryBudget('openai', new Error('x'))).toBe(0);
  });

  it('does not retry an empty completion caused by a network error', () => {
    const transport = new ServerLLMTransport({
      operationId: 'op-1',
      stepIndex: 0,
      stream: false,
      userId: 'user-1',
    } as any);
    const error = new ModelEmptyError('empty', {
      contentLength: 0,
      finishReason: 'network_error',
      imageCount: 0,
      reasoningLength: 0,
      toolCallCount: 0,
    });

    expect(transport.retryPolicy.maxAttempts('openai')).toBe(1);
    expect(transport.retryPolicy.resolveRetryBudget('openai', error)).toBe(0);
    expect(transport.retryPolicy.classifyError(error).kind).not.toBe('retry');
  });
});
