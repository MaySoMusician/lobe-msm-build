import { describe, expect, it } from 'vitest';

import type { AgentConfigSnapshot } from './resolveAgentConfig';
import { resolveAgentConfig } from './resolveAgentConfig';

const snapshot = (overrides: Partial<AgentConfigSnapshot> = {}): AgentConfigSnapshot => ({
  agentConfig: {
    model: 'gpt-5',
    provider: 'openai',
    systemRole: 'You are a helpful assistant',
  } as never,
  canManage: true,
  chatConfig: {} as never,
  ...overrides,
});

describe('msm resolveAgentConfig locale additives', () => {
  it('does not append Preferred reply language to a regular agent systemRole', () => {
    const result = resolveAgentConfig(
      { agentId: 'test-agent' },
      snapshot({ userLocale: 'zh-CN' }),
    );

    expect(result.agentConfig.systemRole).toBe('You are a helpful assistant');
    expect(result.agentConfig.systemRole).not.toContain('Preferred reply language:');
  });
});
