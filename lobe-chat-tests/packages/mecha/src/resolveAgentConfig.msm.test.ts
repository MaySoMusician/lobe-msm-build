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

describe('msm resolveAgentConfig opt-in tools in Agent mode', () => {
  const agentMode = { enableAgentMode: true } as never;

  it('loads every entry the agent turned on directly, on-demand builtins included', () => {
    const result = resolveAgentConfig(
      { agentId: 'test-agent' },
      snapshot({
        agentConfig: {
          model: 'gpt-5',
          plugins: [
            { builtinOverride: true, identifier: 'lobe-activator', mode: 'auto' },
            { identifier: 'my-connector', mode: 'auto' },
            'legacy-pinned-plugin',
            { identifier: 'lobe-skills', mode: 'disabled' },
          ],
          provider: 'openai',
          systemRole: '',
        } as never,
        chatConfig: agentMode,
      }),
    );

    expect(result.plugins).toEqual(
      expect.arrayContaining(['lobe-activator', 'my-connector', 'legacy-pinned-plugin']),
    );
    expect(result.plugins).not.toContain('lobe-skills');
  });

  it('loads nothing the agent has not turned on', () => {
    const result = resolveAgentConfig(
      { agentId: 'test-agent' },
      snapshot({ chatConfig: agentMode }),
    );

    expect(result.plugins).toEqual([]);
  });
});
