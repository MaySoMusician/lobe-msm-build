import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lambdaClient } from '@/libs/trpc/client';

import { messageService } from './index';

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    message: {
      update: {
        mutate: vi.fn(),
      },
    },
  },
}));

describe('msm updateMessageError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lambdaClient.message.update.mutate).mockResolvedValue(undefined as any);
  });

  it('preserves error.type when spreading a plain Error-like object', async () => {
    await messageService.updateMessageError(
      'message-1',
      { message: 'boom', type: 'InvalidProviderAPIKey' } as any,
      { agentId: 'agent-1', topicId: 'topic-1' },
    );

    expect(lambdaClient.message.update.mutate).toHaveBeenCalledWith({
      agentId: 'agent-1',
      id: 'message-1',
      topicId: 'topic-1',
      value: {
        error: expect.objectContaining({
          message: 'boom',
          type: 'InvalidProviderAPIKey',
        }),
      },
    });
  });
});
