import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as agentStore from '@/store/agent';
import * as agentSelectors from '@/store/agent/selectors';
import { useUserStore } from '@/store/user';
import * as userSelectors from '@/store/user/selectors';

import { resolveAgentConfig } from './agentConfigResolver';

vi.hoisted(() => {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => storage.clear(),
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
});

describe('msm resolveAgentConfig locale additives', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(agentStore, 'getAgentStoreState').mockReturnValue({} as any);
    vi.spyOn(agentSelectors.agentSelectors, 'getAgentConfigById').mockReturnValue(
      () =>
        ({
          model: 'gpt-4',
          plugins: [],
          systemRole: 'You are a helpful assistant',
        }) as any,
    );
    vi.spyOn(agentSelectors.agentByIdSelectors, 'getAgentById').mockReturnValue(
      () => undefined as any,
    );
    vi.spyOn(agentSelectors.chatConfigByIdSelectors, 'getChatConfigById').mockReturnValue(
      () => ({}) as any,
    );
    vi.spyOn(agentSelectors.agentSelectors, 'getAgentSlugById').mockReturnValue(() => undefined);
    useUserStore.setState({ user: undefined, workspaceUserPreference: {} });
  });

  it('does not append Preferred reply language to systemRole', () => {
    vi.spyOn(userSelectors.userGeneralSettingsSelectors, 'currentResponseLanguage').mockReturnValue(
      'zh-CN',
    );

    const result = resolveAgentConfig({ agentId: 'test-agent' });

    expect(result.agentConfig.systemRole).toBe('You are a helpful assistant');
    expect(result.agentConfig.systemRole).not.toContain('Preferred reply language:');
  });
});
