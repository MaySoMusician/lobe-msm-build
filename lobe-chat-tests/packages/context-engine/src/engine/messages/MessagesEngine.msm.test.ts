import { describe, expect, it } from 'vitest';

import type { UIChatMessage } from '@/types/index';

import { MessagesEngine } from './MessagesEngine';
import type { MessagesEngineParams } from './types';

describe('msm MessagesEngine additives', () => {
  const messages: UIChatMessage[] = [
    {
      content: 'Hello',
      createdAt: Date.now(),
      id: 'msg-1',
      role: 'user',
      updatedAt: Date.now(),
    } as UIChatMessage,
  ];

  const createParams = (overrides?: Partial<MessagesEngineParams>): MessagesEngineParams => ({
    enableSystemDate: true,
    messages,
    model: 'gpt-4',
    modelDisplayName: 'Fable 5',
    modelKnowledgeCutoff: '2026-01',
    provider: 'openai',
    systemRole: 'You are a helpful assistant',
    timezone: 'UTC',
    ...overrides,
  });

  it('does not inject system date or model info additives into the system prompt', async () => {
    const result = await new MessagesEngine(createParams()).process();
    const system = result.messages.find((m) => m.role === 'system');
    const content = String(system?.content ?? '');

    expect(content).toBe('You are a helpful assistant');
    expect(content).not.toContain('Current date:');
    expect(content).not.toContain('Current model:');
    expect(content).not.toContain('Model knowledge cutoff:');
    expect(content).not.toContain('Preferred reply language:');
    expect(result.metadata?.systemDateInjected).toBeUndefined();
    expect(result.metadata?.modelInfoInjected).toBeUndefined();
  });
});
