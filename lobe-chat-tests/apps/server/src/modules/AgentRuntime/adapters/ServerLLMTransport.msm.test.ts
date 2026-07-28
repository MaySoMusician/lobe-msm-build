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
});
