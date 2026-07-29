import { type ToolManifest } from '@lobechat/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAgentToolsEngine } from './index';

vi.mock('@/store/tool', () => ({
  getToolStoreState: () => ({
    builtinTools: [
      {
        identifier: 'lobe-image-generation',
        manifest: {
          api: [
            {
              description: 'Generate image',
              name: 'generateImage',
              parameters: {
                properties: { prompt: { type: 'string' } },
                required: ['prompt'],
                type: 'object',
              },
            },
          ],
          identifier: 'lobe-image-generation',
          meta: { avatar: 'I', title: 'Image Generation' },
          type: 'builtin',
        } as unknown as ToolManifest,
        type: 'builtin' as const,
      },
      {
        identifier: 'lobe-web-browsing',
        manifest: {
          api: [
            {
              description: 'Search',
              name: 'search',
              parameters: {
                properties: { query: { type: 'string' } },
                required: ['query'],
                type: 'object',
              },
            },
          ],
          identifier: 'lobe-web-browsing',
          meta: { avatar: '🌐', title: 'Web Browsing' },
          type: 'builtin',
        } as unknown as ToolManifest,
        type: 'builtin' as const,
      },
    ],
    connectors: [],
  }),
}));

vi.mock('@/store/tool/selectors', () => ({
  composioStoreSelectors: { composioAsLobeTools: () => [] },
  lobehubSkillStoreSelectors: { lobehubSkillAsLobeTools: () => [] },
  pluginSelectors: {
    getInstalledPluginById: () => () => undefined,
    installedPluginManifestList: () => [],
  },
}));

vi.mock('@/store/serverConfig', () => ({
  getServerConfigStoreState: () => ({ serverConfig: {} }),
}));

vi.mock('../isCanUseFC', () => ({
  isCanUseFC: () => true,
}));

vi.mock('@/store/agent', () => ({
  getAgentStoreState: () => ({}),
}));

vi.mock('@/store/agent/selectors', () => ({
  agentChatConfigSelectors: {
    currentChatConfig: () => ({ enableAgentMode: false }),
    isCloudSandboxEnabled: () => false,
    isLocalSystemEnabled: () => false,
    isMemoryToolEnabled: () => false,
  },
  agentSelectors: {
    currentAgentDisabledPlugins: () => [],
    currentAgentPlugins: () => [],
    hasEnabledKnowledgeBases: () => false,
  },
}));

vi.mock('@/store/aiInfra', () => ({
  aiModelSelectors: {
    isModelSupportImageOutput: () => () => false,
  },
  getAiInfraStoreState: () => ({}),
}));

vi.mock('@/store/user', () => ({
  useUserStore: { getState: () => ({}) },
}));

vi.mock('@/store/user/selectors', () => ({
  labPreferSelectors: { enableInAppBrowser: () => false },
  settingsSelectors: { memoryEnabled: () => false },
}));

vi.mock('@/helpers/getSearchConfig', () => ({
  getSearchConfig: () => ({ useApplicationBuiltinSearchTool: true }),
}));

describe('msm createAgentToolsEngine chat-mode image generation', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not enable lobe-image-generation when model lacks native image output', () => {
    const toolsEngine = createAgentToolsEngine({
      model: 'claude-sonnet',
      provider: 'anthropic',
    });

    const result = toolsEngine.generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: [],
    });

    expect(result.enabledToolIds).not.toContain('lobe-image-generation');
  });
});
