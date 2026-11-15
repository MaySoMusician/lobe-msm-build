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

    expect(content).toContain('You are a helpful assistant');
    expect(content).not.toContain('Current date:');
    expect(content).not.toContain('Current model:');
    expect(content).not.toContain('Model knowledge cutoff:');
    expect(content).not.toContain('Preferred reply language:');
    expect(result.metadata?.systemDateInjected).toBeUndefined();
    expect(result.metadata?.modelInfoInjected).toBeUndefined();
  });

  it('does not inject the agent identity / inbox block, even in agent mode with an account', async () => {
    const result = await new MessagesEngine(
      createParams({
        agentAccountContext: {
          accounts: [
            {
              capabilities: { receive: true, send: true },
              displayName: 'Toby mailbox',
              identifier: 'toby-agent@lobe.id',
              kind: 'mail',
              provider: 'agent-mail',
              status: 'active',
            },
          ],
          inbox: { unreadCount: 3 },
          toolAvailable: true,
        } as any,
        enableAgentMode: true,
      }),
    ).process();
    const content = String(result.messages.find((m) => m.role === 'system')?.content ?? '');

    expect(content).toContain('You are a helpful assistant');
    expect(content).not.toContain('<agent_identity>');
    expect(content).not.toContain('toby-agent@lobe.id');
    expect(content).not.toContain('<inbox');
  });

  it('does not render an eval session date into the system prompt', async () => {
    const result = await new MessagesEngine(
      createParams({ evalContext: { sessionDate: '2024-02-29T12:00:00.000Z' } as any }),
    ).process();
    const content = String(result.messages.find((m) => m.role === 'system')?.content ?? '');

    expect(content).not.toContain('2024');
    expect(content).not.toContain('Current date:');
  });
});
